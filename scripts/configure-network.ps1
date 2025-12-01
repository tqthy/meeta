# configure-network.ps1
# Auto-detect network configuration and update JVB_ADVERTISE_IPS for Jitsi Meet
# Usage: .\scripts\configure-network.ps1 [-LocalOnly] [-InternetFacing]

param(
    [switch]$LocalOnly,
    [switch]$InternetFacing,
    [switch]$SkipValidation,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Color output helpers
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }

# Banner
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Jitsi Meet Network Configuration" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running from correct directory
$scriptDir = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $scriptDir ".env"

if (-not (Test-Path $envFile)) {
    Write-Error ".env file not found at: $envFile"
    Write-Info "Please run this script from the meeta directory"
    exit 1
}

# Function to get public IP
function Get-PublicIP {
    Write-Info "Detecting public IP address..."
    
    $services = @(
        "https://ifconfig.me/ip",
        "https://icanhazip.com",
        "https://ipecho.net/plain",
        "https://api.ipify.org"
    )
    
    foreach ($service in $services) {
        try {
            $ip = (Invoke-RestMethod -Uri $service -TimeoutSec 5).Trim()
            if ($ip -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$') {
                Write-Success "Public IP detected: $ip"
                return $ip
            }
        } catch {
            continue
        }
    }
    
    Write-Warning "Could not detect public IP address"
    return $null
}

# Function to get local IP
function Get-LocalIP {
    Write-Info "Detecting local IP address..."
    
    try {
        # Get the active network adapter with internet connectivity
        $adapter = Get-NetIPConfiguration | 
                   Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq "Up" } |
                   Select-Object -First 1
        
        if ($adapter) {
            $ip = $adapter.IPv4Address.IPAddress
            Write-Success "Local IP detected: $ip"
            return $ip
        }
    } catch {
        Write-Warning "Error detecting local IP: $_"
    }
    
    # Fallback: try to get any non-loopback IPv4 address
    try {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 | 
               Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } |
               Select-Object -First 1).IPAddress
        
        if ($ip) {
            Write-Success "Local IP detected (fallback): $ip"
            return $ip
        }
    } catch {}
    
    Write-Warning "Could not detect local IP address"
    return $null
}

# Function to test UDP port accessibility
function Test-UDPPort {
    param([string]$Port = "10000")
    
    Write-Info "Checking if UDP port $Port is available..."
    
    try {
        $listener = New-Object System.Net.Sockets.UdpClient $Port
        $listener.Close()
        Write-Success "UDP port $Port is available"
        return $true
    } catch {
        Write-Warning "UDP port $Port is already in use or inaccessible"
        return $false
    }
}

# Function to test STUN server connectivity
function Test-StunServer {
    param([string]$StunServer = "meet.jit.si:443")
    
    Write-Info "Testing STUN server connectivity to $StunServer..."
    
    try {
        $host, $port = $StunServer -split ':'
        if (-not $port) { $port = 3478 }
        
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($host, $port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)
        
        if ($wait) {
            $tcpClient.EndConnect($connect)
            $tcpClient.Close()
            Write-Success "STUN server is reachable"
            return $true
        } else {
            $tcpClient.Close()
            Write-Warning "STUN server is not reachable (timeout)"
            return $false
        }
    } catch {
        Write-Warning "Cannot reach STUN server: $_"
        return $false
    }
}

# Main configuration logic
Write-Host "🔍 Network Detection" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

# Detect IPs
$publicIP = Get-PublicIP
$localIP = Get-LocalIP

Write-Host ""

# Determine configuration mode
if (-not $LocalOnly -and -not $InternetFacing) {
    Write-Host "🤔 Configuration Mode Selection" -ForegroundColor Cyan
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Local Network Only" -ForegroundColor White
    Write-Host "   - Use local IP only (e.g., 192.168.x.x)"
    Write-Host "   - Best for: Development, LAN meetings"
    Write-Host "   - External participants: ✗ Cannot join"
    Write-Host ""
    Write-Host "2. Internet Facing" -ForegroundColor White
    Write-Host "   - Use public IP (and optionally local IP)"
    Write-Host "   - Best for: Production, remote participants"
    Write-Host "   - External participants: ✓ Can join"
    Write-Host ""
    
    $choice = Read-Host "Select mode (1 or 2)"
    
    if ($choice -eq "1") {
        $LocalOnly = $true
    } elseif ($choice -eq "2") {
        $InternetFacing = $true
    } else {
        Write-Error "Invalid choice. Exiting."
        exit 1
    }
    Write-Host ""
}

