# Video Tile Debug Guide

## Issues Fixed

### 1. ❌ Stream không bật lại khi unmute

**Vấn đề**: Khi user unmute camera/mic, video element không cập nhật stream

**Root cause**:

- `useEffect` dependencies không trigger khi track state thay đổi
- Stream không được recreate khi track unmute

**Fix**:

```typescript
// Dependency array includes isVideoMuted, isAudioMuted
useEffect(() => {
    // ...setup stream
}, [videoTrack, audioTrack, name, isVideoMuted, isAudioMuted])
//                                  ^^^^^^^^^^^^^^^ ^^^^^^^^^^^^^^
//                                  These trigger re-render when mute state changes
```

### 2. ❌ Không đồng bộ trạng thái stream

**Vấn đề**: UI state không match với actual track state

**Root cause**:

- Không listen đúng events từ Jitsi tracks
- State không update khi track mute/unmute

**Fix**:

```typescript
// Listen to 'track_mute_changed' event
videoTrack.on('track_mute_changed', (track) => {
    const muted = track.isMuted()
    setIsVideoMuted(muted)
    setHasVideoStream(!muted) // Force re-render
})
```

### 3. ❌ Mic không ngắt truy cập thiết bị khi tắt

**Vấn đề**: Mic indicator vẫn sáng ngay cả khi muted

**Root cause**:

- Jitsi tracks handle muting bằng cách disable track, KHÔNG stop track
- Track vẫn `readyState: 'live'` nhưng `enabled: false`
- Browser vẫn giữ permission vì track chưa stop

**Expected behavior** (theo Jitsi design):

- Mute = disable track (track.enabled = false)
- Unmute = enable track (track.enabled = true)
- Track chỉ stop khi dispose() được gọi

**This is CORRECT behavior** - Mic access không bị ngắt để có thể unmute nhanh!

## Debug Logs Added

### Log Format

```
[VideoTile][ParticipantName] Message
```

### Key Logs to Watch

#### 1. Track State Changes

```typescript
[VideoTile][John] Video mute changed: true track readyState: live
[VideoTile][John] Audio mute changed: false track readyState: live enabled: true
```

#### 2. Stream Setup

```typescript
[VideoTile][John] ========== Setting up stream ==========
[VideoTile][John] Setup details: {
  hasVideoTrack: true,
  hasAudioTrack: true,
  isVideoMuted: false,
  isAudioMuted: false,
  videoReadyState: 'live',
  audioReadyState: 'live'
}
```

#### 3. Track Merging

```typescript
[mergeTracksToStream] Starting merge: { hasVideoTrack: true, hasAudioTrack: true }
[mergeTracksToStream] Adding video track: { id: 'abc123', enabled: true, readyState: 'live' }
[mergeTracksToStream] ✅ Added video track from getOriginalStream
[mergeTracksToStream] Result: ✅ Merged stream has 2 tracks
```

#### 4. Stream Attachment

```typescript
[VideoTile][John] Attaching stream to video element
[VideoTile][John] Calling video.play()
[VideoTile][John] ✅ Play promise resolved
[VideoTile][John] ✅ Stream playing
```

## Common Issues & Solutions

### Issue 1: Video không hiển thị sau unmute

**Debug checklist**:

```typescript
// 1. Check if mute event fired
[VideoTile][John] Video mute changed: false ✅

// 2. Check if useEffect triggered
[VideoTile][John] ========== Setting up stream ========== ✅

// 3. Check if track is valid
videoReadyState: 'live' ✅
enabled: true ✅

// 4. Check if stream was created
[mergeTracksToStream] Result: ✅ Merged stream has 1 tracks ✅

// 5. Check if video.play() succeeded
[VideoTile][John] ✅ Play promise resolved ✅
```

**If fails at step 2**: Dependencies issue

```typescript
// Make sure useEffect has these dependencies:
useEffect(() => {
    // ...
}, [videoTrack, audioTrack, name, isVideoMuted, isAudioMuted])
```

**If fails at step 4**: Track extraction issue

```typescript
// Check track APIs
console.log('Has getOriginalStream:', typeof videoTrack.getOriginalStream)
console.log('Has getStream:', typeof videoTrack.getStream)
```

### Issue 2: Mic không tắt access

**This is CORRECT behavior!**

Jitsi giữ mic access để có thể unmute nhanh. Track chỉ được stop khi:

- User leave room
- Track.dispose() được gọi
- User explicitly revoke permission

**Browser indicator**:

- 🔴 Red = actively capturing (enabled: true)
- ⚫ Gray = permission granted but disabled (enabled: false)

### Issue 3: Audio không nghe được

**Debug checklist**:

```typescript
// 1. Check if audio track in stream
audioTracks: 1 ✅

// 2. Check track state
enabled: true ✅
readyState: 'live' ✅
muted: false ✅

// 3. Check video element
videoElement.muted: false (for local) or undefined (for remote) ✅

// 4. Check if track is local participant
isLocalParticipant: true → videoElement.muted = true ✅ (prevent echo)
isLocalParticipant: false → videoElement.muted = false ✅
```

**If still no audio**:

```typescript
// Check browser audio output
const audioContext = new AudioContext()
console.log('Audio context state:', audioContext.state)

// Check track constraints
const track = audioTrack.getTrack()
console.log('Track constraints:', track.getConstraints())
console.log('Track settings:', track.getSettings())
```

### Issue 4: Stream lag/desync

**Check track readyState**:

```typescript
videoTrack.getTrack().readyState // Should be 'live'
audioTrack.getTrack().readyState // Should be 'live'

// If 'ended', track needs to be recreated
if (track.readyState === 'ended') {
    console.error('Track ended, need to recreate')
}
```

## Testing Scenarios

### Test 1: Mute/Unmute Video

1. Join room with camera ON
2. Click mute camera button
3. **Expected logs**:
    ```
    [VideoTile][You] Video mute changed: true
    [VideoTile][You] ========== Setting up stream ==========
    [VideoTile][You] No active tracks (video muted)
    ```
4. Click unmute camera button
5. **Expected logs**:
    ```
    [VideoTile][You] Video mute changed: false
    [VideoTile][You] ========== Setting up stream ==========
    [mergeTracksToStream] ✅ Added video track
    [VideoTile][You] ✅ Stream playing
    ```

### Test 2: Mute/Unmute Audio

1. Join room with mic ON
2. Click mute mic button
3. **Expected**:
    - Mic indicator turns red 🔴 → gray ⚫
    - Track enabled: true → false
    - Track readyState: 'live' (still active!)
4. Click unmute mic button
5. **Expected**:
    - Mic indicator gray ⚫ → red 🔴
    - Track enabled: false → true

### Test 3: Remote Participant Join

1. Remote user joins
2. **Expected logs**:
    ```
    [VideoTile][RemoteUser] ========== Setting up stream ==========
    [mergeTracksToStream] Starting merge
    [mergeTracksToStream] ✅ Added video track
    [mergeTracksToStream] ✅ Added audio track
    [VideoTile][RemoteUser] ✅ Successfully merged stream
    ```

### Test 4: Network Issues

1. Simulate network drop
2. **Expected logs**:
    ```
    [VideoTile][RemoteUser] Track readyState changed: live → ended
    [VideoTile][RemoteUser] ❌ Error playing stream
    ```

## Performance Tips

### 1. Reduce Re-renders

```typescript
// ❌ Don't create new objects in render
const trackInfo = { hasVideo: !!videoTrack, hasAudio: !!audioTrack }

// ✅ Use memo
const trackInfo = useMemo(
    () => ({
        hasVideo: !!videoTrack,
        hasAudio: !!audioTrack,
    }),
    [videoTrack, audioTrack]
)
```

### 2. Cleanup Properly

```typescript
// Always cleanup event listeners
return () => {
    videoTrack?.off('track_mute_changed', handler)
    audioTrack?.off('track_mute_changed', handler)
}
```

### 3. Don't Stop Tracks in Video Tile

```typescript
// ❌ DON'T stop tracks - MediaManager handles this
track.stop()

// ✅ Just clear srcObject
videoElement.srcObject = null
```

## Tools

### Chrome DevTools

1. **Media Panel**: chrome://webrtc-internals
2. **Console**: Filter by `[VideoTile]` or `[mergeTracksToStream]`
3. **Performance**: Record to see re-renders

### Firefox DevTools

1. **about:webrtc**: View track stats
2. **Console**: Filter logs by participant name

## Quick Commands

```typescript
// In browser console

// Get all video elements
document.querySelectorAll('video')

// Check stream on specific video
const video = document.querySelector('video')
console.log(video.srcObject?.getTracks())

// Check track states
video.srcObject?.getTracks().forEach((t) => {
    console.log(t.kind, t.enabled, t.readyState, t.muted)
})
```

## Summary

✅ **Fixed**: Stream recreates when mute state changes
✅ **Fixed**: Track state properly synced with UI
✅ **Clarified**: Mic access behavior is correct (Jitsi design)
✅ **Added**: Comprehensive debug logs
✅ **Added**: Error handling and edge cases

**Key takeaway**: Jitsi tracks don't stop when muted - they just disable. This is for fast unmute performance!
