@echo off
rem Windows 本地开发环境一键停止（双击运行）
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================================
echo   江润园林 - Windows 开发环境一键停止
echo ==========================================================
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev-windows.ps1" stop
set "JIANGRUN_EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%JIANGRUN_EXIT_CODE%"=="0" (
    echo [错误] 停止过程中发生错误，请查看上方提示。
) else (
    echo [完成] 前台、后台、API 和开发数据库均已停止，数据已保留。
)
echo.
pause
exit /b %JIANGRUN_EXIT_CODE%
