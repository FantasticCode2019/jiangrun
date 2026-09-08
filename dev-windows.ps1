# 江润园林 Windows 本地开发环境管理脚本（Windows PowerShell 5.1+）
param(
    [ValidateSet("start", "stop", "status")]
    [string]$Command = "start"
)

$ErrorActionPreference = "Stop"

function Info([string]$Message) { Write-Host "[INFO]  $Message" -ForegroundColor Cyan }
function Ok([string]$Message)   { Write-Host "[OK]    $Message" -ForegroundColor Green }
function Warn([string]$Message) { Write-Host "[WARN]  $Message" -ForegroundColor Yellow }
function Err([string]$Message)  { Write-Host "[ERROR] $Message" -ForegroundColor Red }

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $ProjectDir ".env.development.local"
$ComposeFile = Join-Path $ProjectDir "deploy\docker-compose.dev.yml"
$RuntimeDir = Join-Path $ProjectDir ".runtime\dev-windows"
$LogDir = Join-Path $RuntimeDir "logs"
$BinDir = Join-Path $RuntimeDir "bin"
$NextEnvBackup = Join-Path $RuntimeDir "next-env.d.ts.before-dev"
$EnvironmentChecker = Join-Path $ProjectDir "scripts\check-environment.ps1"
$script:DevConfig = @{}
$script:ComposeMode = ""

if (-not (Test-Path $EnvironmentChecker)) {
    throw "环境检查脚本不存在：$EnvironmentChecker"
}
. $EnvironmentChecker

function Get-RandomHex([int]$ByteCount) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $buffer = New-Object byte[] $ByteCount
        $rng.GetBytes($buffer)
        return (($buffer | ForEach-Object { $_.ToString("x2") }) -join "")
    }
    finally {
        $rng.Dispose()
    }
}

function Initialize-Environment {
    New-Item -ItemType Directory -Force -Path $RuntimeDir, $LogDir, $BinDir | Out-Null
    if (Test-Path $EnvFile) { return }

    $databasePassword = Get-RandomHex 16
    $jwtSecret = Get-RandomHex 32
    $adminPassword = "Dev9-$(Get-RandomHex 8)"
    $content = @"
# 本文件仅用于本地开发，禁止复制到生产环境或提交 Git。
DEV_POSTGRES_USER=postgres
DEV_POSTGRES_PASSWORD=$databasePassword
DEV_POSTGRES_DB=jiangrun_dev
DEV_DB_PORT=5432

DEV_JWT_SECRET=$jwtSecret
DEV_ADMIN_INITIAL_PASSWORD=$adminPassword
DEV_SERVER_PORT=8080
DEV_FRONTEND_PORT=3000
DEV_ADMIN_PORT=3001
DEV_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001
DEV_GOPROXY=https://goproxy.cn,direct
"@
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($EnvFile, $content, $utf8NoBom)
    Ok "已生成本地开发配置：$EnvFile"
    Write-Host "初始管理员：admin"
    Write-Host "初始密码：$adminPassword"
}

function Load-Environment {
    Initialize-Environment
    $script:DevConfig = @{}
    foreach ($line in Get-Content $EnvFile) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
        $parts = $trimmed -split "=", 2
        if ($parts.Count -eq 2) {
            $script:DevConfig[$parts[0].Trim()] = $parts[1].Trim()
        }
    }

    $defaults = @{
        DEV_POSTGRES_USER = "postgres"
        DEV_POSTGRES_DB = "jiangrun_dev"
        DEV_DB_PORT = "5432"
        DEV_SERVER_PORT = "8080"
        DEV_FRONTEND_PORT = "3000"
        DEV_ADMIN_PORT = "3001"
        DEV_CORS_ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:3001"
        DEV_GOPROXY = "https://goproxy.cn,direct"
    }
    foreach ($key in $defaults.Keys) {
        if (-not $script:DevConfig.ContainsKey($key) -or -not $script:DevConfig[$key]) {
            $script:DevConfig[$key] = $defaults[$key]
        }
    }
    foreach ($required in @("DEV_POSTGRES_PASSWORD", "DEV_JWT_SECRET", "DEV_ADMIN_INITIAL_PASSWORD")) {
        if (-not $script:DevConfig.ContainsKey($required) -or -not $script:DevConfig[$required]) {
            throw "$required 未配置，请检查 $EnvFile"
        }
    }
}

