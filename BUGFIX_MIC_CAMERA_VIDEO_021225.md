# Bug Fix: Mic/Camera Toggle & Video Stream Issues

**Date**: December 2, 2025  
**Severity**: High  
**Status**: Fixed

## Issues Identified

### 1. **Mic/Camera Toggle Not Syncing with Redux**

**Problem**:

- `handleToggleMic` và `handleToggleCamera` chỉ update component state
- Không update Redux state
- Remote participants không thấy trạng thái mic/camera thực tế

**Root Cause**:

- `page.tsx` chỉ cập nhật local state, không dispatch Redux actions
- Redux có actions nhưng không được sử dụng
- UI không listen vào Redux state

**Solution**:

```typescript
// BEFORE: Only local state
const handleToggleMic = () => {
  const newMicState = !micEnabled;
  setMicEnabled(newMicState);
  sessionStorage.setItem("micEnabled", String(newMicState));
};

// AFTER: Sync with Redux through MediaManager
// 1. Get Redux state in page.tsx
const { micEnabled: redisMicEnabled, cameraEnabled: redisCameraEnabled } =
  useAppSelector((state) => state.media);

// 2. Sync Redux to component when Redux changes
useEffect(() => {
  if (redisMicEnabled !== micEnabled) {
    setMicEnabled(redisMicEnabled);
    sessionStorage.setItem("micEnabled", String(redisMicEnabled));
  }
}, [redisMicEnabled, micEnabled]);

// 3. Component state change triggers hook → MediaManager → Redux
// 4. Loop prevention: Check previous state before calling setMic/setCamera
```

### 2. **UI Not Syncing with Actual Mic State**

**Problem**:

- Control Panel shows state from component local state
- When user toggles mic, local state changes
- But Redux may be out of sync if change came from elsewhere
- Result: UI shows wrong state

**Root Cause**:

- Single source of truth not properly established
- Component state and Redux state can diverge

**Solution**:

- Make Redux state the single source of truth
- Component subscribes to Redux state
- When component state changes, Redux updates
- When Redux updates, component reflects it immediately

### 3. **Video Stream Not Displaying**

**Problem**:

- VideoTile component shows "No video" or loading state indefinitely
- Tracks passed to VideoTile but no stream shows
- Fallback UI not working correctly

**Root Cause**:

- `mergeTracksToStream` function doesn't validate track methods exist
- If `getOriginalStream()` and `getStream()` both fail, function returns null
- UI didn't have proper fallback handling
- Error state not clearly triggered

**Solution**:

1. **Validate tracks before merging**:

```typescript
const hasValidVideoTrack =
  videoTrack &&
  (typeof videoTrack.getOriginalStream === "function" ||
    typeof videoTrack.getStream === "function");
const hasValidAudioTrack =
  audioTrack &&
  (typeof audioTrack.getOriginalStream === "function" ||
    typeof audioTrack.getStream === "function");

if (!hasValidVideoTrack && !hasValidAudioTrack) {
  console.warn(`Invalid tracks for ${name}`);
  setHasError(true);
  return;
}
```

2. **Improved error UI**:

```typescript
{
  hasError && (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      {imageUrl ? (
        <Image src={imageUrl} alt={name} fill />
      ) : (
        <div className="text-center">
          <div
            className="w-16 h-16 bg-gray-800 rounded-full 
                        flex items-center justify-center"
          >
            <span className="text-2xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-gray-400 text-sm">No video</p>
        </div>
      )}
    </div>
  );
}
```

## Files Modified

### 1. `app/src/app/room/[id]/page.tsx`

**Changes**:

- Added Redux state subscription for `micEnabled` and `cameraEnabled`
- Added `useEffect` hooks to sync Redux state to component state
- Maintains session storage sync

### 2. `app/src/app/room/[id]/components/video-tile.tsx`

**Changes**:

- Enhanced track validation before merging
- Better error logging with track type info
- Improved error state UI with participant initial fallback
- Proper loading state management
- Better cleanup on unmount

### 3. `app/src/hooks/useJitsiConnection.tsx`

**Changes**:

- Added `previousStatesRef` to prevent infinite loop
- Only call `mediaManager.setMic/setCamera` when state actually changes
- Avoids redundant updates to tracks

## Testing Checklist

- [x] Microphone toggle updates Redux state
- [x] UI reflects mic state immediately
- [x] Remote participants see correct mic state
- [x] Camera toggle works similarly
- [x] Video stream displays correctly
- [x] Error state shows fallback UI
- [x] No infinite loops in state updates
- [x] SessionStorage remains in sync

## Logs to Monitor

```
[Room] Mic toggled to: true/false
[VideoTile] Setting up for {name}: {track info}
[VideoTile] Successfully merged stream for {name}: [video, audio]
[VideoTile] Stream playing for {name}
[VideoTile] Invalid tracks for {name}
[VideoTile] No tracks provided for {name}
```

## Related Components

- `MediaManager.ts`: Handles actual track mute/unmute and Redux dispatch
- `mediaSlice.ts`: Redux state management
- `useJitsiConnection.tsx`: Watches for state changes and calls MediaManager
- `useParticipantsManager.tsx`: Manages participant data from tracks

## Future Improvements

1. Add audio track validation to ensure speakers work
2. Implement device selection UI
3. Add diagnostics panel for debugging media issues
4. Better error recovery with retry logic
5. Audio level monitoring for UI feedback
