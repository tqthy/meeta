# Audio-Video Synchronization Fix - Summary & Architecture

## Date: December 2, 2025 (11:12)

## Status: ✅ COMPLETE

---

## Executive Summary

### Problem

Video tiles in the Meeta conference app were displaying video but **NOT synchronizing audio**. Users could see remote participants but couldn't hear them. The issue affected both local and remote participant audio.

### Root Causes

1. **Audio tracks not attached** - VideoTile only used videoTrack, ignoring audioTrack
2. **Incorrect track detection** - Used `getVideoType()` instead of `getType()` to identify tracks
3. **Redux state overwrites** - updateParticipantTracks overwrote tracks with null values
4. **Missing prop passing** - audioTrack prop not passed from page.tsx to VideoTile components

### Solution Implemented

- Created `mergeTracksToStream()` to combine audio + video into single synchronized MediaStream
- Fixed track type detection using correct `getType()` API
- Updated Redux reducer to selectively update tracks only when provided
- Added audioTrack prop passing to all VideoTile components across all layout modes

### Result

✅ Audio and video now play synchronized from HTML video element
✅ Remote participant audio is audible
✅ All layout modes (grid, spotlight, sidebar) support audio
✅ Track lifecycle events handled correctly

---

## Architecture - Audio/Video Flow (After Fix)

### Media Stream Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Jitsi Meet Bridge                        │
│         (lib-jitsi-meet library initialization)             │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   LOCAL MEDIA                REMOTE MEDIA
        │                         │
    ┌───▼────┐              ┌────▼────┐
    │ Audio  │              │ Video   │
    │ Track  │              │ Track   │
    └────┬───┘              └────┬────┘
         │                       │
    ┌────▼────┐            ┌─────▼────┐
    │ Video   │            │ Audio    │
    │ Track   │            │ Track    │
    └────┬────┘            └─────┬────┘
         │                       │
         └─────────┬─────────────┘
                   │
        ┌──────────▼──────────┐
        │ useParticipantsManager
        │  (Correct Track Detection)
        │  - Uses getType() = 'video'/'audio'
        │  - Dispatches only changed tracks
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │ participantsSlice
        │ (Redux Store)
        │  - Stores video + audio separately
        │  - Selective updates prevent overwrites
        │  - Maintains track state per participant
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │ page.tsx
        │ (Layout Rendering)
        │  - Passes BOTH tracks to VideoTile
        │  - Works in all layouts: grid, spotlight, sidebar
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────────────────────┐
        │ VideoTile Component                 │
        │  ┌───────────────────────────────┐  │
        │  │ mergeTracksToStream()         │  │
        │  │ ┌─────────────┐   ┌────────┐ │  │
        │  │ │ videoTrack  ├───► Merge │ │  │
        │  │ └─────────────┘   │        │ │  │
        │  │ ┌─────────────┐   │  into  │ │  │
        │  │ │ audioTrack  ├───► single │ │  │
        │  │ └─────────────┘   │ Stream │ │  │
        │  │                   └────┬───┘ │  │
        │  │                        │     │  │
        │  │                   ┌────▼──┐  │  │
        │  │                   │Combined   │  │
        │  │                   │MediaStream   │  │
        │  │                   │(V + A)    │  │
        │  └─────────┬─────────└────┬──┘  │
        │            │              │     │  │
        │   Video El │      Set     │     │  │
        │   .srcObject = combined   │     │  │
        └────────────┼──────────────┼─────┘
                     │              │
                   PLAY AUDIO + VIDEO SYNCHRONIZED ✅
```

### Component Dependency Graph

```
JitsiService
    ↓
MediaManager
    ├─→ handleRemoteTrackAdded()
    ├─→ handleRemoteTrackRemoved()
    └─→ manages local/remote tracks
            ↓
useJitsiConnection Hook
    └─→ initializes services
            ↓
useParticipantsManager Hook ⭐ (FIXED)
    ├─→ localTracks.find(t => t.getType() === 'video') ✅
    ├─→ localTracks.find(t => t.getType() === 'audio') ✅
    ├─→ onTrackAdded handler ✅
    ├─→ onTrackRemoved handler ✅
    └─→ dispatches to Redux
            ↓
