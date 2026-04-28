@echo off
echo 正在启动目标追踪器服务器...
echo.

:: 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未安装Node.js，请先安装Node.js
    pause
    exit /b 1
)

:: 设置端口
set PORT=4000

:: 启动服务器
echo 启动服务器在端口 %PORT%...
echo.
node server-stable.js

pause