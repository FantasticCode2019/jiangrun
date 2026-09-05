# deploy.ps1 - 江润园林网站 Windows 一键部署脚本
# 用法: 双击 deploy.bat，或在 PowerShell 执行：
#   powershell -ExecutionPolicy Bypass -File deploy.ps1 [命令]
param(
    [Parameter(Position = 0)][string]$Command = "up",
    [Parameter(Position = 1, ValueFromRemainingArguments = $true)][string[]]$Rest = @()
)

$ErrorActionPreference = "Stop"

function Info { Write-Host "[INFO]  $args" -ForegroundColor Cyan }
function Ok   { Write-Host "[OK]    $args" -ForegroundColor Green }
function Warn { Write-Host "[WARN]  $args" -ForegroundColor Yellow }
function Err  { Write-Host "[ERROR] $args" -ForegroundColor Red }

$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $DeployDir

# ---------- 环境检查 ----------
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Err "未检测到 Docker，请先安装 Docker Desktop："
    Err "  https://www.docker.com/products/docker-desktop/"
    exit 1
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Err "Docker 未运行，请先启动 Docker Desktop 并等待其就绪（鲸鱼图标变绿）"
    exit 1
}

# ---------- 工具函数 ----------
function Get-RandomHex([int]$byteCount) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $buf = New-Object byte[] $byteCount
    $rng.GetBytes($buf)
    return (($buf | ForEach-Object { $_.ToString("x2") }) -join "")
}

# ---------- 生成 .env ----------
function Init-Env {
    if (Test-Path ".env") {
        Info ".env 已存在，跳过生成（如需重置请删除后重跑）"
        return
    }

    $dbpass    = Get-RandomHex 16
	$adminpass = "Jr9-$(Get-RandomHex 8)"
    $jwt       = Get-RandomHex 32

    $content = @"
# 数据库
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$dbpass
POSTGRES_DB=jiangrun

# 后端
JWT_SECRET=$jwt
ADMIN_INITIAL_PASSWORD=$adminpass
SERVER_MODE=release
CORS_ALLOWED_ORIGINS=https://jiangrun.net,https://www.jiangrun.net

# 域名与 TLS
DOMAIN=jiangrun.net
TLS_CERT_DIR=./certs
HTTP_PORT=80
HTTPS_PORT=443

# 前端反代到后端的地址（容器内部服务名，一般无需修改）
API_URL=http://server:8080
"@

    [System.IO.File]::WriteAllText("$DeployDir\.env", $content, [System.Text.Encoding]::ASCII)
    Ok "首次运行，生成随机密钥与初始密码 -> .env"

    Write-Host ""
    Write-Host "=========================================================="
    Write-Host "  已生成随机凭据，请妥善保存："
    Write-Host "    管理员账号 (account): admin"
    Write-Host "    初始密码   (password): $adminpass"
    Write-Host "  登录后台后请立即在「修改密码」中更改。"
    Write-Host "=========================================================="
    Write-Host ""
}

# ---------- 等待就绪 ----------
function Wait-Ready {
	$hp = (Get-Content "$DeployDir\.env" | Select-String '^HTTPS_PORT=' | ForEach-Object { ($_ -split '=')[1] })
	if (-not $hp) { $hp = "443" }
    Info "等待服务就绪（经 Nginx 检测 $hp 端口）..."
    for ($i = 0; $i -lt 75; $i++) {
        try {
			& curl.exe -ksf --max-time 2 "https://127.0.0.1:$hp/api/v1/settings" *> $null
			if ($LASTEXITCODE -eq 0) {
				Ok "服务已就绪"
				return
			}
        } catch {
        }
		Start-Sleep -Seconds 2
    }
    Warn "服务未在 150 秒内就绪，请执行 deploy.ps1 logs server 查看日志"
}

# ---------- 安全自检 ----------
function Check-Env {
    if (-not (Test-Path ".env")) {
        Err ".env 不存在，请先执行 deploy.ps1 init 生成"
        exit 1
    }
    $content = Get-Content ".env" -Raw
    $ok = $true
	$jwtLine = ($content -split "`n" | Where-Object { $_ -match '^JWT_SECRET=' } | Select-Object -First 1)
	$jwtValue = if ($jwtLine) { ($jwtLine -split '=', 2)[1].Trim() } else { "" }
    if ($jwtValue.Length -lt 32 -or $jwtValue -eq 'jiangrun-secret-key-change-in-production') {
        Err "JWT_SECRET 未设置或仍为默认值，请运行 deploy.ps1 init 重新生成"
        $ok = $false
    }
	$dbLine = ($content -split "`n" | Where-Object { $_ -match '^POSTGRES_PASSWORD=' } | Select-Object -First 1)
	$dbValue = if ($dbLine) { ($dbLine -split '=', 2)[1].Trim() } else { "" }
    if (-not $dbValue -or $dbValue -eq 'postgres' -or $dbValue -eq 'change-me-to-a-random-password') {
        Err "POSTGRES_PASSWORD 未设置或仍为默认值"
        $ok = $false
    }
	$adminLine = ($content -split "`n" | Where-Object { $_ -match '^ADMIN_INITIAL_PASSWORD=' } | Select-Object -First 1)
	$adminValue = if ($adminLine) { ($adminLine -split '=', 2)[1].Trim() } else { "" }
    if ($adminValue.Length -lt 12 -or $adminValue.Length -gt 72 -or $adminValue -notmatch '[A-Za-z]' -or $adminValue -notmatch '[0-9]') {
		Err "ADMIN_INITIAL_PASSWORD 必须为12-72位并同时包含字母和数字"
		$ok = $false
    }
	$domainLine = ($content -split "`n" | Where-Object { $_ -match '^DOMAIN=' } | Select-Object -First 1)
	$domain = if ($domainLine) { ($domainLine -split '=', 2)[1].Trim() } else { "" }
	$corsLine = ($content -split "`n" | Where-Object { $_ -match '^CORS_ALLOWED_ORIGINS=' } | Select-Object -First 1)
	$corsValue = if ($corsLine) { ($corsLine -split '=', 2)[1].Trim() } else { "" }
	if ($domain -ne 'jiangrun.net') {
		Err "DOMAIN 必须与当前 Nginx 配置一致：jiangrun.net"
		$ok = $false
	}
	if (-not $corsValue -or $corsValue.Contains('*') -or -not $corsValue.StartsWith('https://')) {
		Err "CORS_ALLOWED_ORIGINS 必须是明确的 HTTPS 域名且不能包含通配符"
		$ok = $false
	}
	$certDirLine = ($content -split "`n" | Where-Object { $_ -match '^TLS_CERT_DIR=' } | Select-Object -First 1)
	$certDir = if ($certDirLine) { ($certDirLine -split '=', 2)[1].Trim() } else { "" }
	if (-not $certDir -or -not (Test-Path (Join-Path $certDir "fullchain.pem")) -or -not (Test-Path (Join-Path $certDir "privkey.pem"))) {
		Err "TLS 证书缺失：请在 TLS_CERT_DIR 放置 fullchain.pem 和 privkey.pem"
		$ok = $false
	}
    if ($ok) { Ok ".env 密钥检查通过" }
    if (-not $ok) { exit 1 }
}

