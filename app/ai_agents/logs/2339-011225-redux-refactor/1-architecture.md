# Architecture Overview

## Kiến trúc mới

```
┌─────────────────────────────────────────────────────────────┐
│                      React Component                         │
│  (Room page, Meeting UI, etc.)                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ uses
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              useJitsiConnection Hook                         │
│  - Initialize services                                       │
│  - Coordinate flow                                           │
│  - Handle lifecycle                                          │
└────┬─────────────────────────────────┬──────────────────────┘
     │                                 │
     │ dispatch actions                │ read state
     ▼                                 ▼
┌─────────────────────┐          ┌──────────────────────────┐
│   Redux Store       │          │  Redux Selectors         │
│                     │          │                          │
│  - mediaSlice       │◄─────────┤  - useAppSelector        │
│  - connectionSlice  │          │  - Memoized selectors    │
└──────────┬──────────┘          └──────────────────────────┘
           │
           │ state changes trigger
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐  ┌─────────────┐
│  Media  │  │ Connection  │
│  Slice  │  │   Slice     │
└────┬────┘  └──────┬──────┘
     │              │
     │              │
     ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │  MediaManager       │    │   JitsiService      │        │
│  │                     │    │                     │        │
│  │  - createTracks()   │    │  - connect()        │        │
│  │  - disposeTracks()  │    │  - joinConference() │        │
│  │  - toggleCamera()   │    │  - leaveConference()│        │
│  │  - toggleMic()      │    │  - disconnect()     │        │
│  │  - handleRemote()   │    │  - event handlers   │        │
│  └──────────┬──────────┘    └──────────┬──────────┘        │
│             │                          │                    │
│             │ dispatch                 │ dispatch           │
│             └──────────┬───────────────┘                    │
│                        ▼                                     │
│                  Redux Store                                │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ uses
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  lib-jitsi-meet SDK                          │
│  - JitsiConnection                                           │
│  - JitsiConference                                           │
│  - JitsiTrack                                                │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Initialization Flow

```
Component Mount
    ↓
useJitsiConnection()
    ↓
Create Services (MediaManager, JitsiService)
    ↓
MediaManager.createLocalTracks()
    ↓
dispatch(setLocalTracks())
    ↓
Redux Store updated
    ↓
Component re-renders with tracks
```

### 2. Connection Flow

```
User clicks Join
    ↓
JitsiService.connect(roomName)
    ↓
dispatch(setConnecting(true))
    ↓
JitsiConnection.connect()
    ↓
CONNECTION_ESTABLISHED event
    ↓
dispatch(setConnected(true))
    ↓
JitsiService.joinConference()
    ↓
dispatch(setJoining(true))
    ↓
CONFERENCE_JOINED event
    ↓
dispatch(setJoined(true))
    ↓
Add local tracks to conference
```

### 3. Media Control Flow

```
User toggles camera
    ↓
MediaManager.toggleCamera()
    ↓
track.mute() / track.unmute()
    ↓
dispatch(setCameraEnabled())
    ↓
Redux Store updated
    ↓
UI re-renders with new state
```

### 4. Remote Track Flow

```
TRACK_ADDED event
    ↓
MediaManager.handleRemoteTrackAdded(track)
    ↓
Store in remoteTracks Map
    ↓
Setup event listeners (mute, audio level)
    ↓
dispatch(addRemoteTrack())
    ↓
Redux Store updated
    ↓
UI renders remote video
```

### 5. Cleanup Flow

```
User leaves / Component unmount
    ↓
disconnect() called
    ↓
MediaManager.cleanup()
    ├─ disposeLocalTracks()
    │   ├─ track.dispose() for each track
    │   └─ dispatch(clearLocalTracks())
    └─ clearAllRemoteTracks()
        ├─ Remove audio handlers
        └─ dispatch(clearRemoteTracks())
    ↓
JitsiService.cleanup()
    ├─ leaveConference()
    │   └─ conference.leave()
    └─ disconnect()
        └─ connection.disconnect()
    ↓
dispatch(resetMediaState())
dispatch(resetConnectionState())
    ↓
Redux Store reset to initial
    ↓
