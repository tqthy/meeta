# Audio-Video Synchronization Fix - Code Changes

## Date: December 2, 2025 (11:12)

## Changes Made

### 1. Fixed VideoTile Component - Merge Audio & Video Streams

**File**: `src/app/room/[id]/components/video-tile.tsx`

**Change**: Added `mergeTracksToStream()` utility function to combine video and audio into single MediaStream

```typescript
/**
 * Hợp nhất video và audio tracks thành một MediaStream
 * Điều này đảm bảo âm thanh được đồng bộ với video
 */
const mergeTracksToStream = (
    videoTrack: any,
    audioTrack: any
): MediaStream | null => {
    try {
        const stream = new MediaStream()

        // Thêm video track
        if (videoTrack && videoTrack.getStream) {
            const videoStream = videoTrack.getStream()
            if (videoStream && videoStream.getVideoTracks().length > 0) {
                videoStream
                    .getVideoTracks()
                    .forEach((track: MediaStreamTrack) => {
                        stream.addTrack(track)
                    })
            }
        }

        // Thêm audio track
        if (audioTrack && audioTrack.getStream) {
            const audioStream = audioTrack.getStream()
            if (audioStream && audioStream.getAudioTracks().length > 0) {
                audioStream
                    .getAudioTracks()
                    .forEach((track: MediaStreamTrack) => {
                        stream.addTrack(track)
                    })
            }
        }

        return stream.getTracks().length > 0 ? stream : null
    } catch (error) {
        console.error('[VideoTile] Error merging tracks:', error)
        return null
    }
}
```

**Why**:

- Jitsi returns video and audio as separate MediaStream objects
- HTML video element needs BOTH tracks in single MediaStream for sync
- MediaStream API allows combining multiple tracks

**Impact**:
✅ Audio now plays synchronized with video
✅ Remote participants' audio is heard
✅ Local participant's audio is included

---

### 2. Fixed Track Detection in useParticipantsManager

**File**: `src/hooks/useParticipantsManager.tsx`

**Change 1**: Fix local participant initialization

```typescript
// OLD - WRONG
const videoTrack = localTracks.find(
    (track) => track.getVideoType() !== undefined
)
const audioTrack = localTracks.find(
    (track) => track.getVideoType() === undefined
)

// NEW - CORRECT
const videoTrack = localTracks.find((track) => track.getType() === 'video')
const audioTrack = localTracks.find((track) => track.getType() === 'audio')
```

**Change 2**: Fix remote track added handler

```typescript
// OLD - WRONG
const isVideoTrack = track.getVideoType?.() !== undefined
dispatch(
    updateParticipantTracks({
        participantId,
        videoTrack: isVideoTrack ? track : null,
        audioTrack: !isVideoTrack ? track : null,
        isLocal: false,
    })
)

// NEW - CORRECT
const isVideoTrack = track.getType?.() === 'video'
const payload: any = { participantId, isLocal: false }
if (isVideoTrack) {
    payload.videoTrack = track
} else {
    payload.audioTrack = track
}
dispatch(updateParticipantTracks(payload))
```

**Change 3**: Fix remote track removed handler

```typescript
// OLD - WRONG
const isVideoTrack = track.getVideoType?.() !== undefined
dispatch(
    updateParticipantTracks({
        participantId,
        videoTrack: isVideoTrack ? null : undefined,
        audioTrack: !isVideoTrack ? null : undefined,
        isLocal: false,
    })
)

// NEW - CORRECT
const isVideoTrack = track.getType?.() === 'video'
const payload: any = { participantId, isLocal: false }
if (isVideoTrack) {
    payload.videoTrack = null
} else {
    payload.audioTrack = null
}
dispatch(updateParticipantTracks(payload))
```

**Why**:

- `track.getType()` returns 'video' or 'audio' (correct API)
- `track.getVideoType()` returns video codec type, not track type (wrong use)
- Only sending videoTrack OR audioTrack in payload prevents other track from being null'd

**Impact**:
✅ Remote audio tracks are now correctly identified
✅ Remote video tracks are correctly identified
✅ Only relevant track is updated in each event

---

### 3. Fixed Redux Track Update Logic

**File**: `src/store/slices/participantsSlice.ts`

**Change**: Update `updateParticipantTracks` to only update tracks that are explicitly provided

```typescript
// OLD - ALWAYS UPDATES BOTH
dispatch(
    updateParticipantTracks({
        participantId,
        videoTrack: isVideoTrack ? track : null, // If audio track, this becomes null
        audioTrack: !isVideoTrack ? track : null, // If video track, this becomes null
    })
)

// NEW - SELECTIVE UPDATE
updateParticipantTracks: (state, action) => {
    const { participantId, videoTrack, audioTrack, isLocal } = action.payload
    const participant = isLocal
        ? state.localParticipant
        : state.remoteParticipants[participantId]

    if (participant) {
        // Chỉ cập nhật những track được cung cấp (không undefined)
        if (videoTrack !== undefined) {
            participant.videoTrack = videoTrack
        }
        if (audioTrack !== undefined) {
            participant.audioTrack = audioTrack
        }
    }
}
```

**Why**:

- Prevents overwriting existing track with `null` when only other track is being updated
- Allows selective track updates (e.g., add audio without affecting existing video)
- Maintains track state integrity during lifecycle events

**Impact**:
✅ Tracks persist correctly when one is added/removed
✅ No more accidental track deletion
✅ Independent track management

---

### 4. Fixed VideoTile Usage in page.tsx

**File**: `src/app/room/[id]/page.tsx`

**Changes**: Pass `audioTrack` prop to all VideoTile components (3 locations)

```typescript
// ALL LAYOUTS NOW INCLUDE audioTrack
<VideoTile
    name={participant.displayName}
    isMuted={participant.isMuted}
    isActive={participant.isLocalParticipant}
    videoTrack={participant.videoTrack}
    audioTrack={participant.audioTrack}  // ADDED
/>
```

**Locations Updated**:

1. Grid layout (main grid render)
2. Spotlight layout (main video + sidebar)
3. Sidebar layout (main video + side panel)

**Impact**:
✅ Audio tracks reach VideoTile component
✅ All layout types now support audio sync
✅ Consistent prop passing across all render functions

---

## Summary of Changes

| Component                  | Issue                 | Fix                                     | Status |
| -------------------------- | --------------------- | --------------------------------------- | ------ |
| video-tile.tsx             | Audio not attached    | Create mergeTracksToStream()            | ✅     |
| useParticipantsManager.tsx | Wrong track detection | Use getType() instead of getVideoType() | ✅     |
| participantsSlice.ts       | Tracks overwritten    | Selective track updates                 | ✅     |
| page.tsx                   | Missing audio props   | Add audioTrack to all VideoTile         | ✅     |

## Files Modified

1. `src/app/room/[id]/components/video-tile.tsx` - Added stream merging
2. `src/hooks/useParticipantsManager.tsx` - Fixed track detection (3 locations)
3. `src/store/slices/participantsSlice.ts` - Fixed reducer logic
4. `src/app/room/[id]/page.tsx` - Added audioTrack props (3 locations)

**Total Changes**: 9 modifications across 4 files
