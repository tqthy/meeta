# Audio-Video Synchronization Fix - Testing & Verification Guide

## Date: December 2, 2025 (11:12)

## Testing Strategy

### Unit Tests Needed

#### 1. Test `mergeTracksToStream()` Function

**Location**: `src/app/room/[id]/components/video-tile.tsx`

```typescript
describe('mergeTracksToStream', () => {
    test('should create MediaStream with video track only', () => {
        const videoTrack = { getStream: () => new MediaStream() }
        const result = mergeTracksToStream(videoTrack, null)
        expect(result).toBeDefined()
        expect(result?.getVideoTracks().length).toBeGreaterThan(0)
    })

    test('should create MediaStream with audio track only', () => {
        const audioTrack = { getStream: () => new MediaStream() }
        const result = mergeTracksToStream(null, audioTrack)
        expect(result).toBeDefined()
        expect(result?.getAudioTracks().length).toBeGreaterThan(0)
    })

    test('should merge both video and audio tracks', () => {
        const videoTrack = {
            getStream: () => {
                const stream = new MediaStream()
                stream.addTrack(new MediaStreamTrack()) // Simulated
                return stream
            },
        }
        const audioTrack = {
            getStream: () => {
                const stream = new MediaStream()
                stream.addTrack(new MediaStreamTrack()) // Simulated
                return stream
            },
        }
        const result = mergeTracksToStream(videoTrack, audioTrack)
        expect(result?.getTracks().length).toBe(2)
    })

    test('should return null if no tracks provided', () => {
        const result = mergeTracksToStream(null, null)
        expect(result).toBeNull()
    })

    test('should handle stream errors gracefully', () => {
        const badTrack = {
            getStream: () => {
                throw new Error('Stream error')
            },
        }
        expect(() => mergeTracksToStream(badTrack, null)).not.toThrow()
    })
})
```

#### 2. Test Track Detection Logic

**Location**: `src/hooks/useParticipantsManager.tsx`

```typescript
describe('useParticipantsManager track detection', () => {
    test('should correctly identify video track using getType()', () => {
        const videoTrack = { getType: () => 'video' }
        const audioTrack = { getType: () => 'audio' }
        const localTracks = [videoTrack, audioTrack]

        // Should use getType() to distinguish
        const foundVideo = localTracks.find((t) => t.getType() === 'video')
        const foundAudio = localTracks.find((t) => t.getType() === 'audio')

        expect(foundVideo).toBe(videoTrack)
        expect(foundAudio).toBe(audioTrack)
    })

    test('remote video track should be identified correctly', () => {
        const track = {
            getType: () => 'video',
            getParticipantId: () => 'remote-user-1',
        }

        // onTrackAdded handler should correctly identify this as video
        expect(track.getType?.() === 'video').toBe(true)
    })

    test('remote audio track should be identified correctly', () => {
        const track = {
            getType: () => 'audio',
            getParticipantId: () => 'remote-user-1',
        }

        // onTrackAdded handler should correctly identify this as audio
        expect(track.getType?.() === 'video').toBe(false)
    })
})
```

#### 3. Test Redux Track Updates

**Location**: `src/store/slices/participantsSlice.ts`

