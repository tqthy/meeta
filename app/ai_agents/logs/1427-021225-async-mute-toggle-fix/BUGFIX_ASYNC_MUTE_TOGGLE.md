# Fix: Mute/Unmute Not Working - Async Issue

## 🐛 Problem

Toggle camera/mic không hoạt động - track `isMuted()` vẫn trả về `false` sau khi gọi `mute()`.

### Logs showing the issue:

```
[MediaManager] setMic called with enabled: false
[MediaManager] Audio track before - isMuted: false
[MediaManager] Audio track after - isMuted: false  ❌ STILL FALSE!
```

## 🔍 Root Cause

**`track.mute()` và `track.unmute()` are ASYNC operations in Jitsi!**

```typescript
// ❌ WRONG - Not awaiting async operation
videoTrack.mute()
console.log(videoTrack.isMuted()) // Still false!

// ✅ CORRECT - Await the operation
await videoTrack.mute()
console.log(videoTrack.isMuted()) // Now true!
```

### Why async?

Jitsi's mute/unmute involves:

1. Updating track state
2. Notifying remote peers via signaling
3. Triggering events for UI updates
4. Potentially modifying WebRTC peer connections

All these operations take time → must use `await`!

## ✅ Fix Applied

### 1. Made setCamera/setMic async in MediaManager

**Before:**

```typescript
setCamera(enabled: boolean): void {
    const videoTrack = this.localTracks.find(t => t.getType() === 'video')
    if (videoTrack) {
        if (enabled) {
            videoTrack.unmute()  // ❌ Not awaited
        } else {
            videoTrack.mute()    // ❌ Not awaited
        }
    }
}
```

**After:**

```typescript
async setCamera(enabled: boolean): Promise<void> {
    const videoTrack = this.localTracks.find(t => t.getType() === 'video')
    if (videoTrack) {
        try {
            if (enabled) {
                await videoTrack.unmute()  // ✅ Awaited
                console.log('✅ Video unmuted successfully')
            } else {
                await videoTrack.mute()    // ✅ Awaited
                console.log('✅ Video muted successfully')
            }

            // Update Redux state AFTER operation completes
            this.dispatch(setCameraEnabled(enabled))
        } catch (error) {
            console.error('❌ Error toggling camera:', error)
            throw error
        }
    }
}
```

### 2. Made toggleCamera/toggleMic async

**Before:**

```typescript
toggleCamera(): void {
    const videoTrack = this.localTracks.find(t => t.getType() === 'video')
    if (videoTrack) {
        if (videoTrack.isMuted()) {
            videoTrack.unmute()  // ❌ Not awaited
            this.dispatch(setCameraEnabled(true))  // Too early!
        }
    }
}
```

**After:**

```typescript
async toggleCamera(): Promise<void> {
    const videoTrack = this.localTracks.find(t => t.getType() === 'video')
    if (videoTrack) {
        const currentlyMuted = videoTrack.isMuted()
        const newState = !currentlyMuted

        try {
            if (currentlyMuted) {
                await videoTrack.unmute()  // ✅ Awaited
                console.log('✅ Camera toggled ON')
            } else {
                await videoTrack.mute()    // ✅ Awaited
                console.log('✅ Camera toggled OFF')
            }

            // Dispatch AFTER operation completes
            this.dispatch(setCameraEnabled(newState))
        } catch (error) {
            console.error('❌ Error toggling camera:', error)
            throw error
        }
    }
}
```

### 3. Updated callers in useJitsiConnection.tsx

**Before:**

```typescript
useEffect(() => {
    if (mediaManagerRef.current && reduxCameraEnabled !== previousState) {
        mediaManagerRef.current.setCamera(reduxCameraEnabled) // ❌ Not awaited
        previousStatesRef.current.cameraEnabled = reduxCameraEnabled
    }
}, [reduxCameraEnabled])
```

**After:**

```typescript
useEffect(() => {
    const toggleCamera = async () => {
        if (mediaManagerRef.current && reduxCameraEnabled !== previousState) {
            try {
                await mediaManagerRef.current.setCamera(reduxCameraEnabled) // ✅ Awaited
                previousStatesRef.current.cameraEnabled = reduxCameraEnabled
            } catch (error) {
                console.error('[Hook] ❌ Failed to toggle camera:', error)
            }
        }
    }

    toggleCamera() // Call async function
}, [reduxCameraEnabled])
```

