# Meeta Docker Setup - Đã đồng bộ với docker-jitsi-meet

## Tổng quan

Cấu hình Docker Compose này bao gồm:

### 1. **Meeta Application Services**

- PostgreSQL 16 (port 5431)
- Redis 7 (port 6380)

### 2. **Jitsi Meet Video Conferencing Stack** (đã đồng bộ 100% với docker-jitsi-meet)

- **web** - Frontend web interface
- **prosody** - XMPP server
- **jicofo** - Focus component (conference orchestrator)
- **jvb** - Video bridge (media routing)

## Các thay đổi đã thực hiện

### docker-compose.yml

✅ Đã cập nhật tất cả services Jitsi để **giống y hệt** file gốc từ `docker-jitsi-meet`
✅ Giữ nguyên services PostgreSQL và Redis cho Meeta app
✅ Thêm network `meet.jitsi` cho tất cả services (bao gồm postgres và redis)
✅ Loại bỏ các `container_name` của Jitsi services (theo chuẩn docker-jitsi-meet)
✅ Sử dụng quote style `'` thay vì `"` cho ports (theo chuẩn gốc)
✅ Volumes path không có default `./jitsi-config` (phải set qua CONFIG trong .env)

### .env.example

✅ Đồng bộ 100% với `env.example` từ docker-jitsi-meet
✅ Thêm section riêng cho Meeta (PostgreSQL, Redis)
✅ Tất cả password fields để trống (phải generate bằng script)
✅ Đầy đủ tài liệu về các options (LDAP, JWT, Let's Encrypt, etc.)

### Các file bổ sung

✅ `gen-passwords.sh` - Script sinh password tự động
✅ `etherpad.yml` - Tích hợp document sharing
✅ `whiteboard.yml` - Tích hợp whiteboard (Excalidraw)
✅ `jibri.yml` - Recording và livestreaming
✅ `jigasi.yml` - SIP gateway
✅ `transcriber.yml` - Transcription service
✅ `grafana.yml` - Monitoring dashboard
✅ `log-analyser.yml` - Log analysis
✅ `prometheus.yml` - Metrics collection

## Cách sử dụng

### 1. Generate passwords

```bash
# Linux/Mac
bash gen-passwords.sh

# Windows (Git Bash)
bash gen-passwords.sh
```

Hoặc thủ công: Copy `.env.example` thành `.env` và điền passwords.

### 2. Khởi động services cơ bản

```bash
docker compose up -d
```

### 3. Khởi động với các services tùy chọn

#### Với Etherpad (document sharing):

```bash
docker compose -f docker-compose.yml -f etherpad.yml up -d
```

#### Với Whiteboard:

```bash
docker compose -f docker-compose.yml -f whiteboard.yml up -d
```

#### Với Recording (Jibri):

```bash
docker compose -f docker-compose.yml -f jibri.yml up -d
```

#### Với SIP Gateway (Jigasi):

```bash
docker compose -f docker-compose.yml -f jigasi.yml up -d
```

#### Với Transcription:

```bash
docker compose -f docker-compose.yml -f transcriber.yml up -d
```

#### Với Monitoring (Grafana + Prometheus):

```bash
docker compose -f docker-compose.yml -f grafana.yml -f prometheus.yml -f log-analyser.yml up -d
```

#### Full stack với tất cả services:

```bash
docker compose \
  -f docker-compose.yml \
  -f etherpad.yml \
  -f whiteboard.yml \
  -f jibri.yml \
  -f jigasi.yml \
  -f transcriber.yml \
  -f grafana.yml \
  -f prometheus.yml \
  -f log-analyser.yml \
  up -d
```

## Cấu hình quan trọng

### Cho môi trường development (local):

Trong file `.env`:

```bash
CONFIG=./jitsi-config
HTTP_PORT=8000
HTTPS_PORT=8443
DISABLE_HTTPS=1
ENABLE_HTTP_REDIRECT=0
```

### Cho production:

```bash
CONFIG=./jitsi-config
PUBLIC_URL=https://meet.yourdomain.com:8443
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=meet.yourdomain.com
LETSENCRYPT_EMAIL=admin@yourdomain.com
ENABLE_HTTP_REDIRECT=1
```

### Cho NAT/LAN environment:

```bash
JVB_ADVERTISE_IPS=<your-public-ip>,<your-local-ip>
# Ví dụ: JVB_ADVERTISE_IPS=203.0.113.1,192.168.1.100
```

## Services ports

### Meeta Application

- PostgreSQL: `5431` (mapped from 5432)
- Redis: `6380` (mapped from 6379)

### Jitsi Meet

- HTTP: `8000` (configurable via HTTP_PORT)
- HTTPS: `8443` (configurable via HTTPS_PORT)
- JVB Media: `10000/udp` (configurable via JVB_PORT)
- Jicofo REST API: `127.0.0.1:8888` (local only)
- JVB Colibri REST API: `127.0.0.1:8080` (local only)

### Optional Services

- Grafana: `3000`
- Prometheus: `9090`
- Loki: `3100`

## Xác minh cấu hình

### Kiểm tra services đang chạy:

```bash
docker compose ps
```

### Xem logs:

```bash
# Tất cả services
docker compose logs -f

# Service cụ thể
docker compose logs -f web
docker compose logs -f prosody
docker compose logs -f jicofo
docker compose logs -f jvb
docker compose logs -f postgres
docker compose logs -f redis
```

### Truy cập Jitsi Meet:

- Development (HTTP): http://localhost:8000
- Development (HTTPS): https://localhost:8443
- Production: https://meet.yourdomain.com:8443

### Truy cập Meeta PostgreSQL:

```bash
psql -h localhost -p 5431 -U postgres -d meeta
```

### Truy cập Meeta Redis:

```bash
redis-cli -p 6380
```

## Authentication Options

### 1. Guest Access (Default)

Không cần đăng nhập, ai cũng có thể tạo room.

### 2. Internal Authentication

```bash
ENABLE_AUTH=1
AUTH_TYPE=internal
ENABLE_GUESTS=1  # Cho phép guest join sau khi moderator approve
```

Tạo user:

```bash
docker compose exec prosody prosodyctl register <username> meet.jitsi <password>
```

### 3. JWT Authentication

```bash
ENABLE_AUTH=1
AUTH_TYPE=jwt
JWT_APP_ID=my_app_id
JWT_APP_SECRET=my_secret
```

### 4. LDAP Authentication

```bash
ENABLE_AUTH=1
AUTH_TYPE=ldap
LDAP_URL=ldaps://ldap.domain.com/
LDAP_BASE=DC=example,DC=domain,DC=com
LDAP_BINDDN=CN=binduser,OU=users,DC=example,DC=domain,DC=com
LDAP_BINDPW=password
LDAP_FILTER=(sAMAccountName=%u)
```

## Tham khảo

- [Jitsi Meet Docker Handbook](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker)
- [Jitsi Meet Documentation](https://jitsi.github.io/handbook/)
- [Docker Compose CLI Reference](https://docs.docker.com/compose/reference/)

## Management Scripts

### Quick Setup (First-time deployment)

```powershell
.\scripts\quick-setup.ps1
```

Interactive wizard that:

- Validates prerequisites
- Creates/updates .env file
- Generates passwords
- Configures network
- Pulls images and starts services

### Password Generation

```powershell
# Generate all passwords
.\scripts\gen-passwords.ps1

# Force regenerate (overwrite existing)
.\scripts\gen-passwords.ps1 -Force

# Skip backup creation
.\scripts\gen-passwords.ps1 -SkipBackup
```

Generates secure 32-character passwords for all Jitsi services.

### Network Configuration

```powershell
# Interactive mode (recommended)
.\scripts\configure-network.ps1

# Local network only
.\scripts\configure-network.ps1 -LocalOnly

# Internet-facing with public IP
.\scripts\configure-network.ps1 -InternetFacing

# Skip validation checks
.\scripts\configure-network.ps1 -SkipValidation
```

Auto-detects public and local IPs and configures `JVB_ADVERTISE_IPS`.

### Configuration Validation

```powershell
# Basic validation
.\scripts\validate-config.ps1

# Detailed output
.\scripts\validate-config.ps1 -Verbose
```

Checks:

- Environment variables
- Password strength
- Docker environment
- Port availability
- Configuration directories
- Network settings

### Health Monitoring

```powershell
# One-time health check
.\scripts\health-check.ps1

# Continuous monitoring (refresh every 5 seconds)
.\scripts\health-check.ps1 -Watch

# Detailed mode with JVB statistics
.\scripts\health-check.ps1 -Detailed

# Watch mode with custom interval
.\scripts\health-check.ps1 -Watch -Interval 10
```

Monitors:

- Container status and health
- Service health endpoints
- XMPP connections
- Resource usage (CPU, memory)
- Recent errors
- JVB statistics

## Troubleshooting

### Jitsi không khởi động được

1. Run validation: `.\scripts\validate-config.ps1`
2. Check passwords: `.\scripts\gen-passwords.ps1`
3. View health status: `.\scripts\health-check.ps1`
4. Check logs: `docker compose logs`

### Video không hoạt động qua internet

1. Configure network: `.\scripts\configure-network.ps1 -InternetFacing`
2. Verify JVB advertise IPs in `.env`
3. Mở port `10000/udp` trên firewall
4. Check JVB logs: `docker compose logs jvb | Select-String "Discovered public address"`
5. Xem xét sử dụng TURN server cho NAT traversal

### Services khởi động chậm

- Services có health checks và dependencies, có thể mất 60-90 giây để fully ready
- Monitor startup: `.\scripts\health-check.ps1 -Watch`
- Check for errors: `docker compose logs -f`

### PostgreSQL connection refused

- Kiểm tra port 5431 không bị sử dụng
- Verify service đang chạy: `docker compose ps postgres`
- Check health: `docker compose ps postgres` (should show "healthy")

## Lưu ý quan trọng

⚠️ **Security**: Luôn thay đổi passwords mặc định trong production!

⚠️ **Backup**: Thư mục `jitsi-config/` chứa config quan trọng, nên backup thường xuyên.

⚠️ **Resources**: Services Jitsi cần nhiều RAM. Khuyến nghị tối thiểu 4GB RAM cho development, 8GB+ cho production.

⚠️ **HTTPS**: Trong production, luôn bật HTTPS (Let's Encrypt hoặc custom cert).
