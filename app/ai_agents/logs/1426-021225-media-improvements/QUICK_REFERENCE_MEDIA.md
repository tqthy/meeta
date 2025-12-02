# Quick Reference - Media Device Management

## 🎯 Tóm tắt nhanh

Đã cải thiện `MediaManager` dựa trên patterns từ Jitsi Meet để xử lý:

- ✅ Device hotplug (cắm/rút thiết bị tự động)
- ✅ Graceful fallback (audio/video fail riêng)
- ✅ Device preferences (nhớ thiết bị user chọn)
- ✅ Safe track operations (check disposed/ended)

## 📁 Files mới

```
src/
├── services/
│   ├── MediaManager.ts                    # UPDATED - Main manager
│   ├── MediaDeviceHelper.ts               # NEW - Helper functions
│   └── MEDIA_DEVICE_IMPROVEMENTS.md       # NEW - Full docs
├── store/slices/
│   └── settingsSlice.ts                   # NEW - User preferences
└── components/
    └── DeviceSettingsModal.tsx            # NEW - Settings UI
```

## 🚀 Quick Start

### 1. Create MediaManager instance

```tsx
import { MediaManager } from '@/services/MediaManager'
import { useAppDispatch } from '@/store/hooks'

const dispatch = useAppDispatch()
const mediaManager = useMemo(() => new MediaManager(dispatch), [dispatch])
```

### 2. Create tracks (auto-handles device changes)

```tsx
await mediaManager.createLocalTracks({
    cameraEnabled: true,
    micEnabled: true,
})

// Device changes được handle tự động!
```

### 3. Switch devices manually

```tsx
// Switch camera
await mediaManager.switchCamera('device-id-123')

// Switch microphone
await mediaManager.switchMicrophone('device-id-456')

// Save preference
dispatch(
    setPreferredCameraDeviceId({
        deviceId: 'device-id-123',
        deviceLabel: 'HD Webcam',
    })
)
```

### 4. Add Settings UI

```tsx
import { DeviceSettingsModal } from '@/components/DeviceSettingsModal'

;<DeviceSettingsModal
    mediaManager={mediaManager}
    isOpen={showSettings}
    onClose={() => setShowSettings(false)}
/>
```

## 🔧 Common Operations

### Get available devices

```typescript
const devices = mediaManager.getAvailableDevices()
const { audioinput, videoinput, audiooutput } = mediaManager.getDevicesByKind()
```

### Check device availability

```typescript
if (mediaManager.isDeviceAvailable('device-id', 'videoinput')) {
    await mediaManager.switchCamera('device-id')
}
```

### Get preferences from Redux

```typescript
import { useAppSelector } from '@/store/hooks'
import {
    selectPreferredCameraDeviceId,
    selectPreferredMicDeviceId,
} from '@/store/slices/settingsSlice'

const preferredCameraId = useAppSelector(selectPreferredCameraDeviceId)
const preferredMicId = useAppSelector(selectPreferredMicDeviceId)
```

## 🎨 Key Patterns

### Pattern 1: Safe track disposal

```typescript
// ✅ Check state before disposal
if (!track.disposed && !track.isEnded?.()) {
    track.dispose()
}
```

### Pattern 2: Graceful fallback

```typescript
// ✅ Separate audio/video errors
const { tracks, audioError, videoError } = await createTracksWithFallback(...)

if (audioError) console.error('Mic failed:', audioError)
if (videoError) console.error('Camera failed:', videoError)

// Still return available tracks
return tracks.filter(t => t !== undefined)
```

### Pattern 3: Device preference logic

```typescript
// ✅ Auto-switch to preferred device
if (
    preferredDeviceId &&
    preferredDeviceId !== currentDeviceId &&
    isDeviceAvailable(preferredDeviceId)
) {
    return preferredDeviceId // Switch!
}
```

## 🧪 Testing Scenarios

1. **Device hotplug**
    - Cắm external webcam → auto-switch
    - Rút external webcam → fallback to built-in

2. **Partial permissions**
    - Deny camera, allow mic → only mic track
    - Grant camera later → camera track created

3. **Manual switching**
    - Switch in settings → new track created
    - Mute state preserved

## 📚 Full Documentation

Xem chi tiết tại:

- `src/services/MEDIA_DEVICE_IMPROVEMENTS.md` - Đầy đủ patterns & examples
- `MEDIA_IMPROVEMENTS_SUMMARY.md` - Tổng quan cải tiến
- Jitsi reference: `jitsi-meet/modules/devices/mediaDeviceHelper.js`

## ⚠️ Important Notes

1. **Redux store setup**: Đã add `settingsSlice` vào store
2. **Device listener**: Auto cleanup on unmount
3. **Track disposal**: Always check `disposed` và `isEnded()`
4. **Firefox flow**: Handle "only labels changed" scenario
5. **Error handling**: Separate audio vs video errors

## 🔗 Integration Checklist

- [x] Add `settingsSlice` to Redux store
- [x] Create `MediaDeviceHelper.ts`
- [x] Update `MediaManager.ts`
- [x] Create `DeviceSettingsModal.tsx`
- [ ] Test device hotplug scenarios
- [ ] Test Firefox permission flow
- [ ] Add to pre-call screen (optional)
- [ ] Add persistence with redux-persist (optional)

---

**Quick help**: Xem `MEDIA_IMPROVEMENTS_SUMMARY.md` để biết thêm chi tiết!
