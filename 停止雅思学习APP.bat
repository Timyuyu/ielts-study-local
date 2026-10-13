@echo off
rem ============================================================
rem  停止雅思学习APP 本地服务
rem ============================================================
title 停止雅思学习APP本地服务
cd /d "%~dp0"

echo 正在查找占用 3000 端口的服务进程...
set FOUND=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set FOUND=1
    echo 找到进程 PID=%%p，正在结束（含子进程）...
    taskkill /pid %%p /T /F >nul 2>&1
)
if %FOUND%==0 (
    echo 没有找到运行中的本地服务（端口 3000 未被占用）。
) else (
    echo 已停止本地服务。
)
pause
