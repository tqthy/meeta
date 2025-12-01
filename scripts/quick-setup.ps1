# quick-setup.ps1
# Interactive first-time setup wizard for Jitsi Meet Docker deployment
# Usage: .\scripts\quick-setup.ps1 [-SkipValidation] [-AutoStart]

param(
    [switch]$SkipValidation,
    [switch]$AutoStart
)

$ErrorActionPreference = "Stop"

# Color output helpers
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }
function Write-Step { Write-Host "`n━━━ $args ━━━" -ForegroundColor Cyan }

# Banner
Clear-Host
Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Jitsi Meet Quick Setup Wizard       ║" -ForegroundColor Cyan
Write-Host "║   Interactive Deployment Assistant    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $scriptDir ".env"
$envExampleFile = Join-Path $scriptDir ".env.example"
$dockerComposeFile = Join-Path $scriptDir "docker-compose.yml"

# Track setup progress
$setupSteps = @{
    "PreChecks" = $false
    "EnvFile" = $false
    "Passwords" = $false
    "Network" = $false
    "Validation" = $false
    "Images" = $false
    "Start" = $false
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================
Write-Step "Step 1/7: Pre-Flight Checks"

Write-Info "Checking prerequisites..."

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed!"
    Write-Host ""
    Write-Info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
}
Write-Success "Docker is installed"

# Check Docker daemon
try {
    docker info | Out-Null
    Write-Success "Docker daemon is running"
} catch {
    Write-Error "Docker daemon is not running!"
    Write-Info "Please start Docker Desktop and try again"
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker compose version 2>&1
    Write-Success "Docker Compose is available ($composeVersion)"
} catch {
    Write-Error "Docker Compose is not available!"
    Write-Info "Please update Docker Desktop to get Compose v2"
    exit 1
}

# Check files
if (-not (Test-Path $dockerComposeFile)) {
    Write-Error "docker-compose.yml not found!"
    Write-Info "Please run this script from the meeta directory"
    exit 1
}
Write-Success "docker-compose.yml found"

if (-not (Test-Path $envExampleFile)) {
    Write-Warning ".env.example not found (will continue without template)"
} else {
    Write-Success ".env.example found"
}

$setupSteps["PreChecks"] = $true
Write-Host ""
Write-Success "Pre-flight checks complete!"

# ============================================================================
# ENVIRONMENT FILE SETUP
# ============================================================================
Write-Step "Step 2/7: Environment File Setup"

if (Test-Path $envFile) {
    Write-Warning ".env file already exists"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor White
    Write-Host "  1. Keep existing (recommended if already configured)"
    Write-Host "  2. Create backup and reset from template"
    Write-Host "  3. Abort setup"
    Write-Host ""
    
    $choice = Read-Host "Select option (1-3)"
    
    switch ($choice) {
        "1" {
            Write-Success "Keeping existing .env file"
            $setupSteps["EnvFile"] = $true
        }
        "2" {
            $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
            $backupFile = "$envFile.backup.$timestamp"
            Copy-Item $envFile $backupFile
            Write-Success "Backed up to: $backupFile"
            
            if (Test-Path $envExampleFile) {
                Copy-Item $envExampleFile $envFile
                Write-Success "Created fresh .env from template"
                $setupSteps["EnvFile"] = $true
            } else {
                Write-Error "Cannot create .env: template not found"
                exit 1
            }
        }
        "3" {
            Write-Info "Setup aborted"
            exit 0
        }
        default {
            Write-Error "Invalid option"
            exit 1
        }
    }
} else {
    Write-Info "Creating .env file from template..."
    
    if (Test-Path $envExampleFile) {
        Copy-Item $envExampleFile $envFile
        Write-Success "Created .env from .env.example"
        $setupSteps["EnvFile"] = $true
    } else {
        Write-Error ".env.example not found!"
        Write-Info "Please create .env file manually"
        exit 1
    }
}

Write-Host ""

# ============================================================================
# PASSWORD GENERATION
# ============================================================================
Write-Step "Step 3/7: Password Generation"

Write-Info "Jitsi requires secure passwords for internal services"
Write-Host ""

$envContent = Get-Content $envFile -Raw
$hasPasswords = $false