function Test-Command([string]$Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Initialize-Compose {
    if (-not (Test-Command "docker")) {
        throw "未安装 Docker Desktop：https://www.docker.com/products/docker-desktop/"
    }
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Desktop 未启动，请启动后等待鲸鱼图标显示就绪"
    }
    & docker compose version *> $null
    if ($LASTEXITCODE -eq 0) {
        $script:ComposeMode = "v2"
    }
    elseif (Test-Command "docker-compose") {
        $script:ComposeMode = "v1"
    }
    else {
        throw "未找到 Docker Compose 插件"
    }
}

function Invoke-Compose {
    $baseArguments = @("--project-name", "jiangrun-dev", "--env-file", $EnvFile, "-f", $ComposeFile)
    if ($script:ComposeMode -eq "v2") {
        & docker compose @baseArguments @args
    }
    else {
        & docker-compose @baseArguments @args
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose 命令执行失败：$args"
    }
}

function Assert-Prerequisites {
    Assert-JiangrunEnvironment -Profile Development
    Initialize-Compose
}

function Install-NodeDependencies([string]$Directory, [string]$Label) {
    $lockFile = Join-Path $Directory "package-lock.json"
    $stampFile = Join-Path $Directory "node_modules\.jiangrun-package-lock.windows.sha256"
    $expectedHash = (Get-FileHash $lockFile -Algorithm SHA256).Hash
    $installedHash = ""
    if (Test-Path $stampFile) {
        $installedHash = (Get-Content $stampFile -Raw).Trim()
    }
    if (-not (Test-Path (Join-Path $Directory "node_modules")) -or $installedHash -ne $expectedHash) {
        Info "安装${Label}依赖（首次运行或 package-lock.json 已变化）..."
        Push-Location $Directory
        try {
            & npm.cmd ci
            if ($LASTEXITCODE -ne 0) { throw "${Label}依赖安装失败" }
        }
        finally {
            Pop-Location
        }
        [System.IO.File]::WriteAllText($stampFile, $expectedHash, [System.Text.Encoding]::ASCII)
    }
}

function Install-Dependencies {
    Install-NodeDependencies (Join-Path $ProjectDir "frontend") "前台"
    Install-NodeDependencies (Join-Path $ProjectDir "admin") "后台"
    Info "下载 Go 依赖..."
    $oldProxy = $env:GOPROXY
    try {
        $env:GOPROXY = $script:DevConfig.DEV_GOPROXY
        Push-Location (Join-Path $ProjectDir "server")
        & go mod download
        if ($LASTEXITCODE -ne 0) { throw "Go 依赖下载失败" }
    }
    finally {
        Pop-Location
        $env:GOPROXY = $oldProxy
    }
}

function Wait-Database {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            if ($script:ComposeMode -eq "v2") {
                & docker compose --project-name jiangrun-dev --env-file $EnvFile -f $ComposeFile exec -T postgres pg_isready -U $script:DevConfig.DEV_POSTGRES_USER -d $script:DevConfig.DEV_POSTGRES_DB *> $null
            }
            else {
                & docker-compose --project-name jiangrun-dev --env-file $EnvFile -f $ComposeFile exec -T postgres pg_isready -U $script:DevConfig.DEV_POSTGRES_USER -d $script:DevConfig.DEV_POSTGRES_DB *> $null
            }
            if ($LASTEXITCODE -eq 0) {
                Ok "开发数据库已就绪"
                return
            }
        }
        catch {}
        Start-Sleep -Seconds 1
    }
    throw "数据库在 30 秒内未就绪"
}

function Get-PidFile([string]$Name) { return (Join-Path $RuntimeDir "$Name.pid") }

function Get-ProcessMarker([string]$Name) {
    switch ($Name) {
        "server"   { return "jiangrun-server" }
        "frontend" { return "next" }
        "admin"    { return "vite" }
        default     { return "" }
    }
}

function Test-ManagedProcess([string]$Name) {
    $pidFile = Get-PidFile $Name
    if (-not (Test-Path $pidFile)) { return $false }
    $managedPid = (Get-Content $pidFile -Raw).Trim()
    if ($managedPid -notmatch '^\d+$') { return $false }
    try {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $managedPid"
        if (-not $process) { return $false }
        $marker = Get-ProcessMarker $Name
        return $process.CommandLine.Contains($ProjectDir) -and $process.CommandLine.Contains($marker)
    }
    catch {
        return $false
    }
}

function Assert-PortAvailable([int]$Port, [string]$Label) {
    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
        if ($listener) { throw "$Label 端口 $Port 已被其他程序占用" }
    }
}

