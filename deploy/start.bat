@echo off
rem start.bat - 江润园林网站 Windows【一键启动】专用脚本（双击运行）
rem 作用：构建并启动所有服务，完成后自动用浏览器打开 前台官网 和 后台管理。
rem 需要已安装并启动 Docker Desktop。
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================================
echo   江润园林网站 - 一键启动（构建 + 启动 + 打开浏览器）
echo ==========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" run

echo.
echo 如果浏览器没有自动打开，可手动访问：
echo    前台官网:  http://localhost/
echo    后台管理:  http://localhost:3001
echo    （远程部署时，把 localhost 换成那台机器的 IP）
echo.
pause