# Check if passwords already exist
$passwordVars = @("JICOFO_AUTH_PASSWORD", "JVB_AUTH_PASSWORD")
foreach ($var in $passwordVars) {
    if ($envContent -match "$var=(.+)") {
        $value = $matches[1].Trim()
        if ($value -ne "" -and $value -ne "changeme") {
            $hasPasswords = $true
            break
        }
    }
}

if ($hasPasswords) {
    Write-Warning "Passwords appear to be already set"
    $regenerate = Read-Host "Regenerate all passwords? (y/n)"
    
    if ($regenerate -eq "y") {
        Write-Info "Running password generator..."
        & "$scriptDir\scripts\gen-passwords.ps1" -Force
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Passwords generated successfully"
            $setupSteps["Passwords"] = $true
        } else {
            Write-Error "Password generation failed"
            exit 1
        }
    } else {
        Write-Success "Keeping existing passwords"
        $setupSteps["Passwords"] = $true
    }
} else {
    Write-Info "Generating secure passwords..."
    & "$scriptDir\scripts\gen-passwords.ps1"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Passwords generated successfully"
        $setupSteps["Passwords"] = $true
    } else {
        Write-Error "Password generation failed"
        exit 1
    }
}

Write-Host ""

# ============================================================================
# NETWORK CONFIGURATION
# ============================================================================
Write-Step "Step 4/7: Network Configuration"

Write-Info "Configuring network settings for Jitsi Video Bridge..."
Write-Host ""

Write-Host "Network Mode Selection:" -ForegroundColor White
Write-Host "  1. Local Development (localhost only)" -ForegroundColor White
Write-Host "     - Best for testing on your machine"
Write-Host "     - External participants cannot join"
Write-Host ""
Write-Host "  2. LAN/Local Network (192.168.x.x)" -ForegroundColor White
Write-Host "     - Best for office/home network meetings"
Write-Host "     - Participants on same network can join"
Write-Host ""
Write-Host "  3. Internet Facing (public IP)" -ForegroundColor White
Write-Host "     - Best for production deployment"
Write-Host "     - Anyone on internet can join"
Write-Host "     - Requires port forwarding"
Write-Host ""
Write-Host "  4. Skip (configure manually later)" -ForegroundColor Gray
Write-Host ""

$networkChoice = Read-Host "Select mode (1-4)"

switch ($networkChoice) {
    "1" {
        Write-Info "Configuring for localhost..."
        # Don't set JVB_ADVERTISE_IPS for localhost
        Write-Success "Localhost configuration (no external access)"
        $setupSteps["Network"] = $true
    }
    "2" {
        Write-Info "Running network configuration..."
        & "$scriptDir\scripts\configure-network.ps1" -LocalOnly
        if ($LASTEXITCODE -eq 0) {
            Write-Success "LAN network configured"
            $setupSteps["Network"] = $true
        }
    }
    "3" {
        Write-Info "Running network configuration..."
        & "$scriptDir\scripts\configure-network.ps1" -InternetFacing
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Internet-facing network configured"
            $setupSteps["Network"] = $true
        }
    }
    "4" {
        Write-Warning "Network configuration skipped"
        Write-Info "Run .\scripts\configure-network.ps1 later to configure"
        $setupSteps["Network"] = $true
    }
    default {
        Write-Warning "Invalid choice, skipping network configuration"
        $setupSteps["Network"] = $true
    }
}

Write-Host ""

# ============================================================================
# CONFIGURATION VALIDATION
# ============================================================================
Write-Step "Step 5/7: Configuration Validation"

if ($SkipValidation) {
    Write-Warning "Validation skipped (use -SkipValidation flag)"
    $setupSteps["Validation"] = $true
} else {
    Write-Info "Running comprehensive validation..."
    Write-Host ""
    
    & "$scriptDir\scripts\validate-config.ps1"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Configuration validation passed"
        $setupSteps["Validation"] = $true
    } else {
        Write-Error "Configuration validation failed"
        Write-Host ""
        $continue = Read-Host "Continue anyway? (yes/no)"
        if ($continue -eq "yes") {
            Write-Warning "Continuing with validation warnings..."
            $setupSteps["Validation"] = $true
        } else {
            Write-Info "Setup aborted. Please fix validation errors."
            exit 1
        }
    }
}

