# Meeta - Jitsi Logs Monitor
# Real-time monitoring script for all Jitsi containers

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Meeta - Jitsi Meet Logs Monitor" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitoring containers:" -ForegroundColor Yellow
Write-Host "  - meeta-jitsi-web      (Frontend)" -ForegroundColor Green
Write-Host "  - meeta-jitsi-prosody  (XMPP)" -ForegroundColor Green
Write-Host "  - meeta-jitsi-jicofo   (Focus)" -ForegroundColor Green
Write-Host "  - meeta-jitsi-jvb      (Videobridge)" -ForegroundColor Green
Write-Host "  - meeta-postgres       (Database)" -ForegroundColor Green
Write-Host "  - meeta-redis          (Cache)" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Follow logs from all containers
docker compose logs -f --tail=100
