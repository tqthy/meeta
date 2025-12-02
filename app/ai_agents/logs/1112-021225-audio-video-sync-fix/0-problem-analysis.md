# Audio-Video Synchronization Fix - Problem Analysis

## Date: December 2, 2025 (11:12)

## Issue: Video tiles không thực sự đồng bộ âm thanh, cũng như không hiển thị video

### Problems Identified

#### 1. **Audio Track Not Attached to Video Elements**

- **Root Cause**: VideoTile component chỉ attach videoTrack stream nhưng bỏ qua audioTrack
- **Impact**:
    - Âm thanh từ remote participants không được phát
    - Video hiển thị nhưng không có âm thanh
    - Local participant âm thanh cũng không được đồng bộ

**File**: `src/app/room/[id]/components/video-tile.tsx`

```typescript
// OLD: Chỉ lấy video stream
if (videoTrack && videoTrack.getStream) {
    const stream = videoTrack.getStream() // Thiếu audio track
    videoElement.srcObject = stream
}
```

#### 2. **Incorrect Track Detection Logic**

- **Root Cause**: Sử dụng `getVideoType()` để phân biệt video/audio tracks
- **Problem**:
    - `getVideoType()` là Jitsi API để lấy type video cụ thể, không dùng để phân biệt với audio
    - Dẫn đến nhầm lẫn giữa audio và video tracks
    - Remote audio tracks không được thêm vào participants

**File**: `src/hooks/useParticipantsManager.tsx`

```typescript
// OLD: Sai cách phân biệt
const videoTrack = localTracks.find(
    (track) => track.getVideoType() !== undefined
)
const audioTrack = localTracks.find(
    (track) => track.getVideoType() === undefined
)
// Điều này là SAI vì getVideoType() không dùng để phân biệt audio/video
```

#### 3. **Track Update Logic Flaw in Redux**

- **Root Cause**: `updateParticipantTracks` action luôn set cả `videoTrack` và `audioTrack`
- **Problem**:
    - Khi track được remove, undefined values được truyền và overwrite existing tracks
    - Dẫn đến mất tracks khi chỉ một trong hai bị remove

**File**: `src/store/slices/participantsSlice.ts`

```typescript
// OLD: Cập nhật cả hai tracks, thậm chí khi một trong chúng là undefined
dispatch(
    updateParticipantTracks({
        participantId,
        videoTrack: isVideoTrack ? track : null, // Nếu không phải video, set = null
        audioTrack: !isVideoTrack ? track : null, // Nếu không phải audio, set = null
    })
)
```

#### 4. **Missing Audio Track Passing to UI**

- **Root Cause**: page.tsx không pass audioTrack prop vào VideoTile components
- **Impact**:
    - Ngay cả nếu audio track được store, nó cũng không được UI sử dụng

**File**: `src/app/room/[id]/page.tsx`

```typescript
// OLD: Thiếu audioTrack prop
<VideoTile
    name={participant.displayName}
    isMuted={participant.isMuted}
    videoTrack={participant.videoTrack}
    // audioTrack={participant.audioTrack}  // THIẾU
/>
```

### Media Stream Flow (Current Broken State)

```
Jitsi lib-jitsi-meet
    ↓
VideoTrack + AudioTrack (separate)
    ↓
useParticipantsManager (BROKEN: getVideoType detection)
    ↓
participantsSlice Redux (BROKEN: overwrites with null)
    ↓
page.tsx (BROKEN: doesn't pass audioTrack)
    ↓
VideoTile component (BROKEN: only uses videoTrack)
    ↓
HTML Video Element (Missing audio!)
```

### Why This Breaks Audio Sync

1. **Separate Stream Objects**: Jitsi returns video and audio as separate JitsiTrack objects
2. **No Merging**: Without merging both into single MediaStream, only video plays
3. **Async Loading**: Video loads but no audio = visual sync but silent
4. **Remote Participants**: Particularly affects remote participants since their tracks arrive via events

### Expected Behavior After Fix

```
VideoTrack: {getStream() -> MediaStream}
AudioTrack: {getStream() -> MediaStream}
    ↓
mergeTracksToStream() - Merge both streams
    ↓
Combined MediaStream with both video + audio tracks
    ↓
HTML Video Element with synchronized A/V
    ↓
User hears and sees synchronized media
```
