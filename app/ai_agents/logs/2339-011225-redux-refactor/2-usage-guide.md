# Hướng dẫn sử dụng code mới

## ⚠️ Lưu ý quan trọng

Hook đã được refactor trực tiếp trong `useJitsiConnection.tsx` (không phải version 2).
Hook mới có **backward compatibility** - vẫn export `conference` và `connection` objects cho components cũ.

## Files được tạo

### Redux Store

- `src/store/index.ts` - Configure Redux store
- `src/store/slices/mediaSlice.ts` - Media state management
- `src/store/slices/connectionSlice.ts` - Connection state management

### Services

- `src/services/MediaManager.ts` - Quản lý media operations
- `src/services/JitsiService.ts` - Quản lý connection/conference
- `src/services/CLEANUP_STRATEGY.md` - Documentation về cleanup

### Hook

- `src/hooks/useJitsiConnection.v2.tsx` - Hook refactored mới

### Providers

- `src/components/providers/ReduxProvider.tsx` - Redux Provider component

## Cách migrate sang code mới

### Bước 1: Install dependencies

```bash
cd app
npm install @reduxjs/toolkit react-redux
```

### Bước 2: Wrap app với ReduxProvider

Sửa file `src/app/layout.tsx`:

```tsx
import { ReduxProvider } from '@/components/providers/ReduxProvider'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>
                <ReduxProvider>{children}</ReduxProvider>
            </body>
        </html>
    )
}
```

### Bước 3: Update component sử dụng hook

Thay import từ:

```tsx
import { useJitsiConnection } from '@/hooks/useJitsiConnection'
```

Sang:

```tsx
import { useJitsiConnection } from '@/hooks/useJitsiConnection.v2'
```

API của hook vẫn giữ nguyên:

```tsx
const {
    isConnected,
    isJoined,
    localTracks,
    disconnect,
    toggleCamera,
    toggleMic,
} = useJitsiConnection({
    roomName: 'my-room',
    userName: 'John Doe',
    cameraEnabled: true,
    micEnabled: true,
    jwt: token,
    onConferenceJoined: (room) => console.log('Joined:', room),
    onConferenceLeft: (room) => console.log('Left:', room),
    onConferenceFailed: (error) => console.error('Failed:', error),
    onConnectionEstablished: () => console.log('Connected'),
    onConnectionFailed: (error) => console.error('Connection failed:', error),
})
```

### Bước 4: (Optional) Access Redux state trực tiếp

Nếu cần access thêm state không có trong hook:

```tsx
import { useAppSelector } from '@/store'

function MyComponent() {
  // Access participants
  const participants = useAppSelector(state =>
    Array.from(state.connection.participants.values())
  )

  // Access connection quality
  const connectionQuality = useAppSelector(state =>
    state.connection.connectionQuality
  )

  // Access remote tracks
  const remoteTracks = useAppSelector(state =>
    state.media.remoteTracks
  )

  // Access audio levels
  const audioLevels = useAppSelector(state =>
    state.media.audioLevel
  )

  return (...)
}
```

## Lợi ích của kiến trúc mới

### 1. Tách biệt concerns

- **Media logic** → MediaManager service
- **Connection logic** → JitsiService
- **State management** → Redux slices
- **React integration** → Hook

### 2. Dễ maintain và extend

- Thêm features mới vào đúng service
- Debug state với Redux DevTools
- Test services độc lập

### 3. Performance

- Services persistent qua re-renders
- Redux optimized re-renders
- Proper cleanup prevents memory leaks

### 4. Type safety

- Full TypeScript support
- Typed Redux hooks
- Clear service interfaces

## Testing checklist

Sau khi migrate, test các scenarios:

- [ ] Join meeting → camera/mic hoạt động
- [ ] Toggle camera → UI cập nhật
- [ ] Toggle mic → UI cập nhật
- [ ] Leave meeting → devices tắt hoàn toàn
- [ ] Refresh page trong meeting → cleanup OK
- [ ] Join lại sau leave → không có tracks cũ
- [ ] Multiple participants → remote video hiển thị
- [ ] Check chrome://webrtc-internals → tracks clean sau leave

## Troubleshooting

### Lỗi: "Cannot find module '@/store'"

→ Đảm bảo tsconfig.json có path alias:

```json
{
    "compilerOptions": {
        "paths": {
            "@/*": ["./src/*"]
        }
    }
}
```

### Lỗi: "Invariant failed: could not find react-redux context"

→ Chưa wrap app với ReduxProvider, xem Bước 2

### Lỗi: "A non-serializable value was detected"

→ Normal, đã config ignoredPaths trong store config

### Tracks không cleanup

→ Đảm bảo component unmount hoặc gọi disconnect()

## Debugging

### Redux DevTools

Install extension: https://github.com/reduxjs/redux-devtools

View state changes realtime:

- Actions dispatched
- State before/after
- Time travel debugging

### Console logs

Services có extensive logging:

- `[MediaManager]` prefix cho media logs
- `[JitsiService]` prefix cho connection logs
- `[Hook]` prefix cho hook logs

### Memory profiling

1. Open Chrome DevTools → Memory tab
2. Take heap snapshot
3. Join/leave meeting multiple times
4. Take another snapshot
5. Compare → should not grow significantly