# Build IP configuration
$advertiseIPs = @()

if ($InternetFacing) {
    if (-not $publicIP) {
        Write-Error "Public IP could not be detected and is required for Internet-facing configuration"
        Write-Info "You can manually set JVB_ADVERTISE_IPS in .env file"
        exit 1
    }
    
    $advertiseIPs += $publicIP
    
    # Ask if local IP should also be included (for LAN optimization)
    if ($localIP) {
        Write-Host "💡 Including local IP allows LAN clients to connect directly (faster)"
        $includeLAN = Read-Host "Include local IP ($localIP) for LAN optimization? (y/n)"
        if ($includeLAN -eq "y") {
            $advertiseIPs += $localIP
        }
    }
} elseif ($LocalOnly) {
    if (-not $localIP) {
        Write-Error "Local IP could not be detected"
        Write-Info "Please ensure your network adapter is connected"
        exit 1
    }
    
    $advertiseIPs += $localIP
}

$advertiseIPsValue = $advertiseIPs -join ","

Write-Host ""
Write-Host "📋 Configuration Summary" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "JVB_ADVERTISE_IPS will be set to: " -NoNewline
Write-Host "$advertiseIPsValue" -ForegroundColor Green
Write-Host ""

if ($InternetFacing) {
    Write-Warning "IMPORTANT: Ensure UDP port 10000 is forwarded in your router/firewall!"
    Write-Warning "           Otherwise, external participants won't be able to connect."
    Write-Host ""
}

# Validation checks (unless skipped)
if (-not $SkipValidation) {
    Write-Host "🔬 Validation Checks" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    Write-Host ""
    
    Test-UDPPort -Port "10000"
    Test-StunServer -StunServer "meet.jit.si:443"
    Write-Host ""
}

# Confirm before updating
if (-not $Force) {
    $confirm = Read-Host "Update .env file with this configuration? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Info "Operation cancelled."
        exit 0
    }
    Write-Host ""
}

# Update .env file
Write-Info "Updating .env file..."

try {
    $envContent = Get-Content $envFile -Raw
    
    # Create backup
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$envFile.backup.$timestamp"
    Copy-Item $envFile $backupFile
    Write-Success "Created backup: $backupFile"
    
    # Update or add JVB_ADVERTISE_IPS
    $pattern = "(?m)^(JVB_ADVERTISE_IPS=).*$"
    
    if ($envContent -match $pattern) {
        $envContent = $envContent -replace $pattern, "`${1}$advertiseIPsValue"
        Write-Success "Updated existing JVB_ADVERTISE_IPS"
    } else {
        # Add to end of file
        if (-not $envContent.EndsWith("`n")) {
            $envContent += "`n"
        }
        $envContent += "JVB_ADVERTISE_IPS=$advertiseIPsValue`n"
        Write-Success "Added JVB_ADVERTISE_IPS to .env"
    }
    
    Set-Content -Path $envFile -Value $envContent -NoNewline
    Write-Success "Configuration saved to .env file"
    
} catch {
    Write-Error "Failed to update .env file: $_"
    exit 1
}

Write-Host ""
Write-Host "✅ Network configuration complete!" -ForegroundColor Green
Write-Host ""

# Next steps
Write-Info "Next Steps:"
Write-Host "  1. Restart JVB service: " -NoNewline
Write-Host "docker compose restart jvb" -ForegroundColor Yellow
Write-Host "  2. Verify configuration: " -NoNewline
Write-Host "docker compose logs jvb | Select-String 'Discovered public address'" -ForegroundColor Yellow

if ($InternetFacing) {
    Write-Host "  3. Configure port forwarding: " -NoNewline
    Write-Host "UDP port 10000 → $($advertiseIPs[0])" -ForegroundColor Yellow
    Write-Host "  4. Test external access from another network"
}

Write-Host ""
