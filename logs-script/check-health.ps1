# Meeta - Container Health Check
# Check status and health of all containers

param(
    [switch]$Watch,
    [int]$Interval = 5
)

function Show-ContainerStatus {
    Clear-Host
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "   Meeta - Container Health Check" -ForegroundColor Cyan
    Write-Host "   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Get container status
    $containers = docker compose ps --format json | ConvertFrom-Json
    
    Write-Host "Container Status:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($container in $containers) {
        $name = $container.Name
        $state = $container.State
        $health = $container.Health
        $status = $container.Status
        
        $stateColor = switch ($state) {
            "running" { "Green" }
            "exited" { "Red" }
            "restarting" { "Yellow" }
            default { "Gray" }
        }
        
        $healthSymbol = switch ($health) {
            "healthy" { "✓" }
            "unhealthy" { "✗" }
            "starting" { "⟳" }
            default { "-" }
        }
        
        Write-Host "  [$healthSymbol] " -NoNewline
        Write-Host "$name" -ForegroundColor $stateColor -NoNewline
        Write-Host " - $status" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Recent Errors (last 20 lines):" -ForegroundColor Yellow
    Write-Host ""
    
    # Check for errors in logs
    $errorLogs = docker compose logs --tail=20 --since 1m 2>&1 | Select-String -Pattern "ERROR|FATAL|SEVERE|Exception|failed" -CaseSensitive:$false
    
    if ($errorLogs) {
        foreach ($log in $errorLogs) {
            Write-Host "  $log" -ForegroundColor Red
        }
    } else {
        Write-Host "  No recent errors found" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Network Connectivity:" -ForegroundColor Yellow
    Write-Host ""
    
    # Check if services can communicate
    $jicofoConnected = docker compose logs jicofo --tail=10 | Select-String "Connected" | Select-Object -Last 1
    $jvbConnected = docker compose logs jvb --tail=10 | Select-String "Joined MUC" | Select-Object -Last 1
    
    if ($jicofoConnected) {
        Write-Host "  ✓ Jicofo: Connected to XMPP" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Jicofo: Not connected" -ForegroundColor Red
    }
    
    if ($jvbConnected) {
        Write-Host "  ✓ JVB: Joined brewery MUC" -ForegroundColor Green
    } else {
        Write-Host "  ✗ JVB: Not connected to MUC" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Access URLs:" -ForegroundColor Yellow
    Write-Host "  HTTP:  http://localhost:8000" -ForegroundColor Cyan
    Write-Host "  HTTPS: https://localhost:8443" -ForegroundColor Cyan
    Write-Host ""
    
    if ($Watch) {
        Write-Host "Refreshing in $Interval seconds... (Press Ctrl+C to stop)" -ForegroundColor Gray
    }
}

if ($Watch) {
    while ($true) {
        Show-ContainerStatus
        Start-Sleep -Seconds $Interval
    }
} else {
    Show-ContainerStatus
}
