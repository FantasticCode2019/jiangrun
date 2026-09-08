# Windows 环境预检函数。由开发和生产 PowerShell 脚本共同调用。
function Assert-JiangrunEnvironment {
    param(
        [ValidateSet("Development", "Production")]
        [string]$Profile
    )

    $issues = New-Object System.Collections.ArrayList
    function Add-EnvironmentIssue([string]$Key, [string]$Message, [string]$Package = "", [string]$Action = "install") {
        [void]$issues.Add([PSCustomObject]@{ Key = $Key; Message = $Message; Package = $Package; Action = $Action })
        Write-Host "[缺失]  $Message" -ForegroundColor Red
    }
    function EnvironmentPass([string]$Message) {
        Write-Host "[满足]  $Message" -ForegroundColor Green
    }

    Write-Host "正在检查 $Profile 环境..." -ForegroundColor Cyan

    if ($PSVersionTable.PSVersion -ge [version]"5.1") {
        EnvironmentPass "PowerShell $($PSVersionTable.PSVersion)"
    }
    else {
        Add-EnvironmentIssue "powershell" "PowerShell 版本过低，要求 5.1+"
    }

    $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCommand) {
        Add-EnvironmentIssue "docker" "Docker Desktop 未安装" "Docker.DockerDesktop"
    }
    else {
        EnvironmentPass "Docker CLI：$(& docker --version 2>$null)"
        & docker compose version *> $null
        if ($LASTEXITCODE -eq 0) {
            EnvironmentPass "Docker Compose：$(& docker compose version --short 2>$null)"
        }
        else {
            Add-EnvironmentIssue "compose" "Docker Compose v2 不可用，请更新 Docker Desktop" "Docker.DockerDesktop" "upgrade"
        }
        & docker info *> $null
        if ($LASTEXITCODE -eq 0) {
            EnvironmentPass "Docker Desktop 正在运行"
        }
        else {
            Add-EnvironmentIssue "docker_running" "Docker Desktop 尚未启动或未就绪"
        }
    }

    if ($Profile -eq "Development") {
        $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
        if (-not $nodeCommand) {
            Add-EnvironmentIssue "node" "Node.js 未安装（要求 22+）" "OpenJS.NodeJS.LTS"
        }
        else {
            try { $nodeVersion = [version]((& node --version).Trim().TrimStart("v")) } catch { $nodeVersion = [version]"0.0" }
            if ($nodeVersion.Major -ge 22) {
                EnvironmentPass "Node.js v$nodeVersion"
            }
            else {
                Add-EnvironmentIssue "node" "Node.js 版本过低（当前 v$nodeVersion，要求 22+）" "OpenJS.NodeJS.LTS" "upgrade"
            }
        }
        if (Get-Command npm -ErrorAction SilentlyContinue) {
            EnvironmentPass "npm：$(& npm.cmd --version 2>$null)"
        }
        else {
            Add-EnvironmentIssue "npm" "npm 未安装或不在 PATH 中" "OpenJS.NodeJS.LTS"
        }

        $goCommand = Get-Command go -ErrorAction SilentlyContinue
        if (-not $goCommand) {
            Add-EnvironmentIssue "go" "Go 未安装（要求 1.26+）" "GoLang.Go"
        }
        else {
            $goText = & go version 2>$null
            if ($goText -match 'go(\d+)\.(\d+)') {
                $goMajor = [int]$Matches[1]
                $goMinor = [int]$Matches[2]
            }
            else {
                $goMajor = 0; $goMinor = 0
            }
            if ($goMajor -gt 1 -or ($goMajor -eq 1 -and $goMinor -ge 26)) {
                EnvironmentPass "Go：$goText"
            }
            else {
                Add-EnvironmentIssue "go" "Go 版本过低（要求 1.26+）" "GoLang.Go" "upgrade"
            }
        }
    }
    else {
        if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
            EnvironmentPass "curl.exe 可用"
        }
        else {
            Add-EnvironmentIssue "curl" "curl.exe 不可用，生产健康检查无法执行" "cURL.cURL"
        }
    }

    if ($issues.Count -eq 0) {
        EnvironmentPass "环境检查全部通过"
        return
    }

    Write-Host ""
    Write-Host "共有 $($issues.Count) 项环境条件不满足。" -ForegroundColor Red
    Write-Host "可以手动执行以下命令（管理员 PowerShell）：" -ForegroundColor Yellow
    $shownPackages = @{}
    foreach ($issue in $issues) {
        if ($issue.Package -and -not $shownPackages.ContainsKey($issue.Package)) {
            $verb = if ($issue.Action -eq "upgrade") { "upgrade" } else { "install" }
            Write-Host "  winget $verb --id $($issue.Package) -e"
            $shownPackages[$issue.Package] = $true
        }
        if ($issue.Key -eq "docker_running") {
            Write-Host "  启动 Docker Desktop，并等待鲸鱼图标显示就绪"
        }
        if ($issue.Key -eq "powershell") {
            Write-Host "  https://learn.microsoft.com/powershell/"
        }
    }

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget -and [Environment]::UserInteractive) {
        Write-Host ""
        $answer = Read-Host "是否允许脚本使用 winget 尝试自动安装/升级缺失项？[y/N]"
        if ($answer -match '^(y|yes)$') {
            $processed = @{}
            foreach ($issue in $issues) {
                if (-not $issue.Package -or $processed.ContainsKey($issue.Package)) { continue }
                if ($issue.Action -eq "upgrade") {
                    & winget upgrade --id $issue.Package -e --accept-package-agreements --accept-source-agreements
                }
                else {
                    & winget install --id $issue.Package -e --accept-package-agreements --accept-source-agreements
                }
                $processed[$issue.Package] = $true
            }
            if (($issues | Where-Object { $_.Key -eq "docker_running" }).Count -gt 0) {
                $dockerDesktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
                if (Test-Path $dockerDesktop) { Start-Process $dockerDesktop }
            }
            throw "自动安装命令已执行。请重启终端，确认 Docker Desktop 就绪后再次运行启动脚本。"
        }
    }
    elseif (-not $winget) {
        Write-Host "未检测到 winget，请使用上面的官方网站或安装命令手动处理。" -ForegroundColor Yellow
    }

    throw "当前环境不满足 $Profile 启动条件"
}