function Start-ManagedProcess(
    [string]$Name,
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory
) {
    if (Test-ManagedProcess $Name) {
        Info "$Name 已在运行"
        return
    }
    $stdout = Join-Path $LogDir "$Name.log"
    $stderr = Join-Path $LogDir "$Name.error.log"
    [System.IO.File]::WriteAllText($stdout, "")
    [System.IO.File]::WriteAllText($stderr, "")
    $parameters = @{
        FilePath = $FilePath
        WorkingDirectory = $WorkingDirectory
        RedirectStandardOutput = $stdout
        RedirectStandardError = $stderr
        PassThru = $true
        WindowStyle = "Hidden"
    }
    if ($Arguments -and $Arguments.Count -gt 0) {
        $parameters.ArgumentList = $Arguments
    }
    $process = Start-Process @parameters
    [System.IO.File]::WriteAllText((Get-PidFile $Name), $process.Id.ToString(), [System.Text.Encoding]::ASCII)
    Start-Sleep -Seconds 1
    if ($process.HasExited) {
        $details = if (Test-Path $stderr) { Get-Content $stderr -Tail 30 | Out-String } else { "" }
        throw "$Name 启动失败`n$details"
    }
    Ok "$Name 已启动（PID $($process.Id)）"
}

function Invoke-WithEnvironment([hashtable]$Values, [scriptblock]$Action) {
    $previous = @{}
    foreach ($key in $Values.Keys) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
        [Environment]::SetEnvironmentVariable($key, [string]$Values[$key], "Process")
    }
    try {
        & $Action
    }
    finally {
        foreach ($key in $Values.Keys) {
            [Environment]::SetEnvironmentVariable($key, $previous[$key], "Process")
        }
    }
}

function Build-Server {
    Info "编译 Go API..."
    $serverDir = Join-Path $ProjectDir "server"
    $serverBin = Join-Path $BinDir "jiangrun-server.exe"
    $oldProxy = $env:GOPROXY
    try {
        $env:GOPROXY = $script:DevConfig.DEV_GOPROXY
        Push-Location $serverDir
        & go build -o $serverBin .
        if ($LASTEXITCODE -ne 0) { throw "Go API 编译失败" }
    }
    finally {
        Pop-Location
        $env:GOPROXY = $oldProxy
    }
    return $serverBin
}

function Wait-Http([string]$Label, [string]$Url) {
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Ok "$Label HTTP 检查通过"
                return
            }
        }
        catch {}
        Start-Sleep -Milliseconds 500
    }
    throw "$Label 在 20 秒内未能正常响应：$Url"
}