```typescript
describe('updateParticipantTracks reducer', () => {
    test('should only update videoTrack when provided', () => {
        const state = {
            remoteParticipants: {
                user1: {
                    videoTrack: existingVideoTrack,
                    audioTrack: existingAudioTrack,
                },
            },
        }

        const action = {
            payload: {
                participantId: 'user1',
                videoTrack: newVideoTrack,
                // audioTrack: undefined (NOT PROVIDED)
            },
        }

        const result = updateParticipantTracks(state, action)
        expect(result.remoteParticipants['user1'].videoTrack).toBe(
            newVideoTrack
        )
        expect(result.remoteParticipants['user1'].audioTrack).toBe(
            existingAudioTrack
        ) // UNCHANGED
    })

    test('should only update audioTrack when provided', () => {
        const state = {
            remoteParticipants: {
                user1: {
                    videoTrack: existingVideoTrack,
                    audioTrack: existingAudioTrack,
                },
            },
        }

        const action = {
            payload: {
                participantId: 'user1',
                // videoTrack: undefined (NOT PROVIDED)
                audioTrack: newAudioTrack,
            },
        }

        const result = updateParticipantTracks(state, action)
        expect(result.remoteParticipants['user1'].videoTrack).toBe(
            existingVideoTrack
        ) // UNCHANGED
        expect(result.remoteParticipants['user1'].audioTrack).toBe(
            newAudioTrack
        )
    })

    test('should handle null track removal', () => {
        const state = {
            remoteParticipants: {
                user1: {
                    videoTrack: existingVideoTrack,
                    audioTrack: existingAudioTrack,
                },
            },
        }

        const action = {
            payload: {
                participantId: 'user1',
                audioTrack: null, // Explicitly removing
            },
        }

        const result = updateParticipantTracks(state, action)
        expect(result.remoteParticipants['user1'].audioTrack).toBeNull()
        expect(result.remoteParticipants['user1'].videoTrack).toBe(
            existingVideoTrack
        )
    })
})
```

---

### Integration Tests

#### 1. Test Complete Audio-Video Flow

```typescript
describe('Audio-Video Synchronization Integration', () => {
    test('should sync audio and video for local participant', async () => {
        // Setup: Create local tracks
        const localTracks = await JitsiMeetJS.createLocalTracks({
            devices: ['audio', 'video'],
        })

        // UseParticipantsManager should initialize correctly
        const { result } = renderHook(() =>
            useParticipantsManager({
                room: mockRoom,
                userName: 'TestUser',
                localTracks,
            })
        )

        expect(result.current.localParticipant).toBeDefined()
        expect(result.current.localParticipant.videoTrack).toBeDefined()
        expect(result.current.localParticipant.audioTrack).toBeDefined()
    })

    test('should handle remote participant audio and video', async () => {
        // Simulate remote participant joining and sending tracks
        const videoTrack = {
            getType: () => 'video',
            getParticipantId: () => 'remote1',
        }
        const audioTrack = {
            getType: () => 'audio',
            getParticipantId: () => 'remote1',
        }

        const { result } = renderHook(() =>
            useParticipantsManager({
                room: mockRoom,
                userName: 'TestUser',
                localTracks: mockLocalTracks,
            })
        )

        // Simulate track added events
        act(() => {
            mockRoom.emit('trackAdded', videoTrack)
            mockRoom.emit('trackAdded', audioTrack)
        })

        const remoteParticipant = result.current.remoteParticipants['remote1']
        expect(remoteParticipant.videoTrack).toBe(videoTrack)
        expect(remoteParticipant.audioTrack).toBe(audioTrack)
    })
})
```

#### 2. Test VideoTile Rendering

```typescript
describe('VideoTile Component Integration', () => {
    test('should render and sync audio-video stream', () => {
        const mockVideoTrack = {
            getStream: () => mockVideoStream
        }
        const mockAudioTrack = {
            getStream: () => mockAudioStream
        }

        render(
            <VideoTile
                name="John Doe"
                isMuted={false}
                videoTrack={mockVideoTrack}
                audioTrack={mockAudioTrack}
            />
        )

        const videoElement = screen.getByRole('img', { hidden: true })

        // Verify merged stream is attached
        expect(videoElement.srcObject).toBeDefined()
        expect(videoElement.srcObject.getTracks().length).toBeGreaterThanOrEqual(1)
    })

    test('should handle missing audio track gracefully', () => {
        const mockVideoTrack = {
            getStream: () => mockVideoStream
        }

        render(
            <VideoTile
                name="John Doe"
                videoTrack={mockVideoTrack}
                audioTrack={undefined}
            />
        )

        // Should still render video without audio
        expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
})
```

