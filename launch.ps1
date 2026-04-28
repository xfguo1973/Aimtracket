Write-Host "Starting AimTracker Server..." -ForegroundColor Green

$env:PORT = "4000"
$env:JWT_SECRET = "aimtracker_secret_key_2026"

Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}

Write-Host "Starting server on port $env:PORT..." -ForegroundColor Cyan

$process = Start-Process -FilePath "node" -ArgumentList "server-stable.js" -NoNewWindow -PassThru

Write-Host "Waiting for server to start..."
Start-Sleep -Seconds 2

if ($process.HasExited) {
    Write-Host "Server failed to start" -ForegroundColor Red
    exit 1
}

Write-Host "Server started successfully, PID: $($process.Id)" -ForegroundColor Green
Write-Host "Access at: http://localhost:$env:PORT" -ForegroundColor Green

while (-not $process.HasExited) {
    Start-Sleep -Seconds 1
}

Write-Host "Server stopped" -ForegroundColor Red