# Hướng dẫn Setup Jitsi Server

## 🚀 Option 1: Sử dụng Jitsi Meet Public Server (Nhanh nhất)

### Ưu điểm

- ✅ Không cần setup gì
- ✅ Hoạt động ngay lập tức
- ✅ Phù hợp cho development/testing

### Cách sử dụng

**Tạo file `.env.local`:**

```env
NEXT_PUBLIC_JITSI_DOMAIN=meet.jit.si
NEXT_PUBLIC_JITSI_MUC=conference.meet.jit.si
NEXT_PUBLIC_JITSI_WEBSOCKET=wss://meet.jit.si/xmpp-websocket
NEXT_PUBLIC_JITSI_WEBSOCKET_KEEPALIVE=https://meet.jit.si/_unlock
```

**Update `useJitsiConnection.tsx`:**

```typescript
const buildConnectionOptions = useCallback((): IConnectionOptions => {
    return {
        hosts: {
            domain: process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si',
            muc: process.env.NEXT_PUBLIC_JITSI_MUC || 'conference.meet.jit.si',
        },
        serviceUrl:
            process.env.NEXT_PUBLIC_JITSI_WEBSOCKET ||
            'wss://meet.jit.si/xmpp-websocket',
        websocketKeepAliveUrl:
            process.env.NEXT_PUBLIC_JITSI_WEBSOCKET_KEEPALIVE,
    }
}, [])
```

---

## 🏢 Option 2: Self-hosted Jitsi Server (Cho production)

### Requirements

- Ubuntu 20.04/22.04 LTS server
- Domain name với SSL certificate
- Ít nhất 4GB RAM, 2 CPU cores
- Port 80, 443, 10000 UDP, 4443 TCP mở

### Bước 1: Cài đặt Jitsi Meet

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Set hostname
sudo hostnamectl set-hostname jitsi.yourdomain.com
echo "127.0.0.1 jitsi.yourdomain.com" | sudo tee -a /etc/hosts

# Install dependencies
sudo apt install -y apt-transport-https gnupg2 nginx-full

# Add Jitsi repository
curl -sL https://download.jitsi.org/jitsi-key.gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/jitsi-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/jitsi-keyring.gpg] https://download.jitsi.org stable/" | sudo tee /etc/apt/sources.list.d/jitsi-stable.list

# Install Jitsi Meet
sudo apt update
sudo apt install -y jitsi-meet
```

### Bước 2: Configure SSL

```bash
# Install Let's Encrypt certificate
sudo /usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh
```

### Bước 3: Enable WebSocket

Edit `/etc/jitsi/meet/jitsi.yourdomain.com-config.js`:

```javascript
var config = {
    // ...existing config
    websocket: 'wss://jitsi.yourdomain.com/xmpp-websocket',
    websocketKeepAliveUrl: 'https://jitsi.yourdomain.com/_unlock',
}
```

Edit `/etc/nginx/sites-available/jitsi.yourdomain.com.conf`:

```nginx
# Add inside server block
location /xmpp-websocket {
    proxy_pass http://localhost:5280/xmpp-websocket;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    tcp_nodelay on;
}
```

Restart services:

```bash
sudo systemctl restart prosody
sudo systemctl restart jicofo
sudo systemctl restart jitsi-videobridge2
sudo systemctl restart nginx
```

### Bước 4: Configure CORS (Optional)

Edit `/etc/jitsi/meet/jitsi.yourdomain.com-config.js`:

```javascript
var config = {
    // ...
    corsOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
}
```

### Bước 5: Update app configuration

`.env.local`:

```env
NEXT_PUBLIC_JITSI_DOMAIN=jitsi.yourdomain.com
NEXT_PUBLIC_JITSI_MUC=conference.jitsi.yourdomain.com
NEXT_PUBLIC_JITSI_WEBSOCKET=wss://jitsi.yourdomain.com/xmpp-websocket
NEXT_PUBLIC_JITSI_WEBSOCKET_KEEPALIVE=https://jitsi.yourdomain.com/_unlock
```

---

## 🐳 Option 3: Docker (Cho development local)

### docker-compose.yml

```yaml
version: '3.8'

