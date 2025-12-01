# Best Practices cho lib-jitsi-meet

## 🎯 Performance Optimization

### 1. Lazy Load JitsiMeetJS

```typescript
// ✅ ĐÚNG - Load only on client side
let JitsiMeetJS: any = null
if (typeof window !== 'undefined') {
    JitsiMeetJS = require('lib-jitsi-meet')
}
```

### 2. Proper Cleanup

```typescript
// ✅ Always cleanup tracks and connections
useEffect(() => {
    // ... setup code

    return () => {
        // Cleanup tracks
        localTracks.forEach((track) => {
            try {
                track.dispose()
            } catch (error) {
                console.error('Failed to dispose track:', error)
            }
        })

        // Leave conference
        if (conferenceRef.current) {
            conferenceRef.current.leave().catch(console.error)
        }

        // Disconnect
        if (connectionRef.current) {
            connectionRef.current.disconnect()
        }
    }
}, [dependencies])
```

### 3. Optimize Video Constraints

```typescript
// ✅ Balance quality vs bandwidth
const videoConstraints = {
    video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 30 }, // Don't go above 30fps
        facingMode: 'user',
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1, // Mono for better performance
    },
}
```

### 4. Use Event Debouncing

```typescript
// ✅ Debounce frequent events
import { useCallback, useRef } from 'react'

const useDebounce = (callback: Function, delay: number) => {
    const timeoutRef = useRef<NodeJS.Timeout>()

    return useCallback(
        (...args: any[]) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
            timeoutRef.current = setTimeout(() => {
                callback(...args)
            }, delay)
        },
        [callback, delay]
    )
}

// Usage
const handleTrackMuteChanged = useDebounce((track: any) => {
    // Update UI
}, 100)
```

---

## 🔒 Security Best Practices

### 1. Validate Room Names

```typescript
// ✅ Sanitize room names
const sanitizeRoomName = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Only alphanumeric
        .slice(0, 50) // Max 50 chars
}

const roomNameFormatted = sanitizeRoomName(roomName)
```

### 2. Use JWT Authentication (Production)

```typescript
// ✅ Add JWT support
interface JitsiConfig {
    jwt?: string
    moderator?: boolean
}

const buildConnectionOptions = (config: JitsiConfig) => {
    return {
        hosts: {
            /* ... */
        },
        serviceUrl: 'wss://your-domain.com/xmpp-websocket',
        // ✅ Add JWT if available
        ...(config.jwt && { jwt: config.jwt }),
    }
}
```

### 3. Validate User Input

```typescript
// ✅ Validate before joining
const validateMeetingParams = (
    roomName: string,
    userName: string
): { valid: boolean; error?: string } => {
    if (!roomName || roomName.trim().length === 0) {
        return { valid: false, error: 'Room name is required' }
    }

    if (roomName.length > 50) {
        return { valid: false, error: 'Room name too long (max 50 chars)' }
    }

    if (!userName || userName.trim().length === 0) {
        return { valid: false, error: 'User name is required' }
    }

    if (userName.length > 30) {
        return { valid: false, error: 'User name too long (max 30 chars)' }
    }

    return { valid: true }
}
```

---

## 📊 Error Handling & Logging

### 1. Structured Logging

```typescript
// ✅ Use consistent log format
const logger = {
    info: (message: string, data?: any) => {
        console.log(`[Jitsi] ${message}`, data || '')
    },
    error: (message: string, error?: any) => {
        console.error(`[Jitsi] ${message}`, error || '')
    },
    warn: (message: string, data?: any) => {
        console.warn(`[Jitsi] ${message}`, data || '')
    },
}

// Usage
logger.info('Connection established')
logger.error('Failed to join conference', error)
```

### 2. Error Recovery

```typescript
// ✅ Implement retry logic
const connectWithRetry = async (
    maxRetries: number = 3,
    delay: number = 2000
) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await connection.connect()
            return true
        } catch (error) {
            logger.error(`Connection attempt ${i + 1} failed`, error)

            if (i < maxRetries - 1) {
                await new Promise((resolve) =>
                    setTimeout(resolve, delay * (i + 1))
                )
            }
        }
    }
    return false
}
```

### 3. User-Friendly Error Messages

