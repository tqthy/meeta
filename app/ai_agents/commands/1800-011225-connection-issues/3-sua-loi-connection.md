# Sửa lỗi Connection

## 🔧 File cần sửa: `useJitsiConnection.tsx`

### Vấn đề hiện tại

```typescript
// ❌ SAI - localhost không hoạt động
const buildConnectionOptions = useCallback((): IConnectionOptions => {
    return {
        hosts: {
            domain: 'meet.jitsi', // ❌ Không có server nào tại domain này
            muc: 'muc.meet.jitsi',
        },
        serviceUrl: `wss://localhost:8443/xmpp-websocket?room=${roomName}`, // ❌ Không có server local
    }
}, [roomName])
```

---

## ✅ Giải pháp 1: Sử dụng Jitsi Public Server

### Bước 1: Tạo file `.env.local`

```env
NEXT_PUBLIC_JITSI_DOMAIN=meet.jit.si
NEXT_PUBLIC_JITSI_MUC=conference.meet.jit.si
NEXT_PUBLIC_JITSI_WEBSOCKET=wss://meet.jit.si/xmpp-websocket
NEXT_PUBLIC_JITSI_WEBSOCKET_KEEPALIVE=https://meet.jit.si/_unlock
```

### Bước 2: Update `useJitsiConnection.tsx`

**Thay đổi interface:**

```typescript
interface IConnectionOptions {
    hosts: {
        domain: string
        muc: string
        focus?: string // ✅ Add focus
    }
    serviceUrl: string
    websocketKeepAliveUrl?: string
    clientNode?: string // ✅ Add clientNode
    appId?: string | null
}
```

**Thay đổi `buildConnectionOptions`:**

```typescript
const buildConnectionOptions = useCallback((): IConnectionOptions => {
    const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si'
    const muc = process.env.NEXT_PUBLIC_JITSI_MUC || 'conference.meet.jit.si'
    const serviceUrl =
        process.env.NEXT_PUBLIC_JITSI_WEBSOCKET ||
        'wss://meet.jit.si/xmpp-websocket'
    const keepAlive =
        process.env.NEXT_PUBLIC_JITSI_WEBSOCKET_KEEPALIVE ||
        'https://meet.jit.si/_unlock'

    return {
        hosts: {
            domain: domain,
            muc: muc,
            focus: `focus.${domain}`, // ✅ Add focus component
        },
        serviceUrl: serviceUrl,
        websocketKeepAliveUrl: keepAlive,
        clientNode: 'http://jitsi.org/jitsimeet', // ✅ Client identifier
    }
}, []) // ✅ Remove roomName dependency
```

### Bước 3: Fix JitsiMeetJS initialization

```typescript
// Initialize JitsiMeetJS
useEffect(() => {
    if (!JitsiMeetJS || typeof window === 'undefined') {
        return
    }

    try {
        JitsiMeetJS.init({
            disableAudioLevels: false,
            enableAnalyticsLogging: false,
            // ✅ Add these options
            enableWindowOnErrorHandler: false,
            disableThirdPartyRequests: true,
        })

        // ✅ Use INFO level for debugging, ERROR for production
        JitsiMeetJS.setLogLevel(
            process.env.NODE_ENV === 'development'
                ? JitsiMeetJS.logLevels.INFO
                : JitsiMeetJS.logLevels.ERROR
        )

        console.log('[Jitsi] JitsiMeetJS initialized successfully')
    } catch (error) {
        console.error('[Jitsi] Failed to initialize JitsiMeetJS:', error)
    }
}, [])
```

### Bước 4: Fix connection creation

```typescript
// Connect to Jitsi and join conference
useEffect(() => {
    if (
        !JitsiMeetJS ||
        !roomName ||
        localTracks.length === 0 ||
        typeof window === 'undefined'
    ) {
        return
    }

    const connectToJitsi = async () => {
        try {
            console.log('[Jitsi] Creating connection...')
            const connectionOptions = buildConnectionOptions()

            // ✅ Correct constructor parameters
            const connection = new JitsiMeetJS.JitsiConnection(
                null, // appId - not used for public server
                null, // token - JWT if needed
                connectionOptions
            )

            connectionRef.current = connection

            // ✅ Add connection quality handler
            const handleConnectionQuality = (quality: number) => {
                console.log('[Jitsi] Connection quality:', quality)
            }

            // Connection event handlers
            const handleConnectionEstablished = () => {
                console.log('[Jitsi] Connection established!')
                setIsConnected(true)
                onConnectionEstablished?.()

                // Create and join the conference
                // ✅ Use proper room name format
                const roomNameFormatted = roomName
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '')

                const conference = connection.initJitsiConference(
                    roomNameFormatted,
                    {
                        openBridgeChannel: true,
                        // ✅ Add P2P configuration
                        p2p: {
                            enabled: true,
                            stunServers: [
                                {
                                    urls: 'stun:meet-jit-si-turnrelay.jitsi.net:443',
                                },
                            ],
                        },
                        // ✅ Add recording options if needed
                        recordingType: 'jibri',
                        // ✅ Hide video quality label
                        disableSimulcast: false,
                    }
                )
                conferenceRef.current = conference

                // Setup conference event handlers
                setupConferenceHandlers(conference)

                // Join the conference
                conference.join()
            }

            const handleConnectionFailed = (
                errorCode: string,
                errorMessage: string,
                ...params: any[]
            ) => {
                console.error('[Jitsi] Connection failed!', {
                    errorCode,
                    errorMessage,
                    params,
                })

                // ✅ Better error handling
                let userMessage = 'Failed to connect to meeting server'

                if (errorCode === 'connection.passwordRequired') {
                    userMessage = 'This room requires a password'
                } else if (errorCode === 'connection.connectionDropped') {
                    userMessage = 'Connection was dropped. Please try again.'
                }

                const error: ConnectionFailedError = {
                    name: errorCode,
                    message: userMessage,
                    params: params[0],
                }
                onConnectionFailed?.(error)
            }

            const handleConnectionDisconnected = () => {
                console.log('[Jitsi] Connection disconnected.')
                setIsConnected(false)
                setIsJoined(false)
            }

            // Add event listeners
            connection.addEventListener(
                JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
                handleConnectionEstablished
            )
            connection.addEventListener(
                JitsiMeetJS.events.connection.CONNECTION_FAILED,
                handleConnectionFailed
            )
            connection.addEventListener(
                JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
                handleConnectionDisconnected
            )

            // ✅ Connect with timeout
            const connectTimeout = setTimeout(() => {
                if (!connectionRef.current || !isConnected) {
                    console.error('[Jitsi] Connection timeout')
                    connection.disconnect()
                    onConnectionFailed?.({
                        name: 'connection.timeout',
                        message: 'Connection timed out. Please try again.',
                    })
                }
            }, 30000) // 30 seconds timeout

            // Connect
            connection.connect()

            return () => {
                clearTimeout(connectTimeout)
            }
        } catch (error) {
            console.error('[Jitsi] Connection error:', error)
            onConnectionFailed?.({
                name: 'connection.error',
                message:
                    error instanceof Error ? error.message : 'Unknown error',
            })
        }
    }

    connectToJitsi()

    return () => {
        // Cleanup
        if (conferenceRef.current) {
            conferenceRef.current.leave().catch((error: Error) => {
                console.error('[Jitsi] Failed to leave conference:', error)
            })
        }

        if (connectionRef.current) {
            connectionRef.current.disconnect()
        }
    }
}, [
    roomName,
    userName,
    localTracks,
    buildConnectionOptions,
    onConferenceJoined,
    onConferenceLeft,
    onConferenceFailed,
    onConnectionEstablished,
    onConnectionFailed,
    isConnected, // ✅ Add dependency
])
```

### Bước 5: Add helper function for conference handlers

```typescript
// ✅ Add này vào trong component, trước useEffect
const setupConferenceHandlers = useCallback(
    (conference: any) => {
        conference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
            console.log('[Jitsi] Conference joined!')
            setIsJoined(true)

            // Add local tracks to conference
            localTracks.forEach((track) => {
                conference.addTrack(track).catch((error: any) => {
                    console.error('[Jitsi] Failed to add track:', error)
                })
            })

            // Set display name
            conference.setDisplayName(userName)

            onConferenceJoined?.(roomName)
        })

        conference.on(JitsiMeetJS.events.conference.CONFERENCE_LEFT, () => {
            console.log('[Jitsi] Conference left!')
            setIsJoined(false)
            onConferenceLeft?.(roomName)
        })

        conference.on(
            JitsiMeetJS.events.conference.CONFERENCE_FAILED,
            (errorCode: string, errorMessage: string, ...params: any[]) => {
                console.error('[Jitsi] Conference failed!', {
                    errorCode,
                    errorMessage,
                    params,
                })
                const error: ConnectionFailedError = {
                    name: errorCode,
                    message: errorMessage,
                    params: params[0],
                }
                onConferenceFailed?.(error)
            }
        )

        // ✅ Add more event handlers
        conference.on(
            JitsiMeetJS.events.conference.USER_JOINED,
            (id: string) => {
                console.log('[Jitsi] User joined:', id)
            }
        )

        conference.on(JitsiMeetJS.events.conference.USER_LEFT, (id: string) => {
            console.log('[Jitsi] User left:', id)
        })

        conference.on(
            JitsiMeetJS.events.conference.TRACK_ADDED,
            (track: any) => {
                if (track.isLocal()) {
                    return
                }
                console.log(
                    '[Jitsi] Remote track added:',
                    track.getType(),
                    track.getParticipantId()
                )
            }
        )

        conference.on(
            JitsiMeetJS.events.conference.TRACK_REMOVED,
            (track: any) => {
                console.log('[Jitsi] Track removed:', track.getType())
            }
        )
    },
    [
        localTracks,
        userName,
        roomName,
        onConferenceJoined,
        onConferenceLeft,
        onConferenceFailed,
    ]
)
```

---

## 🧪 Testing

Sau khi sửa, test connection:

```bash
npm run dev
```

Vào browser console và kiểm tra logs:

- ✅ `[Jitsi] JitsiMeetJS initialized successfully`
- ✅ `[Jitsi] Creating connection...`
- ✅ `[Jitsi] Connection established!`
- ✅ `[Jitsi] Conference joined!`

---

## 🐛 Common Issues

### Issue 1: "CONNECTION_FAILED" với errorCode "connection.connectionDropped"

**Nguyên nhân:** CORS hoặc firewall blocking

**Giải pháp:**

- Check browser console cho CORS errors
- Đảm bảo không có browser extension block WebSocket
- Try trên incognito mode

### Issue 2: "CONFERENCE_FAILED" với errorCode "conference.connectionError.focusDisconnected"

**Nguyên nhân:** Focus component không available

**Giải pháp:**

```typescript
// Add focus retry logic
let focusRetryCount = 0
const MAX_FOCUS_RETRIES = 3

conference.on(
    JitsiMeetJS.events.conference.CONFERENCE_FAILED,
    (errorCode: string) => {
        if (
            errorCode === 'conference.focusDisconnected' &&
            focusRetryCount < MAX_FOCUS_RETRIES
        ) {
            focusRetryCount++
            console.log(
                `[Jitsi] Focus disconnected, retrying... (${focusRetryCount}/${MAX_FOCUS_RETRIES})`
            )
            setTimeout(() => {
                conference.join()
            }, 2000 * focusRetryCount)
        }
    }
)
```

---

## 📚 Next Steps

Sau khi fix connection xong:

1. ✅ Chuyển sang `4-sua-loi-video.md` để fix video rendering
2. ✅ Kiểm tra `5-sua-loi-device-permissions.md` để fix device access