Write-Host ""

# ============================================================================
# DOCKER IMAGE PULL
# ============================================================================
Write-Step "Step 6/7: Docker Image Preparation"

Write-Info "Pulling Docker images (this may take several minutes)..."
Write-Host ""

try {
    docker compose pull
    Write-Success "Docker images pulled successfully"
    $setupSteps["Images"] = $true
} catch {
    Write-Error "Failed to pull Docker images: $_"
    Write-Warning "You can try starting anyway - images will be pulled on first run"
    $setupSteps["Images"] = $false
}

Write-Host ""

# ============================================================================
# SERVICE STARTUP
# ============================================================================
Write-Step "Step 7/7: Service Startup"

$startNow = $AutoStart
if (-not $AutoStart) {
    Write-Host "Configuration complete! Ready to start services." -ForegroundColor Green
    Write-Host ""
    $response = Read-Host "Start Jitsi Meet services now? (yes/no)"
    $startNow = ($response -eq "yes")
}

if ($startNow) {
    Write-Info "Starting services in detached mode..."
    Write-Host ""
    
    try {
        docker compose up -d
        Write-Success "Services started successfully!"
        $setupSteps["Start"] = $true
        
        Write-Host ""
        Write-Info "Waiting for services to initialize (30 seconds)..."
        Start-Sleep -Seconds 5
        
        Write-Host ""
        Write-Info "Service Status:"
        docker compose ps
        
        Write-Host ""
        Write-Success "Jitsi Meet is starting up!"
        Write-Host ""
        Write-Info "Access your Jitsi Meet instance:"
        
        $envContent = Get-Content $envFile -Raw
        $httpPort = if ($envContent -match "HTTP_PORT=(\d+)") { $matches[1] } else { "8000" }
        
        Write-Host "  → " -NoNewline
        Write-Host "http://localhost:$httpPort" -ForegroundColor Yellow
        Write-Host ""
        Write-Info "Monitor health status:"
        Write-Host "  → " -NoNewline
        Write-Host ".\scripts\health-check.ps1" -ForegroundColor Yellow
        Write-Host ""
        Write-Info "View logs:"
        Write-Host "  → " -NoNewline
        Write-Host "docker compose logs -f" -ForegroundColor Yellow
        
    } catch {
        Write-Error "Failed to start services: $_"
        $setupSteps["Start"] = $false
    }
} else {
    Write-Info "Services not started"
    Write-Host ""
    Write-Host "To start services manually:" -ForegroundColor Cyan
    Write-Host "  docker compose up -d" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# SETUP SUMMARY
# ============================================================================
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Setup Summary                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

foreach ($step in $setupSteps.Keys | Sort-Object) {
    $status = if ($setupSteps[$step]) { "✓" } else { "✗" }
    $color = if ($setupSteps[$step]) { "Green" } else { "Red" }
    Write-Host "  $status $step" -ForegroundColor $color
}

Write-Host ""

$completedSteps = ($setupSteps.Values | Where-Object { $_ -eq $true }).Count
$totalSteps = $setupSteps.Count
$completionRate = [math]::Round(($completedSteps / $totalSteps) * 100)

Write-Host "Completion: $completedSteps/$totalSteps steps ($completionRate%)" -ForegroundColor $(if($completionRate -eq 100){"Green"}elseif($completionRate -ge 70){"Yellow"}else{"Red"})

if ($completionRate -eq 100) {
    Write-Host ""
    Write-Success "🎉 Setup completed successfully!"
    Write-Host ""
    Write-Info "Next Steps:"
    Write-Host "  1. Wait 30-60 seconds for services to fully start"
    Write-Host "  2. Check health: " -NoNewline
    Write-Host ".\scripts\health-check.ps1" -ForegroundColor Yellow
    Write-Host "  3. Create your first meeting room!"
} else {
    Write-Host ""
    Write-Warning "⚠ Setup completed with warnings"
    Write-Info "Review the steps above and re-run if needed"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Thank you for using Jitsi Meet! 🎥" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