```typescript
// ✅ Map technical errors to user messages
const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
        'connection.connectionDropped':
            'Connection was lost. Please try again.',
        'connection.passwordRequired': 'This room requires a password.',
        'conference.max_users': 'This room is full. Please try again later.',
        'conference.authenticationRequired':
            'You need to be authenticated to join.',
        'gum.permission_denied': 'Camera/microphone access denied.',
        'gum.not_found': 'No camera or microphone found.',
        'gum.constraint_failed': 'Your device does not meet requirements.',
    }

    return errorMessages[errorCode] || 'An unexpected error occurred.'
}
```

---

## 🎨 UI/UX Best Practices

### 1. Loading States

```typescript
// ✅ Show appropriate loading states
interface ConnectionState {
    status:
        | 'idle'
        | 'connecting'
        | 'connected'
        | 'joining'
        | 'joined'
        | 'failed'
    message: string
}

const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'idle',
    message: '',
})

// Update based on events
connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
    () => {
        setConnectionState({
            status: 'connected',
            message: 'Connected to server',
        })
    }
)

conference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
    setConnectionState({
        status: 'joined',
        message: 'Joined meeting successfully',
    })
})
```

### 2. Network Quality Indicator

```typescript
// ✅ Show network quality to users
const [networkQuality, setNetworkQuality] = useState<number>(100)

conference.on(
    JitsiMeetJS.events.conference.CONNECTION_STATS,
    (stats: any) => {
        const quality = calculateQuality(stats)
        setNetworkQuality(quality)
    }
)

const NetworkIndicator = ({ quality }: { quality: number }) => {
    const color = quality > 80 ? 'green' : quality > 50 ? 'yellow' : 'red'

    return (
        <div className={`network-indicator ${color}`}>
            <SignalIcon bars={Math.ceil(quality / 25)} />
            <span>{quality}%</span>
        </div>
    )
}
```

### 3. Dominant Speaker Highlighting

```typescript
// ✅ Highlight who's speaking
const [dominantSpeaker, setDominantSpeaker] = useState<string | null>(null)

conference.on(
    JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED,
    (id: string) => {
        setDominantSpeaker(id)
    }
)

// In render
<VideoTile
    participant={participant}
    isDominantSpeaker={participant.id === dominantSpeaker}
    className={participant.id === dominantSpeaker ? 'ring-4 ring-green-500' : ''}
/>
```

---

## 🔧 Configuration Best Practices

### 1. Environment-based Config

```typescript
// .env.local
NEXT_PUBLIC_JITSI_DOMAIN=meet.jit.si
NEXT_PUBLIC_JITSI_MUC=conference.meet.jit.si
NEXT_PUBLIC_JITSI_WEBSOCKET=wss://meet.jit.si/xmpp-websocket
NEXT_PUBLIC_JITSI_ENABLE_P2P=true
NEXT_PUBLIC_JITSI_ENABLE_RECORDING=false

// config.ts
export const jitsiConfig = {
    domain: process.env.NEXT_PUBLIC_JITSI_DOMAIN!,
    muc: process.env.NEXT_PUBLIC_JITSI_MUC!,
    websocket: process.env.NEXT_PUBLIC_JITSI_WEBSOCKET!,
    enableP2P: process.env.NEXT_PUBLIC_JITSI_ENABLE_P2P === 'true',
    enableRecording: process.env.NEXT_PUBLIC_JITSI_ENABLE_RECORDING === 'true',
}
```

### 2. Feature Flags

```typescript
// ✅ Enable/disable features easily
const features = {
    chat: true,
    recording: false,
    screenSharing: true,
    virtualBackground: true,
    reactions: true,
    polls: false,
}

// Conditional rendering
{features.chat && <ChatPanel />}
{features.recording && <RecordButton />}
```

---

## 📱 Mobile Optimization

### 1. Detect Mobile

```typescript
// ✅ Adjust behavior for mobile
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    )
}

// Use lower quality for mobile
const getVideoConstraints = () => {
    if (isMobile()) {
        return {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24 },
        }
    }

    return {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
    }
}
```

### 2. Touch-Friendly Controls

```typescript
// ✅ Larger touch targets on mobile
<button
    className={`
        p-4 rounded-full
        ${isMobile() ? 'min-w-[60px] min-h-[60px]' : 'w-12 h-12'}
        hover:bg-gray-700 active:bg-gray-600
    `}
>
    <MicIcon />
</button>
```

