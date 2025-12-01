# Comprehensive Jitsi Configuration Validation Script
# Validates environment, Docker setup, network config, and more
# Usage: .\scripts\validate-config.ps1 [-Verbose]

param(
    [switch]$Verbose
)

# Color output functions
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }

# Validation function
function Test-Validation {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$FailureMessage = ""
    )
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host "[PASS] $Name" -ForegroundColor Green
            $script:passedChecks++
            return $true
        } else {
            Write-Host "[FAIL] $Name" -ForegroundColor Red
            if ($FailureMessage) {
                Write-Host "       $FailureMessage" -ForegroundColor Yellow
            }
            $script:errors++
            return $false
        }
    } catch {
        Write-Host "[FAIL] $Name" -ForegroundColor Red
        Write-Host "       Error: $($_.Exception.Message)" -ForegroundColor Yellow
        $script:errors++
        return $false
    }
}

# Initialize counters
$script:passedChecks = 0
$script:warnings = 0
$script:errors = 0
$script:totalChecks = 0

Write-Host ""
Write-Host "===========================================  " -ForegroundColor Cyan
Write-Host "  Jitsi Docker Configuration Validation" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# 1. File Existence Checks
Write-Info "1. Checking Required Files..."
$script:totalChecks++
Test-Validation -Name "  .env file exists" -Test {
    Test-Path ".env"
} -FailureMessage "Run: cp env.example .env"

$script:totalChecks++
Test-Validation -Name "  docker-compose.yml exists" -Test {
    Test-Path "docker-compose.yml"
} -FailureMessage "Missing docker-compose.yml"

# 2. Environment Variable Checks
Write-Host ""
Write-Info "2. Checking Environment Variables..."

# Load .env file
if (Test-Path ".env") {
    $envContent = Get-Content ".env" | Where-Object { $_ -match '=' -and $_ -notmatch '^\s*#' }
    $envVars = @{}
    foreach ($line in $envContent) {
        if ($line -match '^([^=]+)=(.*)$') {
            $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
        }
    }
}

$requiredPasswords = @(
    "JICOFO_AUTH_PASSWORD",
    "JVB_AUTH_PASSWORD"
)

foreach ($pwd in $requiredPasswords) {
    $script:totalChecks++
    Test-Validation -Name "  $pwd is set" -Test {
        if ($envVars.ContainsKey($pwd)) {
            $value = $envVars[$pwd]
            return ($value -ne "" -and $value -ne "changeme")
        }
        return $false
    } -FailureMessage "Run: .\scripts\gen-passwords.ps1"
}

# 3. Docker Environment Checks
Write-Host ""
Write-Info "3. Checking Docker Environment..."

$script:totalChecks++
Test-Validation -Name "  Docker is installed" -Test {
    $null = Get-Command docker -ErrorAction SilentlyContinue
    return $?
} -FailureMessage "Install Docker Desktop"

$script:totalChecks++
Test-Validation -Name "  Docker daemon is running" -Test {
    try {
        $null = docker ps 2>$null
        return $?
    } catch {
        return $false
    }
} -FailureMessage "Start Docker Desktop"

$script:totalChecks++
Test-Validation -Name "  Docker Compose v2 available" -Test {
    try {
        $output = docker compose version 2>$null
        return $output -match "v2\."
    } catch {
        return $false
    }
}

# 4. Port Availability Checks
Write-Host ""
Write-Info "4. Checking Port Availability..."

$portsToCheck = @{
    "8000" = "HTTP"
    "8443" = "HTTPS"
    "10000" = "JVB UDP"
}

foreach ($port in $portsToCheck.Keys) {
    $script:totalChecks++
    $serviceName = $portsToCheck[$port]
    Test-Validation -Name "  Port $port ($serviceName) available" -Test {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        return $connections.Count -eq 0
    } -FailureMessage "Port $port is in use"
}

# 5. Configuration Directory Checks
Write-Host ""
Write-Info "5. Checking Configuration Directories..."

$script:totalChecks++
Test-Validation -Name "  CONFIG path is valid" -Test {
    if ($envVars.ContainsKey("CONFIG")) {
        $configPath = $envVars["CONFIG"]
        return Test-Path $configPath
    }
    return $false
}

# 6. Network Configuration Checks
Write-Host ""
Write-Info "6. Checking Network Configuration..."

$script:totalChecks++
Test-Validation -Name "  JVB_ADVERTISE_IPS configured" -Test {
    if ($envVars.ContainsKey("JVB_ADVERTISE_IPS")) {
        $value = $envVars["JVB_ADVERTISE_IPS"]
        return $value -ne ""
    }
    return $false
} -FailureMessage "Run: .\scripts\configure-network.ps1"

$script:totalChecks++
Test-Validation -Name "  XMPP domains configured" -Test {
    if ($envVars.ContainsKey("XMPP_DOMAIN")) {
        $value = $envVars["XMPP_DOMAIN"]
        return $value -ne ""
    }
    return $false
}

# Summary
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Validation Summary" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$passRate = [math]::Round(($passedChecks / $totalChecks) * 100, 1)

Write-Host "Total Checks: " -NoNewline
Write-Host "$totalChecks" -ForegroundColor White
Write-Host "Passed: " -NoNewline
$passText = "$passedChecks ($passRate%)"
Write-Success $passText
Write-Host "Warnings: " -NoNewline
Write-Host "$warnings" -ForegroundColor $(if($warnings -gt 0){"Yellow"}else{"Gray"})
Write-Host "Errors: " -NoNewline
Write-Host "$errors" -ForegroundColor $(if($errors -gt 0){"Red"}else{"Gray"})
Write-Host ""

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Success "All checks passed! Your configuration is ready for deployment."
    Write-Host ""
    Write-Info "Next Steps:"
    Write-Host "  1. Start services: docker compose up -d"
    Write-Host "  2. Monitor startup: .\scripts\health-check.ps1"
    if ($envVars.ContainsKey("HTTP_PORT")) {
        $httpPort = $envVars["HTTP_PORT"]
        Write-Host "  3. Access Jitsi: http://localhost:$httpPort"
    }
} elseif ($errors -eq 0) {
    Write-Warning "Configuration is functional but has warnings."
    Write-Host ""
    Write-Info "You can proceed, but consider fixing warnings for better reliability."
    Write-Host "Start services: docker compose up -d"
} else {
    Write-Error "Configuration has critical errors that must be fixed."
    Write-Host ""
    Write-Info "Please fix the errors above before starting services."
    exit 1
}

Write-Host ""