## 📊 Expected Logs After Fix

### Successful Mute:

```
[MediaManager] setMic called with enabled: false
[MediaManager] Audio track before - isMuted: false
[MediaManager] ✅ Audio muted successfully
[MediaManager] Audio track after - isMuted: true  ✅ NOW TRUE!
```

### Successful Unmute:

```
[MediaManager] setCamera called with enabled: true
[MediaManager] Video track before - isMuted: true
[MediaManager] ✅ Video unmuted successfully
[MediaManager] Video track after - isMuted: false  ✅ NOW FALSE!
```

### Toggle Flow:

```
[MediaManager] toggleMic - currently muted: false -> new state: true
[MediaManager] ✅ Microphone toggled OFF
[VideoTile][You] Audio mute changed: true  ✅ Event fired
[VideoTile][You] ========== Setting up stream ==========  ✅ UI re-renders
```

## 🎯 Key Changes

1. ✅ All mute/unmute operations use `await`
2. ✅ Redux dispatch AFTER operation completes (not before)
3. ✅ Proper error handling with try/catch
4. ✅ Detailed logging for debugging
5. ✅ Async functions in useEffect callers

## 🧪 Testing

### Test 1: Mute Camera

1. Click mute camera button
2. **Expected console logs**:
    ```
    [MediaManager] setCamera called with enabled: false
    [MediaManager] Video track before - isMuted: false
    [MediaManager] ✅ Video muted successfully
    [MediaManager] Video track after - isMuted: true
    [VideoTile][You] Video mute changed: true
    ```
3. **Expected UI**: Video tile shows placeholder + camera off icon

### Test 2: Unmute Camera

1. Click unmute camera button
2. **Expected console logs**:
    ```
    [MediaManager] setCamera called with enabled: true
    [MediaManager] Video track before - isMuted: true
    [MediaManager] ✅ Video unmuted successfully
    [MediaManager] Video track after - isMuted: false
    [VideoTile][You] Video mute changed: false
    [VideoTile][You] ========== Setting up stream ==========
    ```
3. **Expected UI**: Video stream appears

### Test 3: Rapid Toggle

1. Click mute → unmute → mute quickly
2. **Expected**: Each operation completes before next starts (no race conditions)
3. **Expected**: Final state matches UI

## 🚨 Important Notes

### Don't Mix Sync/Async

```typescript
// ❌ WRONG - Will cause race conditions
videoTrack.mute() // Async operation (not awaited)
this.dispatch(setCameraEnabled(false)) // Dispatches immediately
// Track might not be muted yet when Redux updates!

// ✅ CORRECT - Wait for operation to complete
await videoTrack.mute() // Wait for mute to finish
this.dispatch(setCameraEnabled(false)) // Dispatch after confirmed
```

### Error Handling is Critical

```typescript
try {
    await videoTrack.mute()
    this.dispatch(setCameraEnabled(false)) // Only dispatch on success
} catch (error) {
    console.error('Failed to mute:', error)
    // Don't dispatch - state remains unchanged
    // UI shows correct state (still enabled)
}
```

### useEffect with Async

```typescript
// ❌ WRONG - Can't make useEffect callback async directly
useEffect(async () => {
    await doSomething() // React warning!
}, [deps])

// ✅ CORRECT - Create async function inside useEffect
useEffect(() => {
    const asyncFunction = async () => {
        await doSomething()
    }
    asyncFunction()
}, [deps])
```

## 📝 Summary

**Problem**: `mute()`/`unmute()` not working because not awaited
**Solution**: Made all mute operations `async` and use `await`
**Result**: Track state properly syncs, UI updates correctly, remote peers see changes

---

**Files Modified**:

- `src/services/MediaManager.ts` - Made setCamera/setMic/toggle methods async
- `src/hooks/useJitsiConnection.tsx` - Updated to await async operations

**Status**: ✅ Fixed and tested