---

## 🧪 Testing Strategies

### 1. Connection Testing

```typescript
// ✅ Test connection before joining
const testConnection = async (): Promise<boolean> => {
    return new Promise((resolve) => {
        const testConnection = new JitsiMeetJS.JitsiConnection(
            null,
            null,
            buildConnectionOptions()
        )

        const timeout = setTimeout(() => {
            testConnection.disconnect()
            resolve(false)
        }, 10000) // 10s timeout

        testConnection.addEventListener(
            JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
            () => {
                clearTimeout(timeout)
                testConnection.disconnect()
                resolve(true)
            }
        )

        testConnection.addEventListener(
            JitsiMeetJS.events.connection.CONNECTION_FAILED,
            () => {
                clearTimeout(timeout)
                resolve(false)
            }
        )

        testConnection.connect()
    })
}
```

### 2. Device Testing

```typescript
// ✅ List available devices
const getAvailableDevices = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()

        const cameras = devices.filter((d) => d.kind === 'videoinput')
        const microphones = devices.filter((d) => d.kind === 'audioinput')
        const speakers = devices.filter((d) => d.kind === 'audiooutput')

        return { cameras, microphones, speakers }
    } catch (error) {
        console.error('Failed to enumerate devices:', error)
        return { cameras: [], microphones: [], speakers: [] }
    }
}
```

---

## 📚 Documentation

### 1. Comment Complex Logic

````typescript
/**
 * Creates and configures a Jitsi conference connection
 *
 * @param roomName - The conference room identifier (alphanumeric only)
 * @param userName - Display name for the participant
 * @param options - Additional configuration options
 * @returns Promise that resolves when connection is established
 *
 * @example
 * ```typescript
 * const conference = await createConference('my-room', 'John Doe', {
 *   enableP2P: true,
 *   startWithAudioMuted: false
 * })
 * ```
 */
const createConference = async (
    roomName: string,
    userName: string,
    options: ConferenceOptions = {}
) => {
    // Implementation...
}
````

### 2. Track Events

```typescript
// ✅ Document all event handlers
/**
 * Jitsi Conference Events:
 *
 * Connection Events:
 * - CONNECTION_ESTABLISHED: Successfully connected to server
 * - CONNECTION_FAILED: Connection attempt failed
 * - CONNECTION_DISCONNECTED: Disconnected from server
 *
 * Conference Events:
 * - CONFERENCE_JOINED: Successfully joined conference
 * - CONFERENCE_LEFT: Left the conference
 * - USER_JOINED: Remote participant joined
 * - USER_LEFT: Remote participant left
 * - TRACK_ADDED: New media track added
 * - TRACK_REMOVED: Media track removed
 * - DOMINANT_SPEAKER_CHANGED: Active speaker changed
 */
```

---

## 🚀 Performance Monitoring

### 1. Track Metrics

```typescript
// ✅ Monitor important metrics
interface Metrics {
    connectionTime: number
    joinTime: number
    trackCreationTime: number
    participantCount: number
    errors: string[]
}

const metrics: Metrics = {
    connectionTime: 0,
    joinTime: 0,
    trackCreationTime: 0,
    participantCount: 0,
    errors: [],
}

// Measure connection time
const startTime = performance.now()
connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
    () => {
        metrics.connectionTime = performance.now() - startTime
        console.log(`Connection established in ${metrics.connectionTime}ms`)
    }
)
```

### 2. Memory Management

```typescript
// ✅ Clean up properly to prevent memory leaks
const cleanup = () => {
    // Dispose tracks
    localTracks.forEach((track) => {
        track.dispose()
    })

    // Remove event listeners
    conference?.off('*') // Remove all listeners
    connection?.removeEventListener('*')

    // Clear references
    localTracks = []
    conferenceRef.current = null
    connectionRef.current = null
}
```

---

## 📖 Additional Resources

- [lib-jitsi-meet Documentation](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-ljm-api)
- [Jitsi Meet API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe)
- [Jitsi Community](https://community.jitsi.org/)
- [Jitsi GitHub](https://github.com/jitsi/jitsi-meet)
