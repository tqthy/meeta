# Jitsi Meet Management Scripts

This directory contains PowerShell scripts for managing and monitoring your Jitsi Meet Docker deployment.

## Quick Start

### First-Time Setup

```powershell
# Run the interactive setup wizard
.\scripts\quick-setup.ps1
```

This will guide you through:

1. Environment file creation
2. Password generation
3. Network configuration
4. Validation checks
5. Image pulling
6. Service startup

### Manual Setup Steps

If you prefer manual setup:

```powershell
# 1. Create environment file
Copy-Item .env.example .env

# 2. Generate passwords
.\scripts\gen-passwords.ps1

# 3. Configure network
.\scripts\configure-network.ps1

# 4. Validate configuration
.\scripts\validate-config.ps1

# 5. Start services
docker compose up -d

# 6. Monitor health
.\scripts\health-check.ps1 -Watch
```

## Script Reference

### quick-setup.ps1

**Interactive first-time deployment wizard**

```powershell
# Standard setup
.\scripts\quick-setup.ps1

# Skip validation checks
.\scripts\quick-setup.ps1 -SkipValidation

# Auto-start services after setup
.\scripts\quick-setup.ps1 -AutoStart
```

**Features:**

- Pre-flight checks (Docker, files, etc.)
- Environment file management
- Password generation
- Network configuration wizard
- Comprehensive validation
- Docker image pulling
- Service startup
- Progress tracking

**When to use:** First deployment or clean reinstall

---

### gen-passwords.ps1

**Secure password generation for Jitsi services**

```powershell
# Generate passwords (prompts if existing)
.\scripts\gen-passwords.ps1

# Force overwrite existing passwords
.\scripts\gen-passwords.ps1 -Force

# Skip backup creation
.\scripts\gen-passwords.ps1 -SkipBackup
```

**Generated passwords:**

- `JICOFO_AUTH_PASSWORD` - Jicofo authentication
- `JVB_AUTH_PASSWORD` - Video bridge authentication
- `JIGASI_XMPP_PASSWORD` - SIP gateway
- `JIBRI_RECORDER_PASSWORD` - Recording service
- `JIBRI_XMPP_PASSWORD` - Recording XMPP
- `JIGASI_TRANSCRIBER_PASSWORD` - Transcription service

**Features:**

- Cryptographically secure (RNGCryptoServiceProvider)
- 32-character hex passwords
- Automatic .env file backup
- Validation of password strength
- Masked password display

**When to use:**

- First setup
- Password rotation
- After security breach

---

### configure-network.ps1

**Network configuration and IP detection**

```powershell
# Interactive mode (recommended)
.\scripts\configure-network.ps1

# Local network only (LAN)
.\scripts\configure-network.ps1 -LocalOnly

# Internet-facing with public IP
.\scripts\configure-network.ps1 -InternetFacing

# Skip validation tests
.\scripts\configure-network.ps1 -SkipValidation

# Auto-confirm changes
.\scripts\configure-network.ps1 -Force
```

**Features:**

- Auto-detect public IP (via ifconfig.me, ipecho.net, etc.)
- Auto-detect local network IP
- UDP port availability check
- STUN server connectivity test
- Automatic .env file backup
- JVB_ADVERTISE_IPS configuration

**Configuration modes:**

- **Local Only**: LAN development (192.168.x.x)
- **Internet Facing**: Production with public IP
- **Hybrid**: Both public and local IPs (optimal)

**When to use:**

- Deployment to new network
- Moving from dev to production
- NAT/firewall configuration changes
- External access issues

---

### validate-config.ps1

**Comprehensive configuration validation**

```powershell
# Standard validation
.\scripts\validate-config.ps1

# Detailed output with verbose info
.\scripts\validate-config.ps1 -Verbose
```

**Validation checks:**

1. **File Existence**

   - .env file
   - docker-compose.yml
   - .env.example

2. **Environment Variables**

   - Required passwords set
   - Configuration variables
   - Password strength (min 16 chars)

3. **Docker Environment**

   - Docker installed
   - Docker daemon running
   - Compose v2 available
   - Adequate resources (4GB+ RAM)

4. **Port Availability**

   - HTTP port (default 8000)
   - HTTPS port (default 8443)
   - PostgreSQL (5431)
   - Redis (6380)
   - JVB UDP (10000)

5. **Configuration Directories**

   - CONFIG path validity
   - Required subdirectories

6. **Network Configuration**

   - JVB_ADVERTISE_IPS set
   - XMPP domains configured
   - Internet connectivity

7. **Optional Features**
   - Authentication status
   - Lobby enabled
   - Recording configured
   - Let's Encrypt status

**Exit codes:**

- `0` - All checks passed
- `1` - Critical errors found

**When to use:**

- Before starting services
- After configuration changes
- Troubleshooting issues
- Pre-deployment verification

---

### health-check.ps1

**Real-time health monitoring and diagnostics**

```powershell
# One-time health check
.\scripts\health-check.ps1

# Continuous monitoring (default 5s interval)
.\scripts\health-check.ps1 -Watch

# Custom refresh interval
.\scripts\health-check.ps1 -Watch -Interval 10

# Detailed mode with JVB statistics
.\scripts\health-check.ps1 -Detailed

# Combined: watch + detailed
.\scripts\health-check.ps1 -Watch -Detailed -Interval 3
```

