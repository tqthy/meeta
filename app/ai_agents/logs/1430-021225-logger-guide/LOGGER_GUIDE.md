# Logger Guide - Hệ thống Ghi Nhật Ký

## 📋 Tổng quan

Hệ thống logging tự động lưu tất cả các hoạt động vào file JSON theo định dạng:

```
hhmm-ddMMyy-logs.json
```

**Thư mục lưu:** `app/ai_agents/logs/`

---

## 🔧 Cài đặt

### 1. Import Logger

```typescript
import { logger } from '@/lib/logger'
```

### 2. Sử dụng Logger

#### INFO - Thông tin chung

```typescript
logger.info('[RoomPage]', 'User joined conference', {
    userName: 'John Doe',
    roomName: 'test-room',
})
```

#### WARN - Cảnh báo

```typescript
logger.warn('[MediaManager]', 'Camera permission denied')
```

#### ERROR - Lỗi

```typescript
logger.error('[JitsiService]', 'Connection failed', {
    code: 'ECONNREFUSED',
    message: error.message,
})
```

#### DEBUG - Debug info

```typescript
logger.debug('[Hook]', 'Creating local tracks', {
    videoEnabled: true,
    audioEnabled: false,
})
```

---

## 📝 Các bối cảnh (Context) thông dụng

| Context               | Mô tả                        |
| --------------------- | ---------------------------- |
| `[RoomPage]`          | Trang video conference chính |
| `[NewMeeting]`        | Trang tạo phòng họp mới      |
| `[JitsiService]`      | Service kết nối Jitsi        |
| `[MediaManager]`      | Quản lý media streams        |
| `[Hook]`              | Custom React hooks           |
| `[ControlBar]`        | Thanh điều khiển             |
| `[ParticipantsPanel]` | Panel người tham gia         |
| `[ChatPanel]`         | Panel chat                   |

---

## 📂 Log File Format

### Ví dụ file log

**Filename:** `0223-021225-logs.json`

```json
[
    {
        "timestamp": "2025-12-02T02:23:27.018Z",
        "level": "INFO",
        "context": "[RoomPage]",
        "message": "User loaded preferences",
        "data": {
            "cameraEnabled": false,
            "micEnabled": false
        }
    },
    {
        "timestamp": "2025-12-02T02:23:36.025Z",
        "level": "ERROR",
        "context": "[JitsiService]",
        "message": "Connection failed",
        "data": {
            "reason": "service-unavailable"
        }
    }
]
```

---

## 🎯 Tốt nhất (Best Practices)

### ✅ Làm

```typescript
// ✅ Rõ ràng và chi tiết
logger.info('[RoomPage]', 'Conference joined', {
    roomName: roomName,
    participantCount: 5,
    timestamp: Date.now(),
})
```

### ❌ Tránh

```typescript
// ❌ Không rõ ràng
console.log('Joined')

// ❌ Không có context
logger.info('', 'User action')

// ❌ Quá tải data
logger.info('[Component]', 'Message', entireComponent)
```

---

## 🔍 Xem Logs

### 1. Browser Console

Logs sẽ hiển thị với màu sắc:

- 🔴 **ERROR** - Màu đỏ
- 🟠 **WARN** - Màu cam
- 🔵 **INFO** - Màu xanh
- ⚫ **DEBUG** - Màu xám

### 2. Tải File Logs

```typescript
// Tải logs hiện tại
logger.downloadLogs()
```

### 3. API Endpoint

```bash
# Lấy logs ngày hôm nay
curl http://localhost:3000/api/logs
```

---

## 📊 Phân tích Logs

### Events để theo dõi

#### Media Events

```
[RoomPage] "Loaded preferences - Camera: true, Mic: true"
[MediaManager] "Creating local tracks..."
[MediaManager] "Local tracks created: 2"
[RoomPage] "Cleaning up media streams on unmount"
```

#### Conference Events

```
[JitsiService] "Connection established!"
[JitsiService] "Creating conference..."
[JitsiService] "Conference joined!"
[JitsiService] "Conference left!"
```

#### Permission Events

```
[NewMeeting] "Cleaning up media permissions on unmount"
[NewMeeting] "Joining room with permissions"
```

---

## 🐛 Debugging

### Tìm lỗi

```typescript
const logs = logger.getLogs()
const errors = logs.filter((log) => log.level === 'ERROR')
console.table(errors)
```

### Theo dõi luồng người dùng

```typescript
const userFlow = logs
    .filter((log) => log.context === '[RoomPage]')
    .map((log) => `${log.timestamp}: ${log.message}`)
```

---

## 💾 Lưu trữ

- **Max logs in memory:** 1000 entries
- **Max logs per file:** 10000 entries
- **Auto cleanup:** Logs cũ hơn 7 ngày có thể xóa thủ công

---

## 🔐 Bảo mật

⚠️ **Chú ý:** Không ghi các thông tin nhạy cảm:

- Passwords
- Private keys
- Sensitive user data

✅ **Nên ghi:**

- User IDs (không personal info)
- Event timestamps
- Action types
- Error codes

---

## 📈 Metrics

Theo dõi các chỉ số:

- Thời gian kết nối
- Số lần retry
- Error rates
- User drop-off points
