# Redux Refactor - Tách biệt quản lý Media và Connection

**Thời gian**: 23:39 - 01/12/2025

## Mục tiêu

Tái cấu trúc code để:

1. Tách biệt quản lý media và connection state
2. Sử dụng Redux cho state management
3. Tách logic vào Service classes
4. Đảm bảo cleanup đầy đủ khi rời cuộc họp

## Thay đổi chính

### 1. Redux Store Structure

```
src/store/
├── index.ts              # Configure store, typed hooks
├── slices/
    ├── mediaSlice.ts     # Media state management
    └── connectionSlice.ts # Connection state management
```

#### mediaSlice.ts

- **State quản lý**:
    - `localTracks`: Danh sách local tracks (audio/video)
    - `remoteTracks`: Map các remote tracks theo participantId
    - `cameraEnabled`, `micEnabled`: Trạng thái devices
    - `audioLevel`: Map audio levels cho visualization
    - `devices`: Danh sách available devices
    - `selectedDevices`: Devices đang được chọn
    - `isCreatingTracks`, `trackError`: Track creation state

- **Actions**:
    - Track management: `setLocalTracks`, `addRemoteTrack`, `removeRemoteTrack`
    - Controls: `toggleCamera`, `toggleMic`, `setCameraEnabled`, `setMicEnabled`
    - Audio levels: `setAudioLevel`
    - Device management: `setDevices`, `setSelectedDevice`
    - Reset: `resetMediaState`

#### connectionSlice.ts

- **State quản lý**:
    - Connection: `isConnected`, `isConnecting`, `connectionError`
    - Conference: `isJoined`, `isJoining`, `conferenceError`, `roomName`
    - Participants: `participants` Map, `dominantSpeakerId`, `localParticipantId`
    - Quality: `connectionQuality`, `isConnectionInterrupted`
    - Retry: `retryCount`, `maxRetries`

- **Actions**:
    - Connection: `setConnecting`, `setConnected`, `setConnectionError`
    - Conference: `setJoining`, `setJoined`, `setConferenceError`, `setRoomName`
    - Participants: `addParticipant`, `removeParticipant`, `updateParticipant`
    - Dominant speaker: `setDominantSpeaker`
    - Quality: `setConnectionQuality`, `setConnectionInterrupted`
    - Retry: `incrementRetryCount`, `resetRetryCount`
    - Reset: `resetConnectionState`

### 2. Service Classes

#### MediaManager (src/services/MediaManager.ts)

**Chức năng**: Quản lý tất cả media operations

**Methods**:

- `createLocalTracks(options?)`: Tạo local audio/video tracks
    - Hỗ trợ constraints cho quality
    - Fallback với basic constraints nếu fail
    - Dispatch Redux actions
- `disposeLocalTracks()`: Dừng và cleanup local tracks
    - Gọi track.dispose() để stop camera/mic
    - Clear tracks khỏi state
- `toggleCamera()`, `toggleMic()`: Toggle devices
- `setCamera(enabled)`, `setMic(enabled)`: Set explicit state

- `handleRemoteTrackAdded(track)`: Xử lý remote track mới
    - Lưu track vào Map theo participantId
    - Setup mute change listener
    - Setup audio level listener cho audio tracks
    - Dispatch to Redux
- `handleRemoteTrackRemoved(track)`: Xử lý remote track removed
    - Remove khỏi Map
    - Cleanup audio level handlers
    - Dispatch to Redux
- `clearAllRemoteTracks()`: Clear tất cả remote tracks
- `cleanup()`: Complete cleanup (dispose local + clear remote)

**Lợi ích**:

- Tập trung logic media vào 1 class
- Dễ test và maintain
- Tách biệt khỏi connection logic

#### JitsiService (src/services/JitsiService.ts)

**Chức năng**: Quản lý Jitsi connection và conference lifecycle

**Methods**:

- `setCallbacks(callbacks)`: Set event callbacks
- `connect(roomName, jwt?)`: Establish connection
    - Tạo JitsiConnection
    - Setup connection event handlers
    - Dispatch connecting/connected state
- `joinConference(userName, localTracks)`: Join conference room
    - Init conference
    - Setup conference event handlers
    - Join room
    - Add local tracks
- `leaveConference()`: Leave conference room
- `disconnect()`: Disconnect from Jitsi
- `cleanup()`: Complete cleanup (leave + disconnect)

**Event Handlers**:

- Connection: ESTABLISHED, FAILED, DISCONNECTED
- Conference: JOINED, LEFT, FAILED
- Participants: USER_JOINED, USER_LEFT, DISPLAY_NAME_CHANGED
- Audio: DOMINANT_SPEAKER_CHANGED
- Quality: CONNECTION_INTERRUPTED, CONNECTION_RESTORED

**Retry Logic**:

- Exponential backoff: 1s → 2s → 4s → 5s max
- Max 3 retries
- Reset count on successful connection

**Lợi ích**:

- Tách biệt connection logic khỏi media
- Centralized event handling
- Easier to add new features

### 3. Refactored Hook

#### useJitsiConnection.v2.tsx

**Thay đổi**:

