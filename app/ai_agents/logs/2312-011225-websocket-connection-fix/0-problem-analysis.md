# Phân tích lỗi WebSocket Connection Failed

**Thời gian:** 01/12/2025 23:12
**Vấn đề:** WebSocket connection to 'wss://localhost:8443/xmpp-websocket?room=ctoi' failed

## 1. Phân tích lỗi ban đầu

### Console Errors

```
strophe.umd.js:5588 WebSocket connection to 'wss://localhost:8443/xmpp-websocket?room=ctoi' failed
2025-12-01T16:08:56.348Z [ERROR] [xmpp:strophe.util] Strophe: Websocket error {"isTrusted":true}
2025-12-01T16:08:56.348Z [ERROR] [xmpp:strophe.util] Strophe: Websocket closed unexcectedly
[Jitsi] Connection failed! Object
```

### Nguyên nhân chính

1. **Sai URL kết nối:** Client đang cố kết nối đến `wss://localhost:8443/xmpp-websocket`
2. **Sai protocol:** Đang dùng `wss://` (secure WebSocket) cho localhost development
3. **Sai port:** Port 8443 là HTTPS port của Jitsi Web container, không phải WebSocket endpoint

### Docker Container Status

```
CONTAINER ID   IMAGE                  STATUS                     PORTS
ed96755edb81   jitsi/web:stable       Up 3 minutes (healthy)     0.0.0.0:8000->80/tcp, 0.0.0.0:8443->443/tcp
e90d4eaf06a1   jitsi/prosody:stable   Up 3 minutes (healthy)     5222/tcp, 5269/tcp, 5280/tcp, 5347/tcp
```

### Prosody Logs Analysis

```
2025-12-01 16:08:05 meet.jitsi:http info Serving 'websocket' at http://meet.jitsi:5280/xmpp-websocket
```

**Kết luận:** Prosody đang serve websocket tại internal port 5280, và Jitsi Web container proxy nó ra port 8000 (HTTP) chứ không phải 8443 (HTTPS).

## 2. Giải pháp đúng

### URL kết nối đúng cho localhost development:

```
ws://localhost:8000/xmpp-websocket
```

**Lý do:**

- `ws://` thay vì `wss://` vì đang develop locally không cần SSL
- Port `8000` là HTTP port của Jitsi Web container, nó sẽ proxy request đến Prosody
- Port `8443` chỉ dùng cho HTTPS access vào web interface

### Kiến trúc kết nối

```
Client (Browser)
    ↓ ws://localhost:8000/xmpp-websocket
Jitsi Web Container (port 8000)
    ↓ (internal proxy)
Prosody Container (port 5280)
```

## 3. Các thay đổi cần thực hiện

### File: `src/hooks/useJitsiConnection.tsx`

#### Thay đổi 1: Sửa serviceUrl

```typescript
// CŨ (SAI)
serviceUrl: `wss://localhost:8443/xmpp-websocket?room=${roomName}`,

// MỚI (ĐÚNG)
const baseUrl = process.env.NEXT_PUBLIC_JITSI_WS_URL || 'ws://localhost:8000'
serviceUrl: `${baseUrl}/xmpp-websocket?room=${roomName}`,
```

#### Thay đổi 2: Thêm retry mechanism

- Thêm retry counter với max 3 attempts
- Exponential backoff: 1s, 2s, 4s
- Auto retry khi connection failed
- Clear retry khi connection established

#### Thay đổi 3: Improved error handling

- Log chi tiết retry attempts
- Chỉ gọi `onConnectionFailed` khi đã hết retry
- Clear timeout trong cleanup

## 4. Environment Variables

Có thể override WebSocket URL qua `.env.local`:

```bash
NEXT_PUBLIC_JITSI_WS_URL=ws://localhost:8000
```

Hoặc cho production:

```bash
NEXT_PUBLIC_JITSI_WS_URL=wss://your-domain.com
```
