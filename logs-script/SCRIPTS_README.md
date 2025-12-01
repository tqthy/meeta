# Meeta Management Scripts

Các script PowerShell để quản lý và theo dõi Meeta + Jitsi Meet containers.

## Quick Start

```powershell
# 1. Start services
docker compose up -d

# 2. Check configuration
.\validate-config.ps1

# 3. Watch logs (recommended for monitoring)
.\watch-logs.ps1
```

## Available Scripts

### 1. validate-config.ps1

Kiểm tra cấu hình và trạng thái containers

```powershell
.\validate-config.ps1
```

**Kiểm tra:**

- ✓ File .env có tồn tại không
- ✓ Các biến môi trường bắt buộc
- ✓ Thư mục jitsi-config
- ✓ Trạng thái containers
- ✓ Ports đang expose

### 2. watch-logs.ps1

Theo dõi logs real-time với highlighting

```powershell
# Monitor tất cả services
.\watch-logs.ps1

# Monitor service cụ thể
.\watch-logs.ps1 -Service web
.\watch-logs.ps1 -Service jicofo
.\watch-logs.ps1 -Service jvb

# Số dòng hiển thị
.\watch-logs.ps1 -Lines 100
```

**Features:**

- Real-time log streaming
- Theo dõi nhiều containers cùng lúc
- Tự động highlight errors/warnings
- Ctrl+C để dừng

### 3. check-health.ps1

Kiểm tra sức khỏe chi tiết của containers

```powershell
# Single check
.\check-health.ps1

# Watch mode (refresh every 5 seconds)
.\check-health.ps1 -Watch

# Custom interval
.\check-health.ps1 -Watch -Interval 10
```

**Thông tin hiển thị:**

- Container status (running/stopped)
- Health status (healthy/unhealthy)
- Recent errors
- Network connectivity
- Service endpoints

### 4. monitor-logs.ps1

Log viewer đơn giản

```powershell
.\monitor-logs.ps1
```

Hiển thị logs từ tất cả containers với header đẹp.

## Common Tasks

### Khởi động services

```powershell
docker compose up -d
```

### Dừng services

```powershell
docker compose down
```

### Restart một service

```powershell
docker compose restart jicofo
docker compose restart jvb
```

### Xem logs cụ thể

```powershell
# Last 50 lines
docker compose logs --tail=50 web

# Follow logs
docker compose logs -f prosody

# Since specific time
docker compose logs --since 10m jicofo
```

### Check errors

```powershell
docker compose logs | Select-String "ERROR|FATAL|Exception"
```

### Container stats

```powershell
docker stats
```

## Debugging Workflow

Khi gặp vấn đề:

1. **Kiểm tra status:**

   ```powershell
   .\validate-config.ps1
   ```

2. **Xem logs real-time:**

   ```powershell
   .\watch-logs.ps1
   ```

3. **Kiểm tra health chi tiết:**

   ```powershell
   .\check-health.ps1 -Watch
   ```

4. **Xem logs service cụ thể:**

   ```powershell
   .\watch-logs.ps1 -Service jicofo
   ```

5. **Restart nếu cần:**
   ```powershell
   docker compose restart [service-name]
   ```

## Log Locations

Logs được lưu trong containers, truy cập qua:

```powershell
# Jitsi logs
docker compose exec jicofo cat /config/log/jicofo.log
docker compose exec jvb cat /config/log/jvb.log
docker compose exec prosody cat /config/log/prosody.log

# Postgres logs
docker compose logs postgres

# Redis logs
docker compose logs redis
```

## Performance Monitoring

```powershell
# CPU and Memory usage
docker stats --no-stream

# Continuous monitoring
docker stats

# Specific containers
docker stats meeta-jitsi-web meeta-jitsi-jvb
```

## Tips

1. **Watch mode cho development:**

   ```powershell
   # Terminal 1: Watch logs
   .\watch-logs.ps1

   # Terminal 2: Watch health
   .\check-health.ps1 -Watch
   ```

2. **Filter logs:**

   ```powershell
   .\watch-logs.ps1 -Service jicofo | Select-String "Connected"
   ```

3. **Export logs:**

   ```powershell
   docker compose logs > meeta-logs-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt
   ```

4. **Check disk usage:**
   ```powershell
   docker system df
   ```

## Access Points

- **Jitsi Web:** http://localhost:8000
- **Jitsi HTTPS:** https://localhost:8443
- **PostgreSQL:** localhost:5431
- **Redis:** localhost:6380
- **Jicofo REST API:** http://localhost:8888
- **JVB REST API:** http://localhost:8080

## Environment Variables

Key variables in `.env`:

```env
CONFIG=./jitsi-config
HTTP_PORT=8000
HTTPS_PORT=8443
JICOFO_AUTH_PASSWORD=<generated>
JVB_AUTH_PASSWORD=<generated>
JICOFO_COMPONENT_SECRET=<generated>
```

## Maintenance

### Clean up

```powershell
# Remove stopped containers
docker compose down

# Remove with volumes
docker compose down -v

# Prune everything (careful!)
docker system prune -a
```

### Backup config

```powershell
# Backup jitsi-config
Copy-Item -Recurse jitsi-config jitsi-config-backup-$(Get-Date -Format 'yyyyMMdd')

# Backup .env
Copy-Item .env .env.backup
```

### Update images

```powershell
docker compose pull
docker compose up -d
```

---

**Need help?** Check `SETUP_SUMMARY.md` for detailed setup information.