- Sử dụng Redux hooks (`useAppDispatch`, `useAppSelector`)
- Tạo Service instances trong refs
- Tách logic vào services thay vì trực tiếp trong hook
- Cleanup đầy đủ trong useEffect return

**Flow**:

1. Initialize services (JitsiService, MediaManager)
2. Create local tracks via MediaManager
3. Connect via JitsiService
4. Join conference after connection established
5. Setup remote track handlers
6. Sync camera/mic state với MediaManager
7. Cleanup on unmount

**Return values**:

```typescript
{
  isConnected,    // From Redux
  isJoined,       // From Redux
  localTracks,    // From Redux
  disconnect,     // Async cleanup function
  toggleCamera,   // MediaManager method
  toggleMic,      // MediaManager method
}
```

### 4. Cleanup Strategy

#### Khi rời cuộc họp:

1. **MediaManager.cleanup()**:
    - Dispose local tracks (stop camera/mic)
    - Clear remote tracks
    - Remove audio level handlers
2. **JitsiService.cleanup()**:
    - Leave conference
    - Disconnect connection
    - Clear retry timeout
3. **Redux State Reset**:
    - resetMediaState()
    - resetConnectionState()

#### Implementation:

```typescript
const disconnect = useCallback(async () => {
    // Cleanup services
    await mediaManagerRef.current?.cleanup()
    await jitsiServiceRef.current?.cleanup()

    // Reset Redux
    dispatch(resetMediaState())
    dispatch(resetConnectionState())
}, [dispatch])

// Auto cleanup on unmount
useEffect(() => {
    return () => {
        mediaManagerRef.current?.cleanup()
        jitsiServiceRef.current?.cleanup()
        dispatch(resetMediaState())
        dispatch(resetConnectionState())
    }
}, [dispatch])
```

## Lợi ích

### 1. Separation of Concerns

- Media logic tách khỏi connection logic
- Service classes tách khỏi React hooks
- State management tách khỏi business logic

### 2. Maintainability

- Dễ debug: State trong Redux DevTools
- Dễ test: Services có thể test độc lập
- Dễ extend: Thêm features mới vào đúng service

### 3. Performance

- Redux middleware có thể optimize re-renders
- Service instances persistent qua re-renders
- Proper cleanup prevents memory leaks

### 4. Type Safety

- Redux Toolkit có TypeScript types built-in
- Typed hooks (useAppDispatch, useAppSelector)
- Service classes có clear interfaces

## Migration Guide

### Bước 1: Install dependencies

```bash
npm install @reduxjs/toolkit react-redux
```

### Bước 2: Wrap app với ReduxProvider

```tsx
// app/layout.tsx
import { ReduxProvider } from '@/components/providers/ReduxProvider'

export default function RootLayout({ children }) {
    return (
        <html>
            <body>
                <ReduxProvider>{children}</ReduxProvider>
            </body>
        </html>
    )
}
```

### Bước 3: Thay useJitsiConnection cũ

```tsx
// Cũ
import { useJitsiConnection } from '@/hooks/useJitsiConnection'

// Mới
import { useJitsiConnection } from '@/hooks/useJitsiConnection.v2'
```

### Bước 4: Access state từ Redux (optional)

```tsx
import { useAppSelector } from '@/store'

// Trong component
const participants = useAppSelector((state) => state.connection.participants)
const remoteTracks = useAppSelector((state) => state.media.remoteTracks)
const connectionQuality = useAppSelector(
    (state) => state.connection.connectionQuality
)
```

## Testing

### Manual Tests

- [ ] Join meeting → camera/mic hoạt động
- [ ] Toggle camera/mic → state cập nhật
- [ ] Leave meeting → devices tắt hoàn toàn
- [ ] Refresh page → cleanup chạy đúng
- [ ] Join lại → không có tracks cũ
- [ ] Multiple participants → remote tracks hiển thị
- [ ] Connection interrupted → reconnect tự động
- [ ] Check chrome://webrtc-internals → không còn active tracks sau leave

### Automated Tests (TODO)

- Unit tests cho Redux slices
- Unit tests cho Services
- Integration tests cho hook
- E2E tests cho full flow

## Files Created

```
src/
├── store/
│   ├── index.ts                          # Redux store config
│   └── slices/
│       ├── mediaSlice.ts                 # Media state
│       └── connectionSlice.ts            # Connection state
├── services/
│   ├── MediaManager.ts                   # Media operations
│   ├── JitsiService.ts                   # Connection/conference
│   └── CLEANUP_STRATEGY.md              # Cleanup documentation
├── hooks/
│   └── useJitsiConnection.v2.tsx        # Refactored hook
└── components/
    └── providers/
        └── ReduxProvider.tsx            # Redux provider
```

## Next Steps

1. **Test thoroughly**: Test tất cả flows
2. **Update components**: Migrate components sang hook mới
3. **Add DevTools**: Enable Redux DevTools Extension
4. **Performance monitoring**: Track re-renders và memory
5. **Add more features**:
    - Device selection UI
    - Audio visualization
    - Connection quality indicator
    - Screen sharing support
6. **Write tests**: Unit + integration tests

## References

- Redux Toolkit: https://redux-toolkit.js.org/
- Jitsi Meet API: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-ljm-api
- Service Pattern: https://en.wikipedia.org/wiki/Service_locator_pattern
