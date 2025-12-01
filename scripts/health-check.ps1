# health-check.ps1
# Comprehensive health monitoring for Jitsi Meet Docker deployment
# Enhanced with XMPP verification, resource monitoring, and service metrics
# Usage: .\scripts\health-check.ps1 [-Watch] [-Interval 5] [-Detailed]

param(
    [switch]$Watch,
    [int]$Interval = 5,
    [switch]$Detailed
)

$ErrorActionPreference = "Continue"

# Color output helpers
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }
function Write-Detail { if ($Detailed) { Write-Host "  → $args" -ForegroundColor Gray } }

function Show-HealthStatus {
    Clear-Host
    
    # Banner
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   Jitsi Meet Health Monitor" -ForegroundColor Cyan
    Write-Host "   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    # ========================================================================
    # CONTAINER STATUS
    # ========================================================================
    Write-Host "📦 Container Status" -ForegroundColor Cyan
    Write-Host "──────────────────" -ForegroundColor Cyan
    
    try {
        $containers = docker compose ps --format json 2>$null | ConvertFrom-Json
        
        if (-not $containers) {
            Write-Error "No containers found. Are services running?"
            Write-Info "Start services with: docker compose up -d"
            Write-Host ""
            return
        }
        
        $runningCount = 0
        $healthyCount = 0
        $totalCount = 0
        
        foreach ($container in $containers) {
            $totalCount++
            $name = $container.Name
            $state = $container.State
            $health = $container.Health
            $status = $container.Status
            
            $stateColor = switch ($state) {
                "running" { $runningCount++; "Green" }
                "exited" { "Red" }
                "restarting" { "Yellow" }
                default { "Gray" }
            }
            
            $healthSymbol = switch ($health) {
                "healthy" { $healthyCount++; "✓" }
                "unhealthy" { "✗" }
                "starting" { "⟳" }
                default { "-" }
            }
            
            Write-Host "  [$healthSymbol] " -NoNewline -ForegroundColor $(if($health -eq "healthy"){"Green"}elseif($health -eq "unhealthy"){"Red"}else{"Yellow"})
            Write-Host "$name" -ForegroundColor $stateColor -NoNewline
            Write-Host " → $status" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "  Summary: " -NoNewline
        Write-Host "$runningCount/$totalCount running, " -NoNewline -ForegroundColor $(if($runningCount -eq $totalCount){"Green"}else{"Yellow"})
        Write-Host "$healthyCount healthy" -ForegroundColor $(if($healthyCount -eq $totalCount){"Green"}else{"Yellow"})
        
    } catch {
        Write-Error "Failed to get container status: $_"
    }
    
    Write-Host ""
    
    # ========================================================================
    # SERVICE HEALTH ENDPOINTS
    # ========================================================================
    Write-Host "🏥 Service Health Endpoints" -ForegroundColor Cyan
    Write-Host "───────────────────────────" -ForegroundColor Cyan
    
    # JVB Colibri API
    try {
        $jvbHealth = Invoke-RestMethod -Uri "http://localhost:8080/about/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Success "JVB Colibri API (8080)"
        Write-Detail "Response: $jvbHealth"
    } catch {
        Write-Error "JVB Colibri API (8080) - Not responding"
    }
    
    # JVB Public API  
    try {
        $jvbPublic = Invoke-RestMethod -Uri "http://localhost:9090/about/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Success "JVB Public API (9090)"
    } catch {
        Write-Warning "JVB Public API (9090) - Not accessible (may be disabled)"
    }
    
    # Jicofo REST API
    try {
        $jicofoHealth = Invoke-RestMethod -Uri "http://localhost:8888/about/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Success "Jicofo REST API (8888)"
        Write-Detail "Response: $jicofoHealth"
    } catch {
        Write-Error "Jicofo REST API (8888) - Not responding"
    }
    
    # Web Frontend
    try {
        $webHealth = Invoke-WebRequest -Uri "http://localhost:8000" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($webHealth.StatusCode -eq 200) {
            Write-Success "Web Frontend (8000)"
        }
    } catch {
        Write-Error "Web Frontend (8000) - Not accessible"
    }
    
    Write-Host ""
    
    # ========================================================================
    # XMPP CONNECTION STATUS
    # ========================================================================
    Write-Host "🔗 XMPP Connection Status" -ForegroundColor Cyan
    Write-Host "──────────────────────────" -ForegroundColor Cyan
    
    # Check Prosody status
    try {
        $prosodyStatus = docker compose exec -T prosody prosodyctl status 2>$null
        if ($prosodyStatus -match "running") {
            Write-Success "Prosody XMPP server is running"
        } else {
            Write-Error "Prosody XMPP server status unknown"
        }
    } catch {
        Write-Warning "Cannot check Prosody status"
    }
    
    # Check Jicofo connection
    $jicofoConnected = docker compose logs jicofo --tail=50 2>$null | 
                       Select-String "Registered.*JID|Connected.*isSmEnabled|authenticated" | 
                       Select-Object -Last 1
    
    if ($jicofoConnected) {
        Write-Success "Jicofo connected to XMPP"
        Write-Detail $jicofoConnected.Line.Trim()
    } else {
        Write-Error "Jicofo not connected to XMPP"
    }
    
    # Check JVB brewery registration
    $jvbBrewery = docker compose logs jvb --tail=50 2>$null | 
                  Select-String "Joined.*MUC|MucWrapper.*join" | 
                  Select-Object -Last 1
    
    if ($jvbBrewery) {
        Write-Success "JVB joined brewery MUC"
        Write-Detail $jvbBrewery.Line.Trim()
    } else {
        Write-Error "JVB not in brewery MUC"
    }
    
    # Check if Jicofo detected JVB
    $jicofoDetectedJvb = docker compose logs jicofo --tail=50 2>$null | 
                         Select-String "Added new videobridge|Added brewery instance" | 
                         Select-Object -Last 1
    
    if ($jicofoDetectedJvb) {
        Write-Success "Jicofo detected video bridge"
        Write-Detail $jicofoDetectedJvb.Line.Trim()
    } else {
        Write-Warning "Jicofo has not detected video bridge yet"
    }
    
    Write-Host ""
    
    # ========================================================================
    # RESOURCE USAGE
    # ========================================================================
    Write-Host "💾 Resource Usage" -ForegroundColor Cyan
    Write-Host "─────────────────" -ForegroundColor Cyan
    
    try {
        $stats = docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}}" 2>$null
        
        foreach ($line in $stats) {
            if ($line -match '^meeta-') {
                $parts = $line -split ','
                $containerName = $parts[0] -replace 'meeta-',''
                $cpu = $parts[1]
                $mem = $parts[2]
                $memPerc = $parts[3]
                
                Write-Host "  $containerName" -NoNewline -ForegroundColor White
                Write-Host " → CPU: " -NoNewline -ForegroundColor Gray
                Write-Host "$cpu" -NoNewline -ForegroundColor $(if([float]$cpu.TrimEnd('%') -gt 50){"Yellow"}else{"Green"})
                Write-Host ", Memory: " -NoNewline -ForegroundColor Gray
                Write-Host "$mem ($memPerc)" -ForegroundColor $(if([float]$memPerc.TrimEnd('%') -gt 80){"Yellow"}else{"Green"})
            }
        }
    } catch {
        Write-Warning "Cannot retrieve resource usage"
    }
    
    Write-Host ""
    
    # ========================================================================
    # JVB STATISTICS (Detailed mode)
    # ========================================================================
    if ($Detailed) {
        Write-Host "📊 JVB Statistics" -ForegroundColor Cyan
        Write-Host "─────────────────" -ForegroundColor Cyan
        
        try {
            $jvbStats = Invoke-RestMethod -Uri "http://localhost:8080/colibri/stats" -TimeoutSec 3 -ErrorAction Stop
            
            if ($jvbStats) {
                Write-Host "  Conferences: " -NoNewline
                Write-Host "$($jvbStats.conferences)" -ForegroundColor Green
                
                Write-Host "  Participants: " -NoNewline
                Write-Host "$($jvbStats.participants)" -ForegroundColor Green
                
                Write-Host "  Video streams: " -NoNewline
                Write-Host "$($jvbStats.videostreams)" -ForegroundColor Green
                
                if ($jvbStats.stress_level -ne $null) {
                    Write-Host "  Stress level: " -NoNewline
                    $stressColor = if ($jvbStats.stress_level -lt 0.5) { "Green" } elseif ($jvbStats.stress_level -lt 0.8) { "Yellow" } else { "Red" }
                    Write-Host "$([math]::Round($jvbStats.stress_level, 2))" -ForegroundColor $stressColor
                }
            }
        } catch {
            Write-Warning "Cannot retrieve JVB statistics"
        }
        
        Write-Host ""
    }
    
    # ========================================================================
    # RECENT ERRORS
    # ========================================================================
    Write-Host "🚨 Recent Errors (last 3 minutes)" -ForegroundColor Cyan
    Write-Host "──────────────────────────────────" -ForegroundColor Cyan
    
    try {
        $errorLogs = docker compose logs --tail=100 --since 3m 2>&1 | 
                     Select-String -Pattern "ERROR|FATAL|SEVERE|Exception|failed to|cannot" -CaseSensitive:$false |
                     Select-Object -First 10
        
        if ($errorLogs) {
            $errorCount = ($errorLogs | Measure-Object).Count
            Write-Warning "Found $errorCount error(s)"
            Write-Host ""
            
            foreach ($log in $errorLogs) {
                $logLine = $log.Line
                # Extract container name if present
                if ($logLine -match '^(meeta-\w+)') {
                    $container = $matches[1] -replace 'meeta-',''
                    Write-Host "  [$container] " -NoNewline -ForegroundColor Yellow
                }
                # Truncate long lines
                $message = if ($logLine.Length -gt 120) { $logLine.Substring(0, 120) + "..." } else { $logLine }
                Write-Host $message -ForegroundColor Red
            }
        } else {
            Write-Success "No errors found"
        }
    } catch {
        Write-Warning "Cannot check logs for errors"
    }
    
    Write-Host ""
    
    # ========================================================================
    # ACCESS INFORMATION
    # ========================================================================
    Write-Host "🌐 Access Information" -ForegroundColor Cyan
    Write-Host "─────────────────────" -ForegroundColor Cyan
    
    try {
        $envFile = Join-Path (Split-Path -Parent $PSScriptRoot) ".env"
        if (Test-Path $envFile) {
            $envContent = Get-Content $envFile -Raw
            
            $httpPort = if ($envContent -match "HTTP_PORT=(\d+)") { $matches[1] } else { "8000" }
            $httpsPort = if ($envContent -match "HTTPS_PORT=(\d+)") { $matches[1] } else { "8443" }
            $disableHttps = $envContent -match "DISABLE_HTTPS=1"
            
            Write-Host "  HTTP:  " -NoNewline
            Write-Host "http://localhost:$httpPort" -ForegroundColor Yellow
            
            if (-not $disableHttps) {
                Write-Host "  HTTPS: " -NoNewline
                Write-Host "https://localhost:$httpsPort" -ForegroundColor Yellow
            }
            
            # Check JVB advertise IPs
            if ($envContent -match "JVB_ADVERTISE_IPS=(.+)") {
                $advertiseIPs = $matches[1].Trim()
                if ($advertiseIPs -ne "") {
                    Write-Host "  External IPs: " -NoNewline
                    Write-Host "$advertiseIPs" -ForegroundColor Green
                }
            } else {
                Write-Warning "JVB_ADVERTISE_IPS not configured (external access limited)"
            }
        }
    } catch {}
    
    Write-Host ""
    
    # ========================================================================
    # QUICK ACTIONS
    # ========================================================================
    Write-Host "⚡ Quick Actions" -ForegroundColor Cyan
    Write-Host "───────────────" -ForegroundColor Cyan
    Write-Host "  View logs:    " -NoNewline
    Write-Host "docker compose logs -f" -ForegroundColor Yellow
    Write-Host "  Restart JVB:  " -NoNewline
    Write-Host "docker compose restart jvb" -ForegroundColor Yellow
    Write-Host "  Stop all:     " -NoNewline
    Write-Host "docker compose down" -ForegroundColor Yellow
    Write-Host "  Validation:   " -NoNewline
    Write-Host ".\scripts\validate-config.ps1" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    
    if ($Watch) {
        Write-Host ""
        Write-Host "Refreshing in $Interval seconds... (Press Ctrl+C to stop)" -ForegroundColor Gray
    }
}

# Main execution
if ($Watch) {
    Write-Info "Starting health monitor in watch mode (interval: ${Interval}s)"
    Write-Info "Press Ctrl+C to stop"
    Write-Host ""
    Start-Sleep -Seconds 2
    
    while ($true) {
        Show-HealthStatus
        Start-Sleep -Seconds $Interval
    }
} else {
    Show-HealthStatus
}