UI shows disconnected state
```

## State Management

### Redux Store Structure

```typescript
{
  media: {
    localTracks: JitsiTrack[],
    remoteTracks: Map<participantId, JitsiTrack[]>,
    cameraEnabled: boolean,
    micEnabled: boolean,
    audioLevel: Map<participantId, number>,
    devices: { audioInput, audioOutput, videoInput },
    selectedDevices: { audioInput, audioOutput, videoInput },
    isCreatingTracks: boolean,
    trackError: string | null
  },
  connection: {
    isConnected: boolean,
    isConnecting: boolean,
    connectionError: ConnectionError | null,
    isJoined: boolean,
    isJoining: boolean,
    conferenceError: ConnectionError | null,
    roomName: string | null,
    participants: Map<id, Participant>,
    dominantSpeakerId: string | null,
    localParticipantId: string | null,
    connectionQuality: 'good' | 'poor' | 'interrupted' | null,
    isConnectionInterrupted: boolean,
    retryCount: number,
    maxRetries: number
  }
}
```

## Component Integration

### Basic Usage

```tsx
import { useJitsiConnection } from '@/hooks/useJitsiConnection.v2'

function MeetingRoom() {
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
        onConferenceJoined: (room) => console.log('Joined:', room),
        onConferenceLeft: (room) => console.log('Left:', room),
    })

    return (
        <div>
            <button onClick={toggleCamera}>Toggle Camera</button>
            <button onClick={toggleMic}>Toggle Mic</button>
            <button onClick={disconnect}>Leave</button>
        </div>
    )
}
```

### Advanced Usage with Redux

```tsx
import { useAppSelector } from '@/store'

function ParticipantsList() {
    // Access state directly from Redux
    const participants = useAppSelector((state) =>
        Array.from(state.connection.participants.values())
    )
    const dominantSpeakerId = useAppSelector(
        (state) => state.connection.dominantSpeakerId
    )

    return (
        <ul>
            {participants.map((p) => (
                <li key={p.id}>
                    {p.displayName}
                    {p.isDominantSpeaker && ' 🔊'}
                </li>
            ))}
        </ul>
    )
}
```

## Service Responsibilities

### MediaManager

- ✅ Create/dispose local tracks
- ✅ Toggle camera/mic
- ✅ Handle remote tracks
- ✅ Audio level monitoring
- ✅ Device enumeration (future)
- ✅ Device switching (future)

### JitsiService

- ✅ Establish/disconnect connection
- ✅ Join/leave conference
- ✅ Participant management
- ✅ Connection quality monitoring
- ✅ Retry logic
- ✅ Event coordination

### useJitsiConnection Hook

- ✅ Initialize services
- ✅ Coordinate initialization flow
- ✅ Sync React props with services
- ✅ Handle cleanup
- ✅ Provide simple API to components

## Error Handling

### Connection Errors

```typescript
// Handled in JitsiService
CONNECTION_FAILED event
    ↓
dispatch(setConnectionError(error))
    ↓
Retry logic (exponential backoff)
    ↓
If max retries reached → callback
```

### Media Errors

```typescript
// Handled in MediaManager
createLocalTracks() throws
    ↓
Try fallback constraints
    ↓
If fallback fails:
    ↓
dispatch(setTrackError(error))
    ↓
UI shows error message
```

### Conference Errors

```typescript
// Handled in JitsiService
CONFERENCE_FAILED event
    ↓
dispatch(setConferenceError(error))
    ↓
Callback notification
    ↓
UI shows error + retry option
```

## Performance Considerations

### Redux Middleware

- SerializableCheck ignoruje JitsiTrack objects
- Tracks stored in state for React sync
- Use selectors để memoize derived data

### Re-render Optimization

- Services trong refs → không trigger re-render
- State changes chỉ trigger subscribers
- Use React.memo cho expensive components

### Memory Management

- Dispose tracks khi không dùng
- Clear event listeners
- Reset state về initial
- Service instances cleanup

## Extension Points

### 1. Add Screen Sharing

```typescript
// In MediaManager
async createScreenTrack() {
  const track = await JitsiMeetJS.createLocalTracks({
    devices: ['desktop']
  })
  // Handle screen track
}
```

### 2. Add Recording

```typescript
// In JitsiService
startRecording() {
  this.conference.startRecording({
    mode: 'file'
  })
}
```

### 3. Add Chat

```typescript
// New slice: chatSlice.ts
interface ChatState {
  messages: Message[]
  unreadCount: number
}

// In JitsiService
setupChatHandlers() {
  this.conference.on(
    JitsiMeetJS.events.conference.MESSAGE_RECEIVED,
    this.handleMessageReceived.bind(this)
  )
}
```

### 4. Add Statistics

```typescript
// New slice: statsSlice.ts
interface StatsState {
  bandwidth: { upload: number, download: number }
  packetLoss: number
  jitter: number
}

// In JitsiService
setupStatsHandlers() {
  this.conference.on(
    JitsiMeetJS.events.connectionQuality.LOCAL_STATS_UPDATED,
    this.handleStatsUpdate.bind(this)
  )
}
```
