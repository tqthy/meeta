# Summary: Media Stream Handling Improvements

## Tổng quan cải tiến

Đã cải thiện hệ thống quản lý media devices và streams dựa trên patterns từ **Jitsi Meet's `mediaDeviceHelper.js`**.

## Files đã tạo/cập nhật

### ✅ NEW FILES

1. **`src/services/MediaDeviceHelper.ts`** (344 lines)
    - Helper functions cho device management
    - Device change detection logic
    - Graceful fallback strategies
    - Firefox-specific permission handling

2. **`src/store/slices/settingsSlice.ts`** (107 lines)
    - Redux slice cho user preferences
    - Device preferences (camera, mic, speaker)
    - Display và quality settings
    - Notification preferences

3. **`src/services/MEDIA_DEVICE_IMPROVEMENTS.md`** (401 lines)
    - Documentation đầy đủ về cải tiến
    - Usage examples và patterns
    - Testing scenarios
    - Integration guide

4. **`src/components/DeviceSettingsModal.tsx`** (226 lines)
    - UI component for device selection
    - Real-time device list updates
    - Error handling và loading states
    - Integration với Redux preferences

### ✅ UPDATED FILES

1. **`src/services/MediaManager.ts`**
    - Added device change listener
    - Improved track creation with fallback
    - Added device switching methods
    - Safe track disposal
    - Device availability checks

## Key Features

### 1. 🔌 Device Hotplug Handling

```typescript
// Auto-detect và switch khi user cắm/rút thiết bị
navigator.mediaDevices.addEventListener('devicechange', async () => {
    const changes = getMediaDeviceChanges(...)
    await applyDeviceChanges(changes)
})
```

**Benefits:**

- ✅ Tự động switch sang preferred device khi available
- ✅ Fallback về default khi device bị rút
- ✅ No manual intervention needed

### 2. 🛟 Graceful Fallback

```typescript
// Thử tạo audio+video, nếu fail thì tạo riêng
const { tracks, audioError, videoError } = await createTracksWithFallback(...)

// Partial success được handle gracefully
if (audioError) dispatch(notifyMicError(audioError))
if (videoError) dispatch(notifyCameraError(videoError))
return tracks // Still return available tracks
```

**Benefits:**

- ✅ Camera fail → vẫn có audio
- ✅ Mic fail → vẫn có video
- ✅ Clear error reporting
- ✅ Better user experience

### 3. 💾 Device Preference Persistence

```typescript
// Redux store
interface SettingsState {
    preferredCameraDeviceId: string | null
    preferredMicDeviceId: string | null
    preferredAudioOutputDeviceId: string | null
}

// Auto-restore khi device available
if (preferredDevice && isDeviceAvailable(preferredDeviceId)) {
    await switchCamera(preferredDeviceId)
}
```

**Benefits:**

- ✅ Remember user's device choices
- ✅ Persist across sessions (with localStorage)
- ✅ Auto-restore khi app reload

### 4. 🦊 Firefox Permission Flow

```typescript
// Detect Firefox scenario - user chọn device trong permission dialog
const onlyLabelsChanged = checkIfOnlyLabelsChanged(oldDevices, newDevices)

if (onlyLabelsChanged) {
    // Update preference để match device user đã chọn
    dispatch(
        setPreferredCameraDeviceId({
            deviceId: currentDeviceId,
            deviceLabel: currentDevice.label,
        })
    )
}
```

**Benefits:**

- ✅ Respect user's choice in Firefox permission dialog
- ✅ Prevent unwanted device switching
- ✅ Better UX for Firefox users

### 5. 🔄 Manual Device Switching

```typescript
// Switch camera với mute state preservation
await mediaManager.switchCamera('device-id-123')

// Switch microphone
await mediaManager.switchMicrophone('device-id-456')
```

**Benefits:**

- ✅ Clean API for device switching
- ✅ Preserve mute state
- ✅ Proper cleanup of old tracks
- ✅ Error handling built-in

### 6. 🔒 Safe Track Operations

```typescript
// Check track state trước operations
if (!track.disposed && !track.isEnded?.()) {
    track.dispose()
}
```

**Benefits:**

- ✅ Avoid "already disposed" errors
- ✅ Handle ended tracks gracefully
- ✅ More robust cleanup

## Architecture Improvements

### Before (Old MediaManager)

```
MediaManager
├── createLocalTracks() - Basic creation
├── disposeLocalTracks() - Simple disposal
├── toggleCamera() - Basic toggle
└── toggleMic() - Basic toggle
```

### After (Improved MediaManager)

```
MediaManager
├── Device Change Detection
│   ├── setupDeviceChangeListener()
│   ├── handleDeviceListChanged()
│   └── applyDeviceChanges()
│
├── Advanced Track Creation
│   ├── createLocalTracks() - With fallback
│   ├── createTracksWithFallback() - Graceful fallback
│   └── Device-specific constraints
│
├── Device Management
│   ├── getAvailableDevices()
│   ├── getDevicesByKind()
│   ├── isDeviceAvailable()
│   ├── switchCamera()
│   └── switchMicrophone()
│
└── Safe Operations
    ├── disposeLocalTracks() - State checking
    └── cleanup() - Complete cleanup
```

### New MediaDeviceHelper Module