**Monitoring features:**

1. **Container Status**

   - Running state
   - Health status (healthy/unhealthy/starting)
   - Resource usage summary

2. **Service Health Endpoints**

   - JVB Colibri API (localhost:8080)
   - JVB Public API (localhost:9090)
   - Jicofo REST API (localhost:8888)
   - Web frontend (localhost:8000)

3. **XMPP Connection Status**

   - Prosody server status
   - Jicofo XMPP connection
   - JVB brewery MUC membership
   - Jicofo-JVB registration

4. **Resource Usage**

   - CPU percentage per container
   - Memory usage per container
   - Color-coded alerts (yellow >50% CPU, >80% memory)

5. **JVB Statistics** (Detailed mode)

   - Active conferences
   - Participant count
   - Video streams
   - Stress level

6. **Recent Errors**

   - Last 3 minutes of error logs
   - Pattern matching: ERROR, FATAL, SEVERE, Exception
   - Limited to 10 most recent

7. **Access Information**
   - HTTP/HTTPS URLs
   - External IP configuration
   - Quick action commands

**When to use:**

- After starting services
- Troubleshooting issues
- Production monitoring
- Performance analysis
- Conference quality issues

---

## Common Workflows

### New Deployment

```powershell
# Option 1: Automated
.\scripts\quick-setup.ps1 -AutoStart

# Option 2: Manual
.\scripts\gen-passwords.ps1
.\scripts\configure-network.ps1
.\scripts\validate-config.ps1
docker compose up -d
.\scripts\health-check.ps1 -Watch
```

### Configuration Update

```powershell
# Update network settings
.\scripts\configure-network.ps1

# Validate changes
.\scripts\validate-config.ps1

# Restart affected service
docker compose restart jvb

# Verify health
.\scripts\health-check.ps1
```

### Troubleshooting

```powershell
# 1. Check overall health
.\scripts\health-check.ps1 -Detailed

# 2. Validate configuration
.\scripts\validate-config.ps1 -Verbose

# 3. Check specific logs
docker compose logs jvb --tail=100

# 4. Restart problematic service
docker compose restart jvb

# 5. Monitor recovery
.\scripts\health-check.ps1 -Watch
```

### Security Audit

```powershell
# Regenerate passwords
.\scripts\gen-passwords.ps1 -Force

# Validate configuration
.\scripts\validate-config.ps1

# Restart all services
docker compose restart

# Verify health
.\scripts\health-check.ps1
```

### Production Deployment

```powershell
# 1. Setup with internet-facing configuration
.\scripts\quick-setup.ps1

# 2. During setup, choose "Internet Facing" mode

# 3. Configure firewall (outside script)
# - Open UDP port 10000
# - Open TCP ports 80, 443

# 4. Monitor continuously
.\scripts\health-check.ps1 -Watch -Detailed

# 5. Set up monitoring alert (optional)
# Schedule: Run every 5 minutes
# Command: .\scripts\health-check.ps1 | Select-String "ERROR|unhealthy"
```

## Script Dependencies

All scripts require:

- **PowerShell 5.1+** (Windows) or **PowerShell Core 7+** (cross-platform)
- **Docker Desktop** or Docker Engine
- **Docker Compose v2**

Optional for network scripts:

- Internet connectivity (for public IP detection)
- Access to STUN servers (meet.jit.si:443)

## Environment Variables

Scripts read from `.env` file in the parent directory:

- `CONFIG` - Configuration directory path
- `HTTP_PORT` - Web interface HTTP port
- `HTTPS_PORT` - Web interface HTTPS port
- `JVB_PORT` - Video bridge UDP port
- `JVB_ADVERTISE_IPS` - Advertised IPs for external access
- All password variables

## Error Handling

Scripts use consistent error handling:

- **Exit code 0**: Success
- **Exit code 1**: Error occurred
- Color-coded output:
  - 🟢 Green: Success/healthy
  - 🟡 Yellow: Warning/starting
  - 🔴 Red: Error/critical

## Best Practices

1. **Always validate before starting**

   ```powershell
   .\scripts\validate-config.ps1 && docker compose up -d
   ```

2. **Monitor after changes**

   ```powershell
   docker compose restart jvb; .\scripts\health-check.ps1 -Watch
   ```

3. **Backup before regenerating passwords**

   ```powershell
   Copy-Item .env .env.manual-backup
   .\scripts\gen-passwords.ps1
   ```

4. **Use detailed mode for troubleshooting**

   ```powershell
   .\scripts\health-check.ps1 -Detailed
   ```

5. **Automate production monitoring**
   ```powershell
   # Windows Task Scheduler
   # Schedule: Every 5 minutes
   # Action: .\scripts\health-check.ps1
   # Output: >> health.log
   ```

## Support

For issues or questions:

1. Check logs: `docker compose logs`
2. Run validation: `.\scripts\validate-config.ps1`
3. Check health: `.\scripts\health-check.ps1 -Detailed`
4. Review documentation: `../DOCKER_SETUP.md`

## License

These scripts are part of the Meeta project and follow the same license.
