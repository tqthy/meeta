# Meeta - Jitsi Meet Integration Guide

## 📋 Tổng quan

Dự án Meeta tích hợp đầy đủ Jitsi Meet stack bao gồm:

### Dịch vụ Meeta

- **PostgreSQL** (port 5431) - Database chính
- **Redis** (port 6380) - Cache và real-time features

### Dịch vụ Jitsi Meet

- **web** (port 8000/8443) - Frontend web interface
- **prosody** - XMPP signaling server
- **jicofo** (port 8888) - Focus/Conference management
- **jvb** (port 10000/UDP) - Video bridge

## 🚀 Hướng dẫn cài đặt

### Bước 1: Cấu hình môi trường

```bash
# Copy file cấu hình mẫu
cp .env.example .env

# Chỉnh sửa các giá trị trong .env
notepad .env  # hoặc code .env
```

### Bước 2: Tạo thư mục cấu hình

```bash
# Tạo thư mục lưu cấu hình Jitsi
mkdir jitsi-config
```

### Bước 3: Sinh mật khẩu bảo mật

Mở file `.env` và thay đổi các giá trị sau:

```env
JVB_AUTH_PASSWORD=<random-password-1>
JICOFO_AUTH_PASSWORD=<random-password-2>
JICOFO_COMPONENT_SECRET=<random-password-3>
```

**PowerShell**: Sinh mật khẩu ngẫu nhiên:

```powershell
# Sinh 3 mật khẩu ngẫu nhiên
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### Bước 4: Khởi động các dịch vụ

```bash
# Khởi động tất cả dịch vụ
docker-compose up -d

# Xem logs
docker-compose logs -f

# Chỉ khởi động một số dịch vụ cụ thể
docker-compose up -d postgres redis web prosody jicofo jvb
```

## 🔧 Cấu hình nâng cao

### Chạy local (Development)

Trong file `.env`:

```env
# Tắt HTTPS cho môi trường local
DISABLE_HTTPS=1
ENABLE_HTTP_REDIRECT=0

# Sử dụng port HTTP
HTTP_PORT=8000

# URL local (không bắt buộc cho dev)
PUBLIC_URL=http://localhost:8000
```

Sau đó truy cập: **http://localhost:8000**

### Chạy Production (với domain thật)

```env
# Bật HTTPS
DISABLE_HTTPS=0
ENABLE_HTTP_REDIRECT=1

# Cấu hình domain
PUBLIC_URL=https://meet.yourdomain.com

# Cấu hình Let's Encrypt SSL
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=meet.yourdomain.com
LETSENCRYPT_EMAIL=admin@yourdomain.com
```

### Cấu hình NAT / Public IP

Nếu chạy trên VPS hoặc server có IP public:

```env
# Thay YOUR_PUBLIC_IP bằng IP thật của server
JVB_ADVERTISE_IPS=YOUR_PUBLIC_IP
DOCKER_HOST_ADDRESS=YOUR_PUBLIC_IP
```

## 📦 Quản lý Container

```bash
# Xem trạng thái containers
docker-compose ps

# Khởi động lại một service
docker-compose restart web

# Dừng tất cả
docker-compose down

# Dừng và xóa volumes (DỮ LIỆU SẼ MẤT!)
docker-compose down -v

# Xem logs của một service cụ thể
docker-compose logs -f web
docker-compose logs -f jvb
docker-compose logs -f prosody
```

## 🔐 Authentication (Xác thực)

### Guest mode (Mặc định)

Không cần xác thực, ai cũng có thể tạo phòng:

```env
ENABLE_GUESTS=1
ENABLE_AUTH=0
```

### Internal authentication (Tài khoản nội bộ)

Chỉ người có tài khoản mới tạo được phòng:

```env
ENABLE_AUTH=1
AUTH_TYPE=internal
ENABLE_GUESTS=1  # Guest có thể join nhưng không tạo phòng mới
```

Tạo tài khoản:

```bash
# Vào container prosody
docker-compose exec prosody /bin/bash

# Tạo user
prosodyctl --config /config/prosody.cfg.lua register <username> meet.jitsi <password>

