# 目标追踪器服务器启动脚本
Write-Host "🚀 启动目标追踪器服务器..." -ForegroundColor Green

# 检查Node.js是否安装
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js 未安装，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

# 检查依赖是否安装
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装依赖..." -ForegroundColor Yellow
    npm install
}

# 设置端口环境变量
$env:PORT = "3000"
$env:JWT_SECRET = "aimtracker_secret_key_2026"

Write-Host "🔧 启动服务器在端口 $env:PORT..." -ForegroundColor Cyan
Write-Host "📍 访问地址: http://localhost:$env:PORT" -ForegroundColor Cyan

# 启动服务器
node server-final.js