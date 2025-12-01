# Vấn đề chính và Giải pháp

## 📌 Tóm tắt các vấn đề

**Lưu ý:** URL và domain config (`wss://localhost:8443/xmpp-websocket`, `meet.jitsi`) là ĐÚNG - bạn đã có Jitsi server chạy local.

### 1. **Phòng kết nối nhưng có vấn đề**

- ❌ Event handlers không được setup đúng thứ tự
- ❌ Conference state không được track properly
- ❌ Local tracks không được add vào conference
- ❌ Remote participants/tracks không được xử lý

### 2. **Video không hiển thị**

- ❌ Local tracks không được attach đúng cách vào DOM
- ❌ Remote tracks không được xử lý và attach
- ❌ Video element không có proper styling/attributes
- ❌ Video container bị che bởi placeholder/avatar

### 3. **Chập chờn truy cập thiết bị (mic, camera)**

- ❌ Tracks được tạo nhiều lần (useEffect dependencies sai)
- ❌ Không handle permission denied properly
- ❌ Race condition giữa track creation và connection
- ❌ Cleanup không đúng khi component unmount

---

## 🎯 Giải pháp chính

**GIỮ NGUYÊN** cấu hình URL và domain hiện tại - chúng đã đúng!

### **Fix 1: Video Rendering Logic**

```typescript
// Attach video với proper attributes và styling
const videoElement = track.attach() as HTMLVideoElement
videoElement.autoplay = true
videoElement.playsInline = true
videoElement.muted = true // local video
videoElement.style.width = '100%'
videoElement.style.height = '100%'
videoElement.style.objectFit = 'cover'
```

### **Fix 2: Event Handlers & State Management**

```typescript
// Setup conference handlers TRƯỚC KHI join
setupConferenceHandlers(conference)
conference.join()

// Track remote participants properly
conference.on(JitsiMeetJS.events.conference.USER_JOINED, handleUserJoined)
conference.on(JitsiMeetJS.events.conference.TRACK_ADDED, handleTrackAdded)
```

### **Fix 3: Track Creation & Cleanup**

```typescript
// Chỉ tạo tracks MỘT LẦN, cleanup đúng cách
useEffect(() => {
    // Create tracks...
    return () => {
        tracks.forEach((track) => track.dispose())
    }
}, [roomName]) // Chỉ depend on roomName
```

---

## 🔧 Các thay đổi cần thiết

### 1. **Fix video rendering trong `page.tsx`**

- ✅ Attach local video với proper attributes
- ✅ Attach remote video với setTimeout để đợi DOM ready
- ✅ Style video elements với correct z-index
- ✅ Handle video container lifecycle properly
- ✅ Show/hide placeholder based on video availability

### 2. **Fix event handlers trong `useJitsiConnection.tsx`**

- ✅ Setup conference handlers trước khi join
- ✅ Properly handle USER_JOINED và USER_LEFT
- ✅ Properly handle TRACK_ADDED và TRACK_REMOVED
- ✅ Track mute/unmute states correctly

### 3. **Fix track lifecycle**

- ✅ Prevent track recreation on every render
- ✅ Fix useEffect dependencies
- ✅ Proper cleanup on unmount
- ✅ Handle device toggle without recreating tracks

---

## 📁 Files cần sửa

1. **`page.tsx` (room/[id])** - Fix video rendering và remote track handlers
2. **`useJitsiConnection.tsx`** - Fix event handlers và track lifecycle
3. **`globals.css`** - Add video styling
4. **`new/page.tsx`** - Improve permission flow (optional)

---

## 📚 Tài liệu liên quan

- `2-huong-dan-setup-jitsi-server.md` - Setup Jitsi server
- `3-sua-loi-connection.md` - Fix connection issues
- `4-sua-loi-video.md` - Fix video rendering
- `5-sua-loi-device-permissions.md` - Fix device permissions
- `6-best-practices.md` - Best practices cho lib-jitsi-meet