# Ví dụ
prosodyctl --config /config/prosody.cfg.lua register admin meet.jitsi admin123
```

### JWT authentication (Token-based)

Dùng JWT token để xác thực (tích hợp với app):

```env
ENABLE_AUTH=1
AUTH_TYPE=jwt
JWT_APP_ID=my_app_id
JWT_APP_SECRET=my_secret_key
JWT_AUTH_TYPE=token
```

## 🎥 Tính năng Recording (Quay video)

⚠️ **Yêu cầu thêm service Jibri** (chưa có trong cấu hình hiện tại)

Để bật recording, cần:

1. Thêm service `jibri` vào docker-compose.yml
2. Cấu hình trong `.env`:

```env
ENABLE_RECORDING=1
JIBRI_RECORDER_USER=recorder
JIBRI_RECORDER_PASSWORD=<random-password>
JIBRI_XMPP_USER=jibri
JIBRI_XMPP_PASSWORD=<random-password>
JIBRI_BREWERY_MUC=jibribrewery
```

## 📞 SIP/Phone Integration (Jigasi)

⚠️ **Yêu cầu thêm service Jigasi** (chưa có trong cấu hình hiện tại)

Để kết nối với điện thoại SIP:

```env
ENABLE_TRANSCRIPTIONS=1
JIGASI_XMPP_USER=jigasi
JIGASI_XMPP_PASSWORD=<random-password>
JIGASI_BREWERY_MUC=jigasibrewery
```

## 🛠️ Troubleshooting

### 1. Container không khởi động

```bash
# Xem logs chi tiết
docker-compose logs -f

# Kiểm tra ports đã bị chiếm chưa
netstat -ano | findstr "8000"
netstat -ano | findstr "10000"
```

### 2. Không kết nối được video/audio

- Kiểm tra firewall mở port 10000/UDP
- Kiểm tra cấu hình `JVB_ADVERTISE_IPS` nếu dùng NAT
- Kiểm tra STUN/TURN server

```bash
# Xem logs JVB
docker-compose logs -f jvb
```

### 3. Không tạo được phòng

- Kiểm tra prosody đã chạy chưa
- Kiểm tra jicofo logs

```bash
docker-compose logs -f prosody
docker-compose logs -f jicofo
```

### 4. Reset cấu hình Jitsi

```bash
# Xóa thư mục cấu hình và tạo lại
docker-compose down
rm -rf jitsi-config
docker-compose up -d
```

## 🔗 Ports Summary

| Service      | Port  | Protocol | Mô tả                 |
| ------------ | ----- | -------- | --------------------- |
| PostgreSQL   | 5431  | TCP      | Database              |
| Redis        | 6380  | TCP      | Cache                 |
| Jitsi Web    | 8000  | TCP      | HTTP                  |
| Jitsi Web    | 8443  | TCP      | HTTPS                 |
| JVB Media    | 10000 | UDP      | Video/Audio streaming |
| Jicofo REST  | 8888  | TCP      | API (localhost only)  |
| JVB Colibri  | 8080  | TCP      | API (localhost only)  |
| XMPP         | 5222  | TCP      | Internal              |
| Prosody HTTP | 5280  | TCP      | Internal              |

## 📚 Tài liệu tham khảo

- [Jitsi Meet Docker Handbook](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker)
- [Jitsi Configuration Options](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker#configuration)
- [Docker Jitsi Meet GitHub](https://github.com/jitsi/docker-jitsi-meet)

## 💡 Tips

### Giảm tải tài nguyên (cho dev)

```env
# Giảm memory limits
VIDEOBRIDGE_MAX_MEMORY=1024m
JICOFO_MAX_MEMORY=512m

# Giảm chất lượng video
RESOLUTION=360
```

### Bật tính năng hữu ích

```env
# Lobby (phòng chờ)
ENABLE_LOBBY=1

# Breakout rooms (phòng nhóm nhỏ)
ENABLE_BREAKOUT_ROOMS=1

# Pre-join page (test audio/video trước khi vào)
ENABLE_PREJOIN_PAGE=1
```

## 🎯 Next Steps

1. ✅ Khởi động basic stack (postgres + redis + jitsi)
2. 🔐 Cấu hình authentication
3. 🌐 Setup domain và SSL cho production
4. 📹 Thêm Jibri cho recording (nếu cần)
5. 🔗 Tích hợp với Next.js app (Meeta)

---

**Happy Meeting! 🎉**