function Start-Development {
    Load-Environment
    Assert-Prerequisites
    Install-Dependencies

    Info "启动独立开发数据库..."
    Invoke-Compose up -d postgres
    Wait-Database

    $serverPort = [int]$script:DevConfig.DEV_SERVER_PORT
    $frontendPort = [int]$script:DevConfig.DEV_FRONTEND_PORT
    $adminPort = [int]$script:DevConfig.DEV_ADMIN_PORT
    if (-not (Test-ManagedProcess "server")) { Assert-PortAvailable $serverPort "API" }
    if (-not (Test-ManagedProcess "frontend")) { Assert-PortAvailable $frontendPort "前台" }
    if (-not (Test-ManagedProcess "admin")) { Assert-PortAvailable $adminPort "后台" }

    $serverDir = Join-Path $ProjectDir "server"
    if (-not (Test-ManagedProcess "server")) {
        $serverBin = Build-Server
        $serverEnvironment = @{
            DATABASE_HOST = "127.0.0.1"
            DATABASE_PORT = $script:DevConfig.DEV_DB_PORT
            DATABASE_USER = $script:DevConfig.DEV_POSTGRES_USER
            DATABASE_PASSWORD = $script:DevConfig.DEV_POSTGRES_PASSWORD
            DATABASE_DBNAME = $script:DevConfig.DEV_POSTGRES_DB
            DATABASE_SSLMODE = "disable"
            JWT_SECRET = $script:DevConfig.DEV_JWT_SECRET
            ADMIN_INITIAL_PASSWORD = $script:DevConfig.DEV_ADMIN_INITIAL_PASSWORD
            SERVER_MODE = "debug"
            SERVER_PORT = $script:DevConfig.DEV_SERVER_PORT
            CORS_ALLOWED_ORIGINS = $script:DevConfig.DEV_CORS_ALLOWED_ORIGINS
        }
        Invoke-WithEnvironment $serverEnvironment {
            Start-ManagedProcess -Name "server" -FilePath $serverBin -Arguments @() -WorkingDirectory $serverDir
        }
    }
    else {
        Info "server 已在运行"
    }

    $frontendDir = Join-Path $ProjectDir "frontend"
    $nodeExe = (Get-Command node).Source
    if (-not (Test-ManagedProcess "frontend")) {
        $nextEnv = Join-Path $frontendDir "next-env.d.ts"
        if ((Test-Path $nextEnv) -and -not (Test-Path $NextEnvBackup)) {
            Copy-Item $nextEnv $NextEnvBackup
        }
        $nextScript = Join-Path $frontendDir "node_modules\next\dist\bin\next"
        $nextHelp = (& $nodeExe $nextScript dev --help 2>&1 | Out-String)
        $nextArguments = @("`"$nextScript`"", "dev")
        if ($nextHelp.Contains("--webpack")) {
            $nextArguments += "--webpack"
        }
        else {
            Warn "当前 Next.js 不支持 --webpack，使用该版本默认的开发编译器"
        }
        $nextArguments += @("--hostname", "127.0.0.1", "--port", $script:DevConfig.DEV_FRONTEND_PORT)
        Invoke-WithEnvironment @{
            API_URL = "http://127.0.0.1:$serverPort"
            NEXT_TELEMETRY_DISABLED = "1"
        } {
            Start-ManagedProcess -Name "frontend" -FilePath $nodeExe -Arguments $nextArguments -WorkingDirectory $frontendDir
        }
    }
    else {
        Info "frontend 已在运行"
    }

    $adminDir = Join-Path $ProjectDir "admin"
    if (-not (Test-ManagedProcess "admin")) {
        $viteScript = Join-Path $adminDir "node_modules\vite\bin\vite.js"
        $viteArguments = @("`"$viteScript`"", "--host", "127.0.0.1", "--port", $script:DevConfig.DEV_ADMIN_PORT)
        Invoke-WithEnvironment @{ VITE_SITE_URL = "http://127.0.0.1:$frontendPort" } {
            Start-ManagedProcess -Name "admin" -FilePath $nodeExe -Arguments $viteArguments -WorkingDirectory $adminDir
        }
    }
    else {
        Info "admin 已在运行"
    }

    Wait-Http "API" "http://127.0.0.1:$serverPort/api/v1/settings"
    Wait-Http "前台" "http://127.0.0.1:$frontendPort/"
    Wait-Http "后台" "http://127.0.0.1:$adminPort/admin/"

    Write-Host ""
    Write-Host "=========================================================="
    Write-Host "  Windows 本地开发环境已启动"
    Write-Host "  前台：http://localhost:$frontendPort"
    Write-Host "  后台：http://localhost:$adminPort/admin/"
    Write-Host "  API： http://localhost:$serverPort/api/v1"
    Write-Host "  管理员：admin（初始密码保存在 $EnvFile）"
    Write-Host "=========================================================="
    Start-Process "http://localhost:$frontendPort/"
    Start-Sleep -Milliseconds 500
    Start-Process "http://localhost:$adminPort/admin/"
}

function Stop-ManagedProcess([string]$Name) {
    $pidFile = Get-PidFile $Name
    if (Test-ManagedProcess $Name) {
        $managedPid = [int](Get-Content $pidFile -Raw).Trim()
        & taskkill.exe /PID $managedPid /T /F *> $null
        Ok "$Name 已停止"
    }
    else {
        Info "$Name 未运行"
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    if ($Name -eq "frontend" -and (Test-Path $NextEnvBackup)) {
        Copy-Item $NextEnvBackup (Join-Path $ProjectDir "frontend\next-env.d.ts") -Force
        Remove-Item $NextEnvBackup -Force
    }
}

function Stop-Development {
    Initialize-Environment
    Stop-ManagedProcess "admin"
    Stop-ManagedProcess "frontend"
    Stop-ManagedProcess "server"
    if (Test-Command "docker") {
        try {
            Initialize-Compose
            Invoke-Compose down
            Ok "开发数据库容器已移除，数据卷已保留"
        }
        catch {
            Warn "Docker 不可用，应用进程已停止；数据库容器请在 Docker Desktop 中停止"
        }
    }
}

function Show-Status {
    Initialize-Environment
    foreach ($name in @("server", "frontend", "admin")) {
        if (Test-ManagedProcess $name) { Ok "$name 运行中" } else { Info "$name 已停止" }
    }
    try {
        Initialize-Compose
        Invoke-Compose ps postgres
    }
    catch {
        Warn $_.Exception.Message
    }
}

try {
    Set-Location $ProjectDir
    switch ($Command) {
        "start" { Start-Development }
        "stop"  { Stop-Development }
        "status" { Show-Status }
    }
    exit 0
}
catch {
    Err $_.Exception.Message
    if ($Command -eq "start") {
        Warn "启动未完成，正在停止已启动的开发进程..."
        try { Stop-Development } catch {}
    }
    exit 1
}
