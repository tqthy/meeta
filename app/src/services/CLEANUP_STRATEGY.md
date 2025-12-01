# Device Cleanup Strategy

## Khi nào cleanup devices?

### 1. Khi rời cuộc họp (Leave Conference)

- **Trigger**: User click nút "Leave" hoặc đóng tab
- **Actions**:
    - Remove tất cả local tracks khỏi conference
    - Dispose local tracks (stop camera/mic)
    - Clear remote tracks khỏi memory
    - Leave conference room
    - Disconnect connection

### 2. Khi component unmount

- **Trigger**: User navigate ra khỏi trang meeting
- **Actions**:
    - Cleanup tất cả như trên
    - Reset Redux state về initial
    - Clear tất cả event listeners

## Cleanup Flow

```
User Action (Leave/Unmount)
    ↓
disconnect() được gọi
    ↓
MediaManager.cleanup()
    ├─ disposeLocalTracks()
    │   ├─ Gọi track.dispose() cho mỗi track
    │   └─ Stop camera và microphone stream
    └─ clearAllRemoteTracks()
        ├─ Remove audio level handlers
        └─ Clear remote tracks map
    ↓
JitsiService.cleanup()
    ├─ leaveConference()
    │   └─ conference.leave()
    └─ disconnect()
        └─ connection.disconnect()
    ↓
Redux State Reset
    ├─ resetMediaState()
    └─ resetConnectionState()
```

## Implementation Details

### MediaManager.cleanup()

```typescript
async cleanup(): Promise<void> {
    console.log('[MediaManager] Complete cleanup...')

    // 1. Dispose local tracks (stop devices)
    await this.disposeLocalTracks()

    // 2. Clear remote tracks
    this.clearAllRemoteTracks()
}
```

### disposeLocalTracks()

```typescript
async disposeLocalTracks(): Promise<void> {
    console.log('[MediaManager] Disposing local tracks...')

    for (const track of this.localTracks) {
        try {
            // Dừng camera/mic stream
            track.dispose()
            console.log('[MediaManager] Disposed track:', track.getType())
        } catch (error) {
            console.error('[MediaManager] Failed to dispose track:', error)
        }
    }

    this.localTracks = []
    this.dispatch(clearLocalTracks())
}
```

### JitsiService.cleanup()

```typescript
async cleanup(): Promise<void> {
    console.log('[JitsiService] Complete cleanup...')

    // 1. Leave conference
    await this.leaveConference()

    // 2. Disconnect connection
    this.disconnect()
}
```

### Hook cleanup (useEffect return)

```typescript
useEffect(() => {
    return () => {
        console.log('[Hook] Component unmounting, cleaning up...')

        // Cleanup tracks
        if (mediaManagerRef.current) {
            mediaManagerRef.current.cleanup()
        }

        // Cleanup connection
        if (jitsiServiceRef.current) {
            jitsiServiceRef.current.cleanup()
        }

        // Reset Redux state
        dispatch(resetMediaState())
        dispatch(resetConnectionState())
    }
}, [dispatch])
```

## Testing Checklist

- [ ] Camera và mic indicator tắt sau khi leave
- [ ] Không còn tracks active trong chrome://webrtc-internals
- [ ] Memory không leak sau nhiều lần join/leave
- [ ] Remote participants không nhìn thấy tracks sau khi local user leave
- [ ] Redux state được reset về initial
- [ ] Không còn event listeners active
- [ ] Console không có error khi cleanup

## Common Issues

### Issue 1: Tracks không dispose

**Triệu chứng**: Camera/mic vẫn sáng sau khi leave
**Nguyên nhân**: Không gọi track.dispose()
**Giải pháp**: Đảm bảo dispose được gọi trong cleanup

### Issue 2: Memory leak

**Triệu chứng**: Memory tăng sau mỗi lần join/leave
**Nguyên nhân**: Không clear event listeners hoặc references
**Giải pháp**:

- Clear audio level handlers
- Remove event listeners
- Set refs về null

### Issue 3: Race condition

**Triệu chứng**: Cleanup được gọi nhiều lần
**Nguyên nhân**: Multiple cleanup triggers
**Giải pháp**: Check if already cleaning up