```
MediaDeviceHelper
├── Device Change Detection
│   ├── checkIfOnlyLabelsChanged()
│   └── getMediaDeviceChanges()
│
├── Device Selection Logic
│   ├── getNewAudioInputDevice()
│   ├── getNewVideoInputDevice()
│   └── getNewAudioOutputDevice()
│
├── Track Creation
│   └── createTracksWithFallback()
│
└── Utilities
    ├── isDeviceAvailable()
    ├── getDeviceInfo()
    └── groupDevicesByKind()
```

## Integration Steps

### Step 1: Add settingsSlice to Redux store

```typescript
// src/store/index.ts
import settingsReducer from './slices/settingsSlice'

export const store = configureStore({
    reducer: {
        media: mediaReducer,
        settings: settingsReducer, // ← ADD THIS
        // ... other reducers
    },
})
```

### Step 2: Use MediaManager with device support

```typescript
// In your component
const dispatch = useAppDispatch()
const mediaManager = useMemo(() => new MediaManager(dispatch), [dispatch])

// Create tracks (will auto-handle device changes)
await mediaManager.createLocalTracks({
    cameraEnabled: true,
    micEnabled: true,
})

// Device changes are handled automatically via 'devicechange' listener
```

### Step 3: Add Device Settings UI

```tsx
import { DeviceSettingsModal } from '@/components/DeviceSettingsModal'

function MyComponent() {
    const [showSettings, setShowSettings] = useState(false)

    return (
        <>
            <button onClick={() => setShowSettings(true)}>
                ⚙️ Device Settings
            </button>

            <DeviceSettingsModal
                mediaManager={mediaManager}
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </>
    )
}
```

### Step 4: Persist preferences (optional)

```typescript
// Add Redux persist for settings slice
import { persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

const settingsPersistConfig = {
    key: 'settings',
    storage,
    whitelist: [
        'preferredCameraDeviceId',
        'preferredMicDeviceId',
        'preferredAudioOutputDeviceId',
    ],
}

const persistedSettingsReducer = persistReducer(
    settingsPersistConfig,
    settingsReducer
)
```

## Testing Checklist

### ✅ Device Hotplug

- [ ] Start with built-in camera
- [ ] Plug external webcam → auto-switch
- [ ] Unplug external webcam → fallback to built-in
- [ ] Preferred device is remembered

### ✅ Partial Permissions

- [ ] Deny camera, allow mic → only mic track
- [ ] Deny mic, allow camera → only video track
- [ ] Grant permission later → track created when available

### ✅ Firefox Permission Flow

- [ ] Open in Firefox
- [ ] Select specific device in permission dialog
- [ ] Check that selected device is saved as preferred
- [ ] No unwanted switching after grant

### ✅ Device Switching

- [ ] Switch camera in settings → video changes
- [ ] Switch microphone → audio changes
- [ ] Mute state is preserved
- [ ] Remote peers see new streams

### ✅ Error Handling

- [ ] Camera fail → show error, still have audio
- [ ] Mic fail → show error, still have video
- [ ] Device not available → graceful fallback
- [ ] Track disposal errors → no crash

## Performance Considerations

### Memory Management

- ✅ Proper track disposal prevents memory leaks
- ✅ Event listener cleanup on unmount
- ✅ Old streams released before creating new ones

### Network Efficiency

- ✅ Only recreate tracks when device actually changes
- ✅ Separate audio/video track creation reduces failures
- ✅ Mute state toggle doesn't recreate tracks

### User Experience

- ✅ Faster initial track creation (parallel if possible)
- ✅ No interruption during device switch
- ✅ Clear feedback on errors
- ✅ Preserved mute state

## Comparison with Jitsi Patterns

| Pattern                     | Jitsi Implementation      | Our Implementation              |
| --------------------------- | ------------------------- | ------------------------------- |
| **Device change detection** | ✅ Full support           | ✅ Full support                 |
| **Graceful fallback**       | ✅ Separate audio/video   | ✅ `createTracksWithFallback()` |
| **Device preference**       | ✅ localStorage           | ✅ Redux + localStorage         |
| **Firefox flow**            | ✅ Label detection        | ✅ `checkIfOnlyLabelsChanged()` |
| **Track disposal safety**   | ✅ disposed/isEnded check | ✅ Same pattern                 |
| **Error separation**        | ✅ audioError/videoError  | ✅ Same pattern                 |

## Future Enhancements

### Potential additions:

1. **Audio output switching** - Set `sinkId` on audio elements
2. **Device quality detection** - Prefer HD devices
3. **Virtual device support** - Handle OBS, Snap Camera, etc.
4. **Analytics** - Track device usage patterns
5. **Device testing** - Pre-call device test UI
6. **Bandwidth adaptation** - Adjust quality based on connection

## References

### Jitsi Source

- `jitsi-meet/modules/devices/mediaDeviceHelper.js` (original)
- `jitsi-meet/react/features/base/devices/` (device functions)
- `jitsi-meet/react/features/base/settings/` (settings management)

### Our Implementation

- `src/services/MediaDeviceHelper.ts` (helper functions)
- `src/services/MediaManager.ts` (main manager)
- `src/store/slices/settingsSlice.ts` (preferences)
- `src/components/DeviceSettingsModal.tsx` (UI)

---

**Tác giả**: Based on Jitsi Meet patterns  
**Ngày tạo**: December 2, 2025  
**Version**: 1.0.0
