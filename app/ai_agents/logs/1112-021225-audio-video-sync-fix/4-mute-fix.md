# Quick Debug - Video Element Still Black

## Issue Found ✅

**Problem**: Video element bị `muted` attribute khiến nó không auto-play và không phát audio

## Root Cause

```typescript
// ❌ WRONG - ALL video elements bị mute, kể cả remote participants
<video muted autoPlay playsInline />

// ✅ CORRECT - Chỉ mute local participant (để tránh double audio)
<video muted={isLocalParticipant} autoPlay playsInline />
```

## Solutions Applied

### 1. Smart Mute Logic

- **Local Participant**: `muted={true}` (prevent double audio from being heard)
- **Remote Participants**: `muted={false}` (allow audio playback)

### 2. Better Stream Attachment

- Added explicit `console.log` for debugging
- Added `handlePlay` event listener (when video actually starts playing)
- Force `videoElement.play()` with error handling
- Removed listener duplication issues

### 3. Added Missing Prop

- New prop: `isLocalParticipant` to identify local user
- Passed to all VideoTile components in all layout modes

## Changes Made

### video-tile.tsx

```typescript
// Added prop
isLocalParticipant?: boolean

// Smart mute attribute
muted={isLocalParticipant}

// Better stream attachment
videoElement.play().catch(err => {
    console.warn('[VideoTile] Auto-play failed for', name, ':', err)
})
```

### page.tsx (3 locations updated)

```typescript
isLocalParticipant={participant.isLocalParticipant}
```

## Expected Behavior Now

✅ **Remote participants' video** will be visible and audio will play
✅ **Local participant** will not have double audio
✅ **Loading indicator** will show until stream is ready
✅ **Error handling** will gracefully fall back if needed

## Browser Console Should Show

```
[VideoTile] Attaching stream to User1 with tracks: ["video","audio"]
[VideoTile] Stream metadata loaded for User1
[VideoTile] Stream playing for User1
```

## If Still Not Working

1. **Check browser console** for error messages
2. **Test different browser** (Chrome, Firefox, etc)
3. **Check microphone permissions** are granted
4. **Verify tracks are being passed** - check Redux store
5. **Monitor network** - ensure data is flowing

## Technical Details

### Why Smart Mute?

- HTML video element plays audio from ALL tracks in the MediaStream
- If local participant audio is included, user hears themselves
- Solution: Keep local participant muted, unmute remote participants

### MediaStream Structure

```
Remote Participant Stream:
├─ VideoTrack
└─ AudioTrack ← unmuted, so audio plays ✅

Local Participant Stream:
├─ VideoTrack
└─ AudioTrack ← muted, so no echo ✅
```

## Status

✅ **Fixed** - Video should now display with audio working
🧪 **Test** - Join a test call and verify audio plays