---

## Manual Testing Checklist

### Scenario 1: Local Participant Audio/Video

- [ ] Open room without camera/mic (settings checked before joining)
- [ ] Verify no video/audio is sent
- [ ] Enable camera via settings
- [ ] Verify local video appears in preview
- [ ] Enable microphone via settings
- [ ] Verify local audio indicator shows green (unmuted)
- [ ] Disable microphone
- [ ] Verify audio indicator shows red (muted)

### Scenario 2: Single Remote Participant

- [ ] Start second browser/device joining same room
- [ ] Verify remote participant appears in video grid
- [ ] Verify remote participant video is visible
- [ ] **Verify remote participant audio is audible** (KEY TEST)
- [ ] Remote participant mutes mic
- [ ] Verify audio stops
- [ ] Remote participant unmutes
- [ ] **Verify audio resumes and is in sync with video** (KEY TEST)

### Scenario 3: Multiple Participants

- [ ] Join with 3+ participants
- [ ] Verify all video feeds are visible
- [ ] **Verify all audio feeds are audible and synchronized** (KEY TEST)
- [ ] Switch layout (grid → spotlight → sidebar)
- [ ] **Verify audio sync maintained in all layouts** (KEY TEST)
- [ ] Mute different participants
- [ ] Verify mute states are correctly reflected

### Scenario 4: Audio Level Detection

- [ ] Check browser console for audio level messages
- [ ] Should see `[MediaManager] Audio level for participant X: Y` entries
- [ ] Speak into microphone
- [ ] Verify audio levels change in real-time
- [ ] Listen to remote participants
- [ ] Verify their audio levels are tracked

### Scenario 5: Edge Cases

- [ ] Participant joins with camera but no mic permission
- [ ] Verify video works, audio shows as unavailable
- [ ] Participant joins with mic but camera fails to initialize
- [ ] Verify audio works, video shows placeholder
- [ ] Participant's track gets disconnected mid-call
- [ ] Verify track is removed and re-added correctly
- [ ] Browser loses audio device (device unplugged)
- [ ] Verify graceful degradation or recovery

---

## Expected Behaviors After Fix

### ✅ What Should Now Work

1. **Audio Sync**: Audio and video are synchronized (lips match speech)
2. **Audio Playback**: Remote participant audio is clearly audible
3. **Audio Levels**: Audio level indicators respond to sound
4. **Track Updates**: Adding/removing tracks doesn't affect other tracks
5. **All Layouts**: Audio works in grid, spotlight, and sidebar layouts
6. **Multiple Participants**: All participants' audio is independent and correct

### ❌ What Should NOT Happen

1. Audio cutting out while video continues
2. Only first participant's audio audible
3. Audio level frozen at zero
4. Tracks disappearing when audio/video enabled/disabled
5. Muted state not reflected in UI

---

## Performance Considerations

### Stream Merging Impact

- Merging streams is a light operation (just copying track references)
- No transcoding or re-encoding occurs
- Should not impact CPU/memory significantly
- MediaStream API is optimized for this use case

### Event Handler Impact

- Track event handlers are properly cleaned up
- No memory leaks from listeners
- Audio level monitoring is efficient

---

## Debugging Commands

### Browser Console Commands

```javascript
// Check if video element has tracks
document.querySelector('video').srcObject.getTracks()

// Check track types
document
    .querySelector('video')
    .srcObject.getTracks()
    .forEach((t) => console.log(t.kind, t.enabled, t.readyState))

// Monitor audio levels
window.mediaManager
    ?.getLocalTracks()
    .filter((t) => t.getType() === 'audio')
    .forEach((t) => console.log('Audio level:', t.getAudioLevel?.()))
```

### Log Monitoring

- Open DevTools Console
- Filter logs for `[VideoTile]`, `[ParticipantsManager]`, `[MediaManager]`
- Should see detailed track attachment logs
