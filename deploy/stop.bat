@echo off
rem stop.bat - 江润园林网站 Windows 一键关闭脚本（双击运行）
rem 作用：停止并移除所有容器（数据卷保留，下次双击 deploy.bat 可重新启动）
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================================
echo   江润园林网站 - 一键关闭
echo ==========================================================
echo.

rem 检查 Docker 是否可用
docker version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Docker 或 Docker Desktop 未启动。
    echo 如果 Docker Desktop 未启动，可先启动后再运行本脚本；
    echo 或直接重启电脑（容器会随 Docker 自动停止）。
    echo.
    pause
    exit /b 1
)

echo 正在停止并移除所有容器...
docker compose -p jiangrun down

if errorlevel 1 (
    echo.
    echo [错误] 关闭失败，请手动执行: docker compose -p jiangrun down
) else (
    echo.
    echo [完成] 已关闭所有服务，数据已保留。
    echo 下次双击 deploy.bat 即可重新启动。
)

echo.
pause
