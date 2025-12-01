# gen-passwords.ps1
# Generate secure random passwords for Jitsi Meet services and update .env file
# Usage: .\scripts\gen-passwords.ps1

param(
    [switch]$Force,
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"

# Color output helpers
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }

# Banner
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Jitsi Meet Password Generator" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if running from correct directory
$scriptDir = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $scriptDir ".env"

if (-not (Test-Path $envFile)) {
    Write-Error ".env file not found at: $envFile"
    Write-Info "Please run this script from the meeta directory or create .env from .env.example"
    exit 1
}

Write-Info "Found .env file: $envFile"
Write-Host ""

# Function to generate secure random password (32 hex characters)
function New-SecurePassword {
    $bytes = New-Object byte[] 16
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return [System.BitConverter]::ToString($bytes).Replace("-", "").ToLower()
}

# Read current .env file
$envContent = Get-Content $envFile -Raw

# Define password variables to generate
$passwordVars = @(
    @{Name="JICOFO_AUTH_PASSWORD"; Description="Jicofo authentication password"},
    @{Name="JVB_AUTH_PASSWORD"; Description="JVB authentication password"},
    @{Name="JIGASI_XMPP_PASSWORD"; Description="Jigasi XMPP password"},
    @{Name="JIBRI_RECORDER_PASSWORD"; Description="Jibri recorder password"},
    @{Name="JIBRI_XMPP_PASSWORD"; Description="Jibri XMPP password"},
    @{Name="JIGASI_TRANSCRIBER_PASSWORD"; Description="Jigasi transcriber password"}
)

# Check if passwords already exist
$existingPasswords = @()
foreach ($var in $passwordVars) {
    $pattern = "$($var.Name)=(.+)"
    if ($envContent -match $pattern) {
        $currentValue = $matches[1].Trim()
        if ($currentValue -ne "" -and $currentValue -ne "changeme") {
            $existingPasswords += $var.Name
        }
    }
}

if ($existingPasswords.Count -gt 0 -and -not $Force) {
    Write-Warning "The following passwords are already set:"
    foreach ($pw in $existingPasswords) {
        Write-Host "  - $pw" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Warning "Use -Force to overwrite existing passwords"
    Write-Host ""
    $response = Read-Host "Do you want to overwrite all passwords? (yes/no)"
    if ($response -ne "yes") {
        Write-Info "Operation cancelled."
        exit 0
    }
}

# Create backup unless skipped
if (-not $SkipBackup) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$envFile.backup.$timestamp"
    Copy-Item $envFile $backupFile
    Write-Success "Created backup: $backupFile"
    Write-Host ""
}

# Generate and replace passwords
Write-Info "Generating secure passwords..."
Write-Host ""

$updated = 0
$newEnvContent = $envContent

foreach ($var in $passwordVars) {
    $newPassword = New-SecurePassword
    Write-Host "  ⚙ $($var.Name)" -ForegroundColor Gray -NoNewline
    
    # Pattern to match the variable (handles empty values, 'changeme', or existing passwords)
    $pattern = "(?m)^($($var.Name)=).*$"
    
    if ($newEnvContent -match $pattern) {
        $newEnvContent = $newEnvContent -replace $pattern, "`${1}$newPassword"
        $updated++
        Write-Host " → " -NoNewline
        Write-Host "Updated" -ForegroundColor Green
    } else {
        Write-Warning "  Variable $($var.Name) not found in .env file"
    }
}

Write-Host ""

if ($updated -gt 0) {
    # Write updated content back to .env file
    Set-Content -Path $envFile -Value $newEnvContent -NoNewline
    Write-Success "Successfully updated $updated password(s) in .env file"
    Write-Host ""
    
    # Display summary
    Write-Info "Password Summary:"
    foreach ($var in $passwordVars) {
        $pattern = "$($var.Name)=(.+)"
        if ($newEnvContent -match $pattern) {
            $value = $matches[1].Trim()
            if ($value -ne "" -and $value -ne "changeme") {
                $masked = $value.Substring(0, 8) + "..." + $value.Substring($value.Length - 4)
                Write-Host "  $($var.Name): " -NoNewline
                Write-Host "$masked" -ForegroundColor Green
            }
        }
    }
    
    Write-Host ""
    Write-Success "Passwords have been generated and saved to .env"
    Write-Info "You can now start the services with: docker compose up -d"
    
    # Security reminder
    Write-Host ""
    Write-Warning "IMPORTANT: Keep your .env file secure and never commit it to version control!"
} else {
    Write-Warning "No passwords were updated"
    exit 1
}

Write-Host ""
