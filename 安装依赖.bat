@echo off
rem ============================================================
rem  安装雅思学习APP 运行依赖（仅在 node_modules 缺失时使用）
rem ============================================================
title 安装雅思学习APP依赖
cd /d "%~dp0"

echo 正在检查 Node.js 环境...
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 22 或更高版本：
    echo        https://nodejs.org/
    pause
    exit /b 1
)

echo 正在安装依赖，首次可能需要几分钟，请耐心等待...
call npm install
if errorlevel 1 (
    echo [错误] 安装失败，请检查网络后重试。
) else (
    echo 安装完成！现在可以双击「启动雅思学习APP.vbs」使用了。
)
pause