participantsSlice (Redux) ⭐ (FIXED)
    ├─→ setLocalParticipant
    ├─→ updateParticipantTracks (selective update) ✅
    └─→ maintains Participant objects with both tracks
            ↓
page.tsx ⭐ (FIXED)
    ├─→ allParticipants.map()
    ├─→ passes videoTrack + audioTrack ✅
    └─→ renders in grid/spotlight/sidebar layout
            ↓
VideoTile Component ⭐ (FIXED)
    ├─→ mergeTracksToStream() ✅
    │   └─→ Combines video + audio MediaStreams
    ├─→ videoRef.srcObject = merged stream ✅
    └─→ HTML plays synchronized A/V
            ↓
🎬 OUTPUT: Synchronized Audio + Video ✅
```

---

## Data Flow - Track Lifecycle

### 1. Local Participant Track Creation

```
User joins room with camera + mic enabled
    ↓
useJitsiConnection creates local tracks
    - AudioTrack (type: 'audio')
    - VideoTrack (type: 'video')
    ↓
useParticipantsManager initializes local participant ✅
    - Correctly identifies: track.getType() === 'audio'
    - Correctly identifies: track.getType() === 'video'
    ↓
participantsSlice stores both tracks
    {
        videoTrack: JitsiTrack,
        audioTrack: JitsiTrack
    }
    ↓
page.tsx renders VideoTile with both props
    ↓
VideoTile merges streams via mergeTracksToStream()
    ↓
HTML video element plays synchronized media
```

### 2. Remote Participant Track Addition

```
Remote user joins and sends video track
    ↓
Jitsi fires: conference.on('TRACK_ADDED', track)
    - track.getType() returns 'video'
    - track.getParticipantId() returns 'remote-user-123'
    ↓
useParticipantsManager.onTrackAdded() ✅
    - Correctly detects: track.getType() === 'video'
    - Dispatches: updateParticipantTracks({ participantId, videoTrack })
    - Does NOT include audioTrack (undefined, not overwritten to null)
    ↓
Redux updates only videoTrack ✅
    {
        remoteParticipants: {
            'remote-user-123': {
                videoTrack: JitsiTrack,
                audioTrack: null  // Unchanged, still null
            }
        }
    }
    ↓
Remote user sends audio track
    ↓
Jitsi fires: conference.on('TRACK_ADDED', track)
    - track.getType() returns 'audio'
    - track.getParticipantId() returns 'remote-user-123'
    ↓
useParticipantsManager.onTrackAdded() ✅
    - Correctly detects: track.getType() === 'audio'
    - Dispatches: updateParticipantTracks({ participantId, audioTrack })
    - Does NOT include videoTrack (undefined, not overwritten)
    ↓
Redux updates only audioTrack ✅
    {
        remoteParticipants: {
            'remote-user-123': {
                videoTrack: JitsiTrack,    // Unchanged
                audioTrack: JitsiTrack     // Updated
            }
        }
    }
    ↓
page.tsx now has both tracks, passes to VideoTile
    ↓
VideoTile merges streams via mergeTracksToStream() ✅
    ↓
HTML video element plays BOTH video + audio SYNCHRONIZED
```

### 3. Track Removal

```
Remote user mutes microphone
    ↓
Jitsi fires: conference.on('TRACK_REMOVED', track)
    - track.getType() returns 'audio'
    - track.getParticipantId() returns 'remote-user-123'
    ↓
useParticipantsManager.onTrackRemoved() ✅
    - Correctly detects: track.getType() === 'audio'
    - Dispatches: updateParticipantTracks({
        participantId,
        audioTrack: null    // Only update audio
    })
    ↓
Redux updates ONLY audioTrack to null ✅
    {
        remoteParticipants: {
            'remote-user-123': {
                videoTrack: JitsiTrack,    // Unchanged
                audioTrack: null           // Removed
            }
        }
    }
    ↓
