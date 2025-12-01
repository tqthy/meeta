# Meeta - Real-time Log Watcher
# Continuously monitors logs and highlights important events

param(
    [string]$Service = "",
    [int]$Lines = 50
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Meeta - Real-time Log Monitor" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if ($Service) {
    Write-Host "Monitoring: $Service" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""
    docker compose logs -f --tail=$Lines $Service
} else {
    Write-Host "Monitoring: ALL services" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""
    docker compose logs -f --tail=$Lines
}
