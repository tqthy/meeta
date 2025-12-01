Write-Host "Meeta Configuration Check" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""
if (Test-Path .env) { Write-Host "[OK] .env file exists" -ForegroundColor Green } else { Write-Host "[FAIL] .env missing" -ForegroundColor Red }
if (Test-Path docker-compose.yml) { Write-Host "[OK] docker-compose.yml exists" -ForegroundColor Green }
if (Test-Path jitsi-config) { Write-Host "[OK] jitsi-config directory exists" -ForegroundColor Green }
Write-Host ""
Write-Host "Container Status:" -ForegroundColor Yellow
docker compose ps --format table
Write-Host ""
Write-Host "Access: http://localhost:8000" -ForegroundColor Cyan