function Show-Summary {
	$domain = (Get-Content "$DeployDir\.env" | Select-String '^DOMAIN=' | ForEach-Object { ($_ -split '=', 2)[1] })
	if (-not $domain) { $domain = "jiangrun.net" }
    Write-Host ""
    Write-Host "=========================================================="
    Write-Host "  部署完成，访问地址："
	Write-Host "    前台官网:  https://$domain/"
	Write-Host "    后台管理:  https://$domain/admin/"
	Write-Host "  后台没有独立公网端口，仅能通过 HTTPS 入口访问。"
    Write-Host "=========================================================="
    Write-Host ""
}

# 启动成功后用默认浏览器打开前台与后台（Windows）
function Open-Browsers {
	$domain = (Get-Content "$DeployDir\.env" | Select-String '^DOMAIN=' | ForEach-Object { ($_ -split '=', 2)[1] })
	if (-not $domain) { $domain = "jiangrun.net" }
	$site = "https://$domain/"
	$admin = "https://$domain/admin/"
    Info "正在用浏览器打开前台与后台..."
    Start-Process $site
    Start-Sleep -Seconds 1
    Start-Process $admin
    Ok "已在浏览器打开：前台 $site  后台 $admin"
}

function Show-Usage {
    Write-Host @"
江润园林网站 Windows 一键部署脚本

用法: deploy.ps1 [命令]    或    双击 deploy.bat

启动类:
  run         （推荐）构建并启动所有服务，完成后自动打开浏览器（双击 start.bat 即调此命令）
  up         构建并启动所有服务（首次部署 / 代码更新后）
  start      启动服务（不重新构建，更快）
  build      仅重新构建镜像

停止类:
  stop       停止容器（保留容器与数据）
  restart    重启容器（不重新构建）
  down       停止并移除容器（保留数据卷）

查看类:
  logs       查看日志，可指定服务名，如: deploy.ps1 logs server
  status     查看各服务运行状态

其他:
  init       仅生成 .env 配置文件
  check      安全检查：校验 .env 中密钥是否为默认/弱值
  help       显示本帮助
"@
}

# ---------- 命令分发 ----------
switch ($Command.ToLower()) {
    "up" {
        Init-Env
        Check-Env
        Info "拉取基础镜像、应用系统安全更新并构建（首次构建约需数分钟）..."
        docker compose -p jiangrun build --pull --no-cache
        docker compose -p jiangrun up -d
        Ok "服务已启动"
        Wait-Ready
        Show-Summary
    }
    # 一键启动专用：构建 + 启动 + 自动打开浏览器
    "run" {
        Init-Env
        Check-Env
        Info "一键启动：拉取基础镜像、应用系统安全更新并构建..."
        docker compose -p jiangrun build --pull --no-cache
        docker compose -p jiangrun up -d
        Ok "服务已启动"
        Wait-Ready
        Show-Summary
        Open-Browsers
    }
    "start" {
        Init-Env
        Check-Env
        Info "启动所有服务..."
        docker compose -p jiangrun up -d
        Ok "服务已启动"
        Wait-Ready
        Show-Summary
    }
    "build" {
        Init-Env
        Info "拉取基础镜像并无缓存构建所有镜像..."
        docker compose -p jiangrun build --pull --no-cache
        Ok "镜像构建完成"
    }
    "stop" {
        docker compose -p jiangrun stop
        Ok "已停止容器"
    }
    "restart" {
        docker compose -p jiangrun restart
        Ok "已重启所有服务"
    }
    "down" {
        docker compose -p jiangrun down
        Ok "已停止并移除容器"
    }
    "check" {
        Check-Env
    }
    "logs" {
        if ($Rest.Count -gt 0) {
            docker compose -p jiangrun logs -f --tail=100 @Rest
        } else {
            docker compose -p jiangrun logs -f --tail=100
        }
    }
    "status" {
        docker compose -p jiangrun ps
    }
    "init" {
        Init-Env
    }
    default {
        Show-Usage
    }
}