page.tsx updates VideoTile props
    - videoTrack = still present
    - audioTrack = now null
    ↓
VideoTile re-merges streams
    - Video track is included in merged stream
    - Audio track is skipped (null)
    ↓
HTML video element plays VIDEO ONLY (audio silent)
    ✅ Both states handled correctly
```

---

## Key Improvements

### Before Fix ❌

```
Track Detection: getVideoType() → confuses audio with video
Redux Updates: Always set both tracks → overwrites with null
Stream Merging: Uses only videoTrack → audio never attached
Prop Passing: videoTrack only → audioTrack never reaches UI
Result: VIDEO VISIBLE, AUDIO SILENT 🔇
```

### After Fix ✅

```
Track Detection: getType() === 'video'/'audio' → correct
Redux Updates: Selective update → only changes what's provided
Stream Merging: Combines video + audio → synchronized playback
Prop Passing: Both tracks passed → fully utilized by UI
Result: VIDEO + AUDIO SYNCHRONIZED 🔊🎬
```

---

## Critical Code Sections

### 1. Stream Merging (Core Fix)

```typescript
const mergeTracksToStream = (
    videoTrack: any,
    audioTrack: any
): MediaStream | null => {
    const stream = new MediaStream()

    if (videoTrack?.getStream) {
        videoTrack
            .getStream()
            .getVideoTracks()
            .forEach((track) => stream.addTrack(track))
    }

    if (audioTrack?.getStream) {
        audioTrack
            .getStream()
            .getAudioTracks()
            .forEach((track) => stream.addTrack(track))
    }

    return stream.getTracks().length > 0 ? stream : null
}
```

**Why**: MediaStream must contain BOTH tracks for HTML video element

### 2. Correct Track Detection

```typescript
const videoTrack = localTracks.find((t) => t.getType() === 'video') // ✅ Correct
const audioTrack = localTracks.find((t) => t.getType() === 'audio') // ✅ Correct

// NOT this ❌
// const videoTrack = localTracks.find(t => t.getVideoType() !== undefined)
```

**Why**: getType() returns 'video'/'audio', getVideoType() returns codec type

### 3. Selective Redux Updates

```typescript
if (videoTrack !== undefined) {
    participant.videoTrack = videoTrack
}
if (audioTrack !== undefined) {
    participant.audioTrack = audioTrack
}
```

**Why**: Only update what's explicitly provided, leave others unchanged

---

## Performance Impact

| Metric    | Impact        | Notes                                    |
| --------- | ------------- | ---------------------------------------- |
| CPU       | ✅ Negligible | Stream merging is just reference copying |
| Memory    | ✅ Unchanged  | Same number of tracks, just merged       |
| Latency   | ✅ No change  | No additional encoding/decoding          |
| Bandwidth | ✅ No change  | Same media streams, not affected         |

---

## Browser Compatibility

| Browser | Support         | Status  |
| ------- | --------------- | ------- |
| Chrome  | MediaStream API | ✅ Full |
| Firefox | MediaStream API | ✅ Full |
| Safari  | MediaStream API | ✅ Full |
| Edge    | MediaStream API | ✅ Full |

All modern browsers support MediaStream manipulation required for this fix.

---

## Future Enhancements

1. **Audio Level Visualization** - Use audio level data for speaker indicators
2. **Audio Routing** - Allow selecting different audio outputs per participant
3. **Noise Suppression** - Apply audio filters before playback
4. **Voice Activity Detection** - Detect who's speaking for automatic spotlight
5. **Audio Statistics** - Monitor audio quality/bitrate per participant

---

## Rollback Plan

If issues occur:

1. All changes are isolated to 4 files
2. Previous versions in git history
3. Can revert by restoring old versions of:
    - `video-tile.tsx`
    - `useParticipantsManager.tsx`
    - `participantsSlice.ts`
    - `page.tsx`

---

## Sign-Off

**Date**: December 2, 2025, 11:12 AM
**Changes**: 9 modifications across 4 files
**Status**: ✅ Complete and tested
**Confidence**: High - All changes are targeted and low-risk
