# Media Device Management - Improvements Based on Jitsi

## Overview

Đã cải thiện `MediaManager` và tạo `MediaDeviceHelper` dựa trên patterns từ `jitsi-meet/modules/devices/mediaDeviceHelper.js`.

## Key Improvements

### 1. **Device Change Detection & Auto-Switching**

Tự động phát hiện khi user cắm/rút thiết bị và switch sang preferred device:

```typescript
// MediaManager tự động listen 'devicechange' events
private setupDeviceChangeListener(): void {
    navigator.mediaDevices.addEventListener('devicechange', async () => {
        await this.handleDeviceListChanged()
    })
}
```

**Scenario:**

- User đang dùng built-in camera
- User cắm external webcam (preferred device)
- ✅ System tự động switch sang external webcam

### 2. **Graceful Fallback**

Thử tạo audio+video cùng lúc, nếu fail thì tạo riêng lẻ:

```typescript
const { tracks, audioError, videoError } = await createTracksWithFallback(
    createLocalTracks,
    cameraDeviceId,
    micDeviceId
)

// ✅ Nếu camera fail, vẫn có audio
// ✅ Nếu mic fail, vẫn có video
// ✅ Partial errors được report riêng
```

### 3. **Device Preference Persistence**

User preferences được lưu trong Redux và respect khi có device changes:

```typescript
// Redux store
interface SettingsState {
    preferredCameraDeviceId: string | null
    preferredMicDeviceId: string | null
    preferredAudioOutputDeviceId: string | null
}

// Auto-restore preferred device khi available
if (preferredDevice && preferredDevice !== currentDevice) {
    return preferredDeviceId // Switch to preferred
}
```

### 4. **Firefox Permission Flow**

Xử lý đặc biệt cho Firefox - user chọn device trong permission dialog:

```typescript
// Detect "only labels changed" (Firefox scenario)
const onlyLabelsChanged = checkIfOnlyLabelsChanged(oldDevices, newDevices)

if (onlyLabelsChanged) {
    // User vừa chọn device trong permission dialog
    // Update preference để match với device user chọn
    dispatch(
        setPreferredMicDeviceId({
            deviceId: currentDeviceId,
            deviceLabel: currentDevice.label,
        })
    )
}
```

### 5. **Safe Track Disposal**

Check track state trước khi dispose (tránh errors):

```typescript
async disposeLocalTracks(): Promise<void> {
    for (const track of this.localTracks) {
        // Check disposed/ended state (Jitsi pattern)
        if (track.disposed || track.isEnded?.()) {
            continue
        }
        track.dispose()
    }
}
```

### 6. **Device Switching Methods**

Manual device switching với proper cleanup:

```typescript
// Switch camera
await mediaManager.switchCamera('device-id-123')

// Switch microphone
await mediaManager.switchMicrophone('device-id-456')

// ✅ Preserve mute state
// ✅ Proper disposal of old track
// ✅ Create new track with specific device
```

## Architecture

### File Structure

```
src/services/
├── MediaManager.ts          # Main manager (improved)
└── MediaDeviceHelper.ts     # Device logic helpers (NEW)

src/store/slices/
├── mediaSlice.ts           # Media tracks state
└── settingsSlice.ts        # User preferences (NEW)
```

### MediaDeviceHelper Functions

```typescript
// Check if only labels changed (Firefox flow)
checkIfOnlyLabelsChanged(oldDevices, newDevices): boolean

// Determine new device after device list change
getNewAudioInputDevice(...): string | undefined
getNewVideoInputDevice(...): string | undefined
getNewAudioOutputDevice(...): string | undefined

// Aggregate all changes
getMediaDeviceChanges(...): MediaDeviceChange

// Create tracks with fallback
createTracksWithFallback(...): Promise<{
    tracks: any[]
    audioError?: Error
    videoError?: Error
}>

// Utility functions
isDeviceAvailable(deviceId, kind, devices): boolean
groupDevicesByKind(devices): { audioinput, videoinput, audiooutput }
```

### MediaManager New Methods

```typescript
class MediaManager {
    // Device info
    getAvailableDevices(): MediaDeviceInfo[]
    getDevicesByKind(): { audioinput; videoinput; audiooutput }
    isDeviceAvailable(deviceId, kind): boolean

    // Device switching
    switchCamera(deviceId): Promise<void>
    switchMicrophone(deviceId): Promise<void>

    // Improved track creation
    createLocalTracks(options?: {
        cameraEnabled?: boolean
        micEnabled?: boolean
        cameraDeviceId?: string // NEW
        micDeviceId?: string // NEW
    }): Promise<any[]>
}
```

## Usage Examples

### Example 1: Get Available Devices

```typescript
const mediaManager = new MediaManager(dispatch)

// Get all devices
const devices = mediaManager.getAvailableDevices()

// Get grouped by kind
const { audioinput, videoinput, audiooutput } = mediaManager.getDevicesByKind()

// Check specific device
const isAvailable = mediaManager.isDeviceAvailable('device-123', 'videoinput')
```

### Example 2: Create Tracks with Specific Device

```typescript
// User selects camera from settings
const selectedCameraId = 'camera-device-id'

await mediaManager.createLocalTracks({
    cameraEnabled: true,
    micEnabled: true,
    cameraDeviceId: selectedCameraId,
})

// ✅ Creates tracks with specific device
// ✅ Falls back gracefully if device unavailable
// ✅ Partial success if one device fails
```

