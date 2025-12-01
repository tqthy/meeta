# Quick Start Guide - Sửa lỗi nhanh

## 🚀 Các bước thực hiện (15-30 phút)

### Bước 1: Kiểm tra Jitsi Server (1 phút)

**KHÔNG CẦN** thay đổi config! URL và domain hiện tại đã đúng.

Đảm bảo Jitsi server đang chạy tại `localhost:8443`:

- Nếu dùng Docker: `docker ps` để check
- Nếu native install: check services đang chạy
- Test: Mở `https://localhost:8443` trong browser

### Bước 2: Sửa `useJitsiConnection.tsx` - Fix Dependencies (5 phút)

**File:** `src/hooks/useJitsiConnection.tsx`

#### 2.1: Fix track creation useEffect dependencies

Tìm useEffect tạo tracks và sửa dependencies:

```typescript
// Create local tracks
useEffect(() => {
    if (!JitsiMeetJS || !roomName || typeof window === 'undefined') {
        return
    }

    // ✅ Skip nếu đã có tracks
    if (localTracks.length > 0) {
        return
    }

    const createTracks = async () => {
        // ... existing code ...
    }

    createTracks()

    return () => {
        localTracks.forEach((track) => {
            try {
                track.dispose()
            } catch (error) {
                console.error('[Jitsi] Failed to dispose track:', error)
            }
        })
    }
}, [roomName, JitsiMeetJS]) // ✅ CHỈ depend on roomName, KHÔNG depend on cameraEnabled/micEnabled
```

### Bước 3: Sửa Video Rendering trong `page.tsx` (10 phút)

**File:** `src/app/room/[id]/page.tsx`

#### 3.1: Sửa local video attachment

Tìm useEffect attach local video và thay thế toàn bộ:

```typescript
// Attach local video tracks to DOM
useEffect(() => {
    if (!localTracks || localTracks.length === 0) return

    const videoTrack = localTracks.find((track) => track.getType() === 'video')

    if (videoTrack && videoContainerRef.current) {
        try {
            const videoElement = videoTrack.attach() as HTMLVideoElement

            videoElement.autoplay = true
            videoElement.playsInline = true
            videoElement.muted = true
            videoElement.style.width = '100%'
            videoElement.style.height = '100%'
            videoElement.style.objectFit = 'cover'
            videoElement.style.transform = 'scaleX(-1)'

            videoContainerRef.current.innerHTML = ''
            videoContainerRef.current.appendChild(videoElement)

            console.log('[Video] Local video attached')
        } catch (error) {
            console.error('[Video] Failed to attach local video:', error)
        }
    }

    return () => {
        localTracks.forEach((track) => {
            try {
                if (track.containers && track.containers.length > 0) {
                    track.containers.forEach((container: HTMLElement) => {
                        track.detach(container)
                    })
                }
            } catch (error) {
                console.error('[Video] Failed to detach track:', error)
            }
        })
    }
}, [localTracks])
```

#### 3.2: Sửa remote video attachment

Tìm function `handleRemoteTrackAdded` và thay thế phần attach video:

```typescript
// Attach video track properly
if (track.getType() === 'video') {
    setTimeout(() => {
        const container = document.getElementById(
            `participant-${participantId}`
        )
        if (container) {
            try {
                const videoElement = track.attach() as HTMLVideoElement

                videoElement.autoplay = true
                videoElement.playsInline = true
                videoElement.style.width = '100%'
                videoElement.style.height = '100%'
                videoElement.style.objectFit = 'cover'

                container.innerHTML = ''
                container.appendChild(videoElement)

                console.log('[Video] Remote video attached for:', participantId)
            } catch (error) {
                console.error('[Video] Failed to attach remote video:', error)
            }
        }
    }, 100)
}
```

### Bước 4: Thêm CSS cho video (2 phút)

**File:** `src/app/globals.css`

Thêm vào cuối file:

```css
/* Fix video rendering */
video {
    background-color: #000;
}

[id^='participant-'] video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

#participant-local video {
    transform: scaleX(-1);
}

video {
    -webkit-backface-visibility: hidden;
    -webkit-transform: translateZ(0);
}
```

### Bước 5: Test (5 phút)

1. Stop dev server nếu đang chạy (Ctrl+C)
2. Start lại:
    ```bash
    npm run dev
    ```
3. Mở 2 browser tabs
4. Vào `http://localhost:3000/dashboard/meetings/new`
5. Grant permissions cho camera/mic
6. Tạo room với cùng tên ở cả 2 tabs
7. Kiểm tra:
    - ✅ Connect thành công
    - ✅ Video hiển thị
    - ✅ Remote video hiển thị ở tab kia

---

## 🐛 Nếu vẫn có lỗi

### Lỗi: "CONNECTION_FAILED"

**Nguyên nhân:** Có thể do CORS hoặc firewall

**Giải pháp:**

1. Thử trên incognito mode
2. Disable browser extensions
3. Check browser console cho CORS errors

### Lỗi: Video không hiển thị

**Nguyên nhân:** Video bị che bởi placeholder

**Giải pháp:**

1. Inspect element video tile
2. Kiểm tra z-index của video container
3. Đảm bảo video element có style `position: absolute`

### Lỗi: "NotAllowedError" permission

**Nguyên nhân:** User denied hoặc permissions bị block

**Giải pháp:**

1. Click vào lock icon trong address bar
2. Allow camera và microphone
3. Reload page

---

## 📚 Chi tiết hơn

Nếu cần hiểu rõ hơn hoặc gặp vấn đề phức tạp, đọc các file chi tiết:

1. **`1-van-de-chinh-va-giai-phap.md`** - Tổng quan vấn đề
2. **`2-huong-dan-setup-jitsi-server.md`** - Setup server (nếu cần)
3. **`3-sua-loi-connection.md`** - Fix connection chi tiết
4. **`4-sua-loi-video.md`** - Fix video chi tiết
5. **`5-sua-loi-device-permissions.md`** - Fix permissions chi tiết
6. **`6-best-practices.md`** - Best practices

---

## 🎯 Checklist

- [ ] Kiểm tra Jitsi server đang chạy (localhost:8443)
- [ ] Sửa useEffect dependencies trong useJitsiConnection.tsx
- [ ] Sửa local video attachment trong page.tsx
- [ ] Sửa remote video attachment với setTimeout
- [ ] Fix video container z-index
- [ ] Thêm CSS cho video
- [ ] Test với 2 browsers/tabs
- [ ] ✅ Everything works!

---

## ⏱️ Ước tính thời gian

- **Quick fix (cơ bản):** 15-20 phút
- **Complete fix (đầy đủ):** 30-45 phút
- **With testing:** 1 giờ

Good luck! 🚀