services:
    # Frontend
    web:
        image: jitsi/web:stable
        restart: always
        ports:
            - '8443:443'
            - '8000:80'
        volumes:
            - ./web:/config:Z
            - ./web/crontabs:/var/spool/cron/crontabs:Z
            - ./transcripts:/usr/share/jitsi-meet/transcripts:Z
        environment:
            - ENABLE_AUTH
            - ENABLE_GUESTS
            - ENABLE_LETSENCRYPT
            - ENABLE_HTTP_REDIRECT
            - ENABLE_TRANSCRIPTIONS
            - DISABLE_HTTPS
            - JICOFO_AUTH_USER
            - LETSENCRYPT_DOMAIN
            - LETSENCRYPT_EMAIL
            - PUBLIC_URL
            - XMPP_DOMAIN
            - XMPP_AUTH_DOMAIN
            - XMPP_BOSH_URL_BASE
            - XMPP_GUEST_DOMAIN
            - XMPP_MUC_DOMAIN
            - XMPP_RECORDER_DOMAIN
            - ETHERPAD_URL_BASE
            - TZ
            - JIBRI_BREWERY_MUC
            - JIBRI_PENDING_TIMEOUT
            - JIBRI_XMPP_USER
            - JIBRI_XMPP_PASSWORD
            - JIBRI_RECORDER_USER
            - JIBRI_RECORDER_PASSWORD
            - ENABLE_RECORDING
        networks:
            meet.jitsi:
                aliases:
                    - meet.jitsi

    # XMPP server
    prosody:
        image: jitsi/prosody:stable
        restart: always
        expose:
            - '5222'
            - '5347'
            - '5280'
        volumes:
            - ./prosody/config:/config:Z
            - ./prosody/prosody-plugins-custom:/prosody-plugins-custom:Z
        environment:
            - AUTH_TYPE
            - ENABLE_AUTH
            - ENABLE_GUESTS
            - GLOBAL_MODULES
            - GLOBAL_CONFIG
            - LDAP_URL
            - LDAP_BASE
            - LDAP_BINDDN
            - LDAP_BINDPW
            - LDAP_FILTER
            - LDAP_AUTH_METHOD
            - LDAP_VERSION
            - LDAP_USE_TLS
            - LDAP_TLS_CIPHERS
            - LDAP_TLS_CHECK_PEER
            - LDAP_TLS_CACERT_FILE
            - LDAP_TLS_CACERT_DIR
            - LDAP_START_TLS
            - XMPP_DOMAIN
            - XMPP_AUTH_DOMAIN
            - XMPP_GUEST_DOMAIN
            - XMPP_MUC_DOMAIN
            - XMPP_INTERNAL_MUC_DOMAIN
            - XMPP_MODULES
            - XMPP_MUC_MODULES
            - XMPP_INTERNAL_MUC_MODULES
            - XMPP_RECORDER_DOMAIN
            - JICOFO_COMPONENT_SECRET
            - JICOFO_AUTH_USER
            - JICOFO_AUTH_PASSWORD
            - JVB_AUTH_USER
            - JVB_AUTH_PASSWORD
            - JIGASI_XMPP_USER
            - JIGASI_XMPP_PASSWORD
            - JIBRI_XMPP_USER
            - JIBRI_XMPP_PASSWORD
            - JIBRI_RECORDER_USER
            - JIBRI_RECORDER_PASSWORD
            - JWT_APP_ID
            - JWT_APP_SECRET
            - JWT_ACCEPTED_ISSUERS
            - JWT_ACCEPTED_AUDIENCES
            - JWT_ASAP_KEYSERVER
            - JWT_ALLOW_EMPTY
            - JWT_AUTH_TYPE
            - JWT_TOKEN_AUTH_MODULE
            - LOG_LEVEL
            - TZ
        networks:
            meet.jitsi:
                aliases:
                    - xmpp.meet.jitsi

    # Focus component
    jicofo:
        image: jitsi/jicofo:stable
        restart: always
        volumes:
            - ./jicofo:/config:Z
        environment:
            - AUTH_TYPE
            - ENABLE_AUTH
            - XMPP_DOMAIN
            - XMPP_AUTH_DOMAIN
            - XMPP_INTERNAL_MUC_DOMAIN
            - XMPP_SERVER
            - JICOFO_COMPONENT_SECRET
            - JICOFO_AUTH_USER
            - JICOFO_AUTH_PASSWORD
            - JICOFO_RESERVATION_ENABLED
            - JICOFO_RESERVATION_REST_BASE_URL
            - JVB_BREWERY_MUC
            - JIGASI_BREWERY_MUC
            - JIGASI_SIP_URI
            - JIBRI_BREWERY_MUC
            - JIBRI_PENDING_TIMEOUT
            - TZ
        depends_on:
            - prosody
        networks:
            meet.jitsi:

    # Video bridge
    jvb:
        image: jitsi/jvb:stable
        restart: always
        ports:
            - '10000:10000/udp'
            - '4443:4443'
        volumes:
            - ./jvb:/config:Z
        environment:
            - DOCKER_HOST_ADDRESS
            - XMPP_AUTH_DOMAIN
            - XMPP_INTERNAL_MUC_DOMAIN
            - XMPP_SERVER
            - JVB_AUTH_USER
            - JVB_AUTH_PASSWORD
            - JVB_BREWERY_MUC
            - JVB_PORT
            - JVB_TCP_HARVESTER_DISABLED
            - JVB_TCP_PORT
            - JVB_STUN_SERVERS
            - JVB_ENABLE_APIS
            - TZ
        depends_on:
            - prosody
        networks:
            meet.jitsi:

