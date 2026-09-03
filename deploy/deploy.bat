@echo off
rem deploy.bat - 江润园林网站 Windows 一键部署入口（双击运行）
rem 也可以命令行使用：deploy.bat stop / deploy.bat logs server 等
chcp 65001 >nul
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*

echo.
pause