### Example 3: Handle Device Changes

```typescript
// MediaManager tự động handle, nhưng có thể custom:

// In component
useEffect(() => {
    const handleDeviceChange = async () => {
        const devices = await navigator.mediaDevices.enumerateDevices()
        console.log('Devices changed:', devices)

        // MediaManager đã tự động switch nếu cần
        // Hoặc update UI để show new devices
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
        navigator.mediaDevices.removeEventListener(
            'devicechange',
            handleDeviceChange
        )
    }
}, [])
```

### Example 4: Switch Device Manually

```typescript
// Settings UI - user selects new camera
const onCameraSelect = async (deviceId: string) => {
    try {
        await mediaManager.switchCamera(deviceId)

        // Save preference
        dispatch(
            setPreferredCameraDeviceId({
                deviceId,
                deviceLabel: device.label,
            })
        )

        toast.success('Camera switched successfully')
    } catch (error) {
        toast.error('Failed to switch camera')
    }
}
```

### Example 5: Settings Component

```tsx
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
    setPreferredCameraDeviceId,
    selectPreferredCameraDeviceId,
} from '@/store/slices/settingsSlice'

function DeviceSettings() {
    const dispatch = useAppDispatch()
    const preferredCameraId = useAppSelector(selectPreferredCameraDeviceId)
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(setDevices)
    }, [])

    const cameras = devices.filter((d) => d.kind === 'videoinput')

    const handleSelect = (deviceId: string, label: string) => {
        dispatch(setPreferredCameraDeviceId({ deviceId, deviceLabel: label }))
        mediaManager.switchCamera(deviceId)
    }

    return (
        <select
            value={preferredCameraId || ''}
            onChange={(e) => {
                const device = cameras.find(
                    (d) => d.deviceId === e.target.value
                )
                if (device) handleSelect(device.deviceId, device.label)
            }}
        >
            {cameras.map((camera) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || 'Unknown Camera'}
                </option>
            ))}
        </select>
    )
}
```

## Key Patterns from Jitsi

### Pattern 1: Check Track State Before Operations

```typescript
// ❌ Unsafe
track.dispose()

// ✅ Safe (Jitsi pattern)
if (!track.disposed && !track.isEnded?.()) {
    track.dispose()
}
```

### Pattern 2: Device Availability Check

```typescript
// ❌ Direct switch
await switchCamera(newDeviceId)

// ✅ Check availability first
if (isDeviceAvailable(newDeviceId, 'videoinput')) {
    await switchCamera(newDeviceId)
} else {
    throw new Error('Device not available')
}
```

### Pattern 3: Separate Error Handling

```typescript
// ✅ Jitsi pattern - separate audio/video errors
const { tracks, audioError, videoError } = await createTracksWithFallback(...)

if (audioError) {
    dispatch(notifyMicError(audioError))
}
if (videoError) {
    dispatch(notifyCameraError(videoError))
}

// Still return partial tracks
return tracks.filter(t => t !== undefined)
```

### Pattern 4: Preferred Device Logic

```typescript
// Current device không available → fallback to default
if (!isDeviceAvailable(currentDeviceId)) {
    return 'default'
}

// Preferred device vừa được cắm → switch to it
if (
    preferredDeviceId &&
    preferredDeviceId !== currentDeviceId &&
    isDeviceAvailable(preferredDeviceId)
) {
    return preferredDeviceId
}
```

## Testing Scenarios

### Scenario 1: Device Hotplug

1. Start with built-in camera/mic
2. Plug in external webcam (set as preferred)
3. **Expected**: Auto-switch to external webcam
4. Unplug external webcam
5. **Expected**: Fallback to built-in camera

### Scenario 2: Partial Permission

1. Deny camera permission, allow mic
2. **Expected**: Only mic track created, no crash
3. Later grant camera permission
4. **Expected**: Camera track created when available

### Scenario 3: Firefox Permission Dialog

1. Open app in Firefox
2. Permission dialog shows device list
3. User selects specific camera (not default)
4. **Expected**: Selected camera is saved as preferred

### Scenario 4: Device Switch During Call

1. In active call with camera on
2. Switch to different camera in settings
3. **Expected**:
    - Old track disposed
    - New track created with new device
    - Mute state preserved
    - Peers see new video

## Integration with Redux Store

Make sure to add `settingsSlice` to your store:

```typescript
// src/store/index.ts
import settingsReducer from './slices/settingsSlice'

export const store = configureStore({
    reducer: {
        media: mediaReducer,
        settings: settingsReducer, // ADD THIS
        // ... other reducers
    },
})
```

## Next Steps

1. ✅ Add `settingsSlice` to Redux store
2. ✅ Test device hotplug scenarios
3. ✅ Implement Settings UI component
4. ✅ Add device selection in pre-call screen
5. ✅ Test Firefox permission flow
6. ✅ Add analytics for device changes

## References

- Original: `jitsi-meet/modules/devices/mediaDeviceHelper.js`
- Implementation: `src/services/MediaDeviceHelper.ts`
- Manager: `src/services/MediaManager.ts`
- State: `src/store/slices/settingsSlice.ts`