networks:
    meet.jitsi:
```

### .env file cho Docker

```env
# Basic configuration options
PUBLIC_URL=https://localhost:8443
DOCKER_HOST_ADDRESS=192.168.1.1

# System time zone
TZ=Asia/Ho_Chi_Minh

# Internal XMPP domain
XMPP_DOMAIN=meet.jitsi
XMPP_AUTH_DOMAIN=auth.meet.jitsi
XMPP_GUEST_DOMAIN=guest.meet.jitsi
XMPP_MUC_DOMAIN=muc.meet.jitsi
XMPP_INTERNAL_MUC_DOMAIN=internal-muc.meet.jitsi
XMPP_RECORDER_DOMAIN=recorder.meet.jitsi

# XMPP component password
JICOFO_COMPONENT_SECRET=s3cr3t
JICOFO_AUTH_PASSWORD=s3cr3t
JVB_AUTH_PASSWORD=s3cr3t

# Authentication
ENABLE_AUTH=0
ENABLE_GUESTS=1
AUTH_TYPE=internal
```

### Start Docker Jitsi

```bash
# Create directories
mkdir -p web prosody jicofo jvb

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Update app để dùng Docker Jitsi

`.env.local`:

```env
NEXT_PUBLIC_JITSI_DOMAIN=meet.jitsi
NEXT_PUBLIC_JITSI_MUC=muc.meet.jitsi
NEXT_PUBLIC_JITSI_WEBSOCKET=wss://localhost:8443/xmpp-websocket
NEXT_PUBLIC_JITSI_WEBSOCKET_KEEPALIVE=https://localhost:8443/_unlock
```

---

## 🧪 Testing Connection

Sau khi setup xong, test connection:

```typescript
// Test script
const testConnection = async () => {
    const connection = new JitsiMeetJS.JitsiConnection(null, null, {
        hosts: {
            domain: 'meet.jit.si', // or your domain
            muc: 'conference.meet.jit.si',
        },
        serviceUrl: 'wss://meet.jit.si/xmpp-websocket',
    })

    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
        () => console.log('✅ Connected!')
    )

    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_FAILED,
        (error) => console.error('❌ Failed:', error)
    )

    connection.connect()
}
```

---

## 📚 Tài liệu tham khảo

- [Jitsi Meet Self-Hosting Guide](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-start)
- [Docker Jitsi Meet](https://github.com/jitsi/docker-jitsi-meet)
- [lib-jitsi-meet API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-ljm-api)
