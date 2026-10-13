@echo off
rem ============================================================
rem  雅思学习APP 本地启动器（调试版：显示日志窗口）
rem  如需无黑窗体验，请双击「启动雅思学习APP.vbs」
rem ============================================================
title 雅思学习APP - 本地服务
cd /d "%~dp0"

if not exist "node_modules\vite" (
    echo [错误] 缺少运行依赖 node_modules，请先双击运行「安装依赖.bat」。
    pause
    exit /b 1
)

rem 检测 3000 端口是否已被监听
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo 本地服务已在运行，正在打开浏览器...
    start "" "http://localhost:3000/"
    exit /b 0
)

echo 正在启动本地服务（首次启动约需 10~30 秒，请稍候）...
echo 日志窗口请勿关闭；如需退出服务，可关闭本窗口或运行「停止雅思学习APP.bat」。
start "雅思学习APP 本地服务日志" /min cmd /k "npm run dev"

rem 轮询等待服务就绪（最多 90 秒）
set /a n=0
:waitloop
set /a n+=1
if %n% gtr 90 (
    echo [超时] 90 秒内服务未就绪，请查看上方日志窗口的输出。
    pause
    exit /b 1
)
powershell -NoProfile -Command "try{$r=Invoke-WebRequest -UseBasicParsing 'http://localhost:3000/' -TimeoutSec 2; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){exit 0}else{exit 1}}catch{exit 1}"
if %errorlevel%==0 goto up
%SystemRoot%\System32\timeout.exe /t 1 /nobreak >nul
goto waitloop

:up
echo 服务已就绪，正在打开浏览器...
start "" "http://localhost:3000/"
%SystemRoot%\System32\timeout.exe /t 3 /nobreak >nul
exit /b 0
