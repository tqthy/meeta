'use client'
import { useEffect, useCallback, useRef, useState } from 'react'

// Dynamically import JitsiMeetJS to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let JitsiMeetJS: any = null
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    JitsiMeetJS = require('lib-jitsi-meet')
}

interface IConnectionOptions {
    hosts: {
        domain: string
        muc: string
    }
    serviceUrl: string
    websocketKeepAliveUrl?: string
    appId?: string | null
}

interface ConnectionFailedError {
    name: string
    message: string
    params?: Record<string, unknown>
}

interface JitsiConnectionHookProps {
    roomName: string
    userName: string
    cameraEnabled: boolean
    micEnabled: boolean
    jwt?: string
    onConferenceJoined?: (room: string) => void
    onConferenceLeft?: (room: string) => void
    onConferenceFailed?: (error: ConnectionFailedError) => void
    onConnectionEstablished?: () => void
    onConnectionFailed?: (error: ConnectionFailedError) => void
}

export const useJitsiConnection = ({
    roomName,
    userName,
    cameraEnabled,
    micEnabled,
    jwt,
    onConferenceJoined,
    onConferenceLeft,
    onConferenceFailed,
    onConnectionEstablished,
    onConnectionFailed,
}: JitsiConnectionHookProps) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connectionRef = useRef<any | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conferenceRef = useRef<any | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isJoined, setIsJoined] = useState(false)
    const isJoinedRef = useRef(false)
    const [localTracks, setLocalTracks] = useState<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any[]
    >([])
    const retryCountRef = useRef(0)
    const maxRetries = 3
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isConnectingRef = useRef(false)
    const connectionInitializedRef = useRef(false)

    // Store callbacks in refs to avoid dependency issues
    const callbacksRef = useRef({
        onConferenceJoined,
        onConferenceLeft,
        onConferenceFailed,
        onConnectionEstablished,
        onConnectionFailed,
    })

    // Update callbacks ref when they change
    useEffect(() => {
        callbacksRef.current = {
            onConferenceJoined,
            onConferenceLeft,
            onConferenceFailed,
            onConnectionEstablished,
            onConnectionFailed,
        }
    }, [
        onConferenceJoined,
        onConferenceLeft,
        onConferenceFailed,
        onConnectionEstablished,
        onConnectionFailed,
    ])

    const buildConnectionOptions = useCallback((): IConnectionOptions => {
        // Jitsi web container proxies websocket to prosody
        // Use ws:// for localhost development (not wss://)
        // Port 8000 is the Jitsi web container, not 8443
        const baseUrl =
            process.env.NEXT_PUBLIC_JITSI_WS_URL || 'ws://localhost:8000'

        // Keep-alive URL must use http:// because fetch() doesn't support ws://
        const keepAliveUrl = baseUrl
            .replace('ws://', 'http://')
            .replace('wss://', 'https://')

        return {
            hosts: {
                domain: 'meet.jitsi',
                muc: 'muc.meet.jitsi',
            },
            serviceUrl: `${baseUrl}/xmpp-websocket?room=${roomName}`,
            websocketKeepAliveUrl: `${keepAliveUrl}/xmpp-websocket`,
        }
    }, [roomName])

    // Initialize JitsiMeetJS
    useEffect(() => {
        if (!JitsiMeetJS || typeof window === 'undefined') {
            return
        }

        // Initialize JitsiMeetJS with default options
        try {
            JitsiMeetJS.init({
                disableAudioLevels: false,
                enableAnalyticsLogging: false,
            })
            JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR)
            console.log('[Jitsi] JitsiMeetJS initialized')
        } catch (error) {
            console.error('[Jitsi] Failed to initialize JitsiMeetJS:', error)
        }
    }, [])

    // Create local tracks
    useEffect(() => {
        if (!JitsiMeetJS || !roomName || typeof window === 'undefined') {
            return
        }

        // ✅ Skip if tracks already exist to prevent recreation
        if (localTracks.length > 0) {
            console.log('[Jitsi] Tracks already exist, skipping creation')
            return
        }

        const createTracks = async () => {
            try {
                console.log('[Jitsi] Creating local tracks...')
                const tracks = await JitsiMeetJS.createLocalTracks({
                    devices: ['audio', 'video'],
                    constraints: {
                        video: {
                            width: { ideal: 1280, max: 1920 },
                            height: { ideal: 720, max: 1080 },
                            frameRate: { ideal: 30 },
                        },
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        },
                    },
                })

                if (tracks.length === 0) {
                    throw new Error('No tracks created')
                }

                setLocalTracks(tracks)
                console.log('[Jitsi] Local tracks created:', tracks.length)

                // Set initial mute states
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tracks.forEach((track: any) => {
                    if (track.getType() === 'video') {
                        if (!cameraEnabled) {
                            track.mute()
                        }
                    } else if (track.getType() === 'audio') {
                        if (!micEnabled) {
                            track.mute()
                        }
                    }
                })
            } catch (error) {
                console.error('[Jitsi] Failed to create local tracks:', error)
                // ✅ Try fallback with basic constraints
                try {
                    console.log('[Jitsi] Trying fallback constraints...')
                    const fallbackTracks = await JitsiMeetJS.createLocalTracks({
                        devices: ['audio', 'video'],
                    })
                    setLocalTracks(fallbackTracks)
                    console.log(
                        '[Jitsi] Fallback tracks created:',
                        fallbackTracks.length
                    )
                } catch (fallbackError) {
                    console.error(
                        '[Jitsi] Fallback also failed:',
                        fallbackError
                    )
                }
            }
        }

        createTracks()

        return () => {
            // ✅ Proper cleanup local tracks
            localTracks.forEach((track) => {
                try {
                    track.dispose()
                    console.log('[Jitsi] Disposed track:', track.getType())
                } catch (error) {
                    console.error('[Jitsi] Failed to dispose track:', error)
                }
            })
        }
        // ✅ Only depend on roomName and JitsiMeetJS, NOT cameraEnabled/micEnabled
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomName, JitsiMeetJS])

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

        // Prevent multiple simultaneous connections
        if (isConnectingRef.current || connectionInitializedRef.current) {
            console.log(
                '[Jitsi] Connection already exists or in progress, skipping...'
            )
            return
        }

        const connectToJitsi = async () => {
            isConnectingRef.current = true
            connectionInitializedRef.current = true
            try {
                console.log('[Jitsi] Creating connection...')
                const connectionOptions = buildConnectionOptions()
                const jitsiJwt =
                    jwt || process.env.NEXT_PUBLIC_JITSI_JWT || null

                const connection = new JitsiMeetJS.JitsiConnection(
                    connectionOptions.appId,
                    jitsiJwt,
                    connectionOptions
                )
                connectionRef.current = connection

                // Connection event handlers

                const handleConnectionEstablished = () => {
                    console.log('[Jitsi] Connection established!')
                    // Reset retry count on successful connection
                    retryCountRef.current = 0
                    if (retryTimeoutRef.current) {
                        clearTimeout(retryTimeoutRef.current)
                        retryTimeoutRef.current = null
                    }
                    setIsConnected(true)
                    callbacksRef.current.onConnectionEstablished?.()

                    // Create and join the conference
                    const conference = connection.initJitsiConference(
                        roomName.toLowerCase(),
                        {
                            openBridgeChannel: true,
                        }
                    )
                    conferenceRef.current = conference

                    // Conference event listeners

                    conference.on(
                        JitsiMeetJS.events.conference.CONFERENCE_JOINED,
                        () => {
                            console.log('[Jitsi] Conference joined!')
                            setIsJoined(true)
                            isJoinedRef.current = true

                            // Add local tracks to conference

                            localTracks.forEach((track) => {
                                conference
                                    .addTrack(track)
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    .catch((error: any) => {
                                        console.error(
                                            '[Jitsi] Failed to add track:',
                                            error
                                        )
                                    })
                            })

                            // Set display name
                            conference.setDisplayName(userName)

                            callbacksRef.current.onConferenceJoined?.(roomName)
                        }
                    )

                    conference.on(
                        JitsiMeetJS.events.conference.CONFERENCE_LEFT,
                        () => {
                            console.log('[Jitsi] Conference left!')
                            setIsJoined(false)
                            isJoinedRef.current = false
                            callbacksRef.current.onConferenceLeft?.(roomName)
                        }
                    )

                    conference.on(
                        JitsiMeetJS.events.conference.CONFERENCE_FAILED,
                        (
                            errorCode: string,
                            errorMessage: string,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ...params: any[]
                        ) => {
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
                            callbacksRef.current.onConferenceFailed?.(error)
                        }
                    )

                    // ✅ Event: TRACK_ADDED - Remote track được thêm vào conference
                    // Ref: JitsiConferenceEvents - Nhóm media track
                    conference.on(
                        JitsiMeetJS.events.conference.TRACK_ADDED,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (track: any) => {
                            if (track.isLocal()) {
                                return
                            }
                            const participantId = track.getParticipantId()
                            const trackType = track.getType()
                            console.log(
                                '[Jitsi] Remote track added:',
                                trackType,
                                'from participant:',
                                participantId
                            )

                            // ✅ Listen to TRACK_MUTE_CHANGED event on this track
                            track.addEventListener(
                                JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                                () => {
                                    console.log(
                                        '[Jitsi] Track mute changed:',
                                        trackType,
                                        'muted:',
                                        track.isMuted()
                                    )
                                }
                            )

                            // ✅ Listen to TRACK_AUDIO_LEVEL_CHANGED for audio visualization
                            if (trackType === 'audio') {
                                track.addEventListener(
                                    JitsiMeetJS.events.track
                                        .TRACK_AUDIO_LEVEL_CHANGED,
                                    (audioLevel: number) => {
                                        // Use for audio level indicator
                                        if (audioLevel > 0.01) {
                                            console.log(
                                                '[Jitsi] Audio level:',
                                                participantId,
                                                audioLevel
                                            )
                                        }
                                    }
                                )
                            }
                        }
                    )

                    // ✅ Event: TRACK_REMOVED - Track bị remove khỏi conference
                    // Ref: JitsiConferenceEvents - Nhóm media track
                    conference.on(
                        JitsiMeetJS.events.conference.TRACK_REMOVED,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (track: any) => {
                            const trackType = track.getType()
                            const participantId = track.getParticipantId()
                            console.log(
                                '[Jitsi] Track removed:',
                                trackType,
                                'from:',
                                participantId
                            )
                        }
                    )

                    // ✅ Event: USER_JOINED - Participant mới join conference
                    // Ref: JitsiConferenceEvents - Nhóm tham gia phòng
                    conference.on(
                        JitsiMeetJS.events.conference.USER_JOINED,
                        (id: string) => {
                            const participant =
                                conference.getParticipantById(id)
                            const displayName =
                                participant?.getDisplayName() || id
                            console.log(
                                '[Jitsi] User joined:',
                                displayName,
                                '(',
                                id,
                                ')'
                            )
                        }
                    )

                    // ✅ Event: USER_LEFT - Participant rời conference
                    // Ref: JitsiConferenceEvents - Nhóm tham gia phòng
                    conference.on(
                        JitsiMeetJS.events.conference.USER_LEFT,
                        (id: string) => {
                            console.log('[Jitsi] User left:', id)
                        }
                    )

                    // ✅ Event: DOMINANT_SPEAKER_CHANGED - Người nói chính thay đổi
                    // Ref: JitsiConferenceEvents - Nhóm audio detection
                    conference.on(
                        JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED,
                        (id: string) => {
                            console.log('[Jitsi] Dominant speaker:', id)
                        }
                    )

                    // ✅ Event: CONNECTION_INTERRUPTED - Kết nối bị gián đoạn
                    // Ref: JitsiConferenceEvents - Nhóm connection/ICE
                    conference.on(
                        JitsiMeetJS.events.conference.CONNECTION_INTERRUPTED,
                        () => {
                            console.warn(
                                '[Jitsi] Connection interrupted - Reconnecting...'
                            )
                        }
                    )

                    // ✅ Event: CONNECTION_RESTORED - Kết nối được khôi phục
                    // Ref: JitsiConferenceEvents - Nhóm connection/ICE
                    conference.on(
                        JitsiMeetJS.events.conference.CONNECTION_RESTORED,
                        () => {
                            console.log('[Jitsi] Connection restored')
                        }
                    )

                    // ✅ Event: DISPLAY_NAME_CHANGED - Tên hiển thị thay đổi
                    // Ref: JitsiConferenceEvents
                    conference.on(
                        JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
                        (id: string, displayName: string) => {
                            console.log(
                                '[Jitsi] Display name changed:',
                                id,
                                displayName
                            )
                        }
                    )

                    // Join the conference
                    conference.join()
                }

                const handleConnectionFailed = (
                    errorCode: string,
                    errorMessage: string,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...params: any[]
                ) => {
                    console.error('[Jitsi] Connection failed!', {
                        errorCode,
                        errorMessage,
                        params,
                        retryAttempt: retryCountRef.current,
                    })

                    // Retry connection if not exceeded max retries
                    if (retryCountRef.current < maxRetries) {
                        retryCountRef.current += 1
                        const retryDelay = Math.min(
                            1000 * Math.pow(2, retryCountRef.current),
                            5000
                        )
                        console.log(
                            `[Jitsi] Retrying connection in ${retryDelay}ms (attempt ${retryCountRef.current}/${maxRetries})`
                        )

                        retryTimeoutRef.current = setTimeout(() => {
                            console.log('[Jitsi] Retrying connection...')
                            if (connectionRef.current) {
                                connectionRef.current.connect()
                            }
                        }, retryDelay)
                    } else {
                        console.error(
                            '[Jitsi] Max retry attempts reached. Connection failed permanently.'
                        )
                        const error: ConnectionFailedError = {
                            name: errorCode,
                            message: errorMessage,
                            params: params[0],
                        }
                        callbacksRef.current.onConnectionFailed?.(error)
                    }
                }

                const handleConnectionDisconnected = () => {
                    console.log('[Jitsi] Connection disconnected.')
                    setIsConnected(false)
                    setIsJoined(false)
                    isJoinedRef.current = false
                    connectionInitializedRef.current = false
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

                // Connect
                connection.connect()
            } catch (error) {
                console.error('[Jitsi] Connection error:', error)
                isConnectingRef.current = false
            }
        }

        connectToJitsi()

        return () => {
            console.log('[Jitsi] Cleaning up connection...')

            // Reset connecting state
            isConnectingRef.current = false

            // Only reset if not joined to prevent re-initialization
            if (!conferenceRef.current || !isJoinedRef.current) {
                connectionInitializedRef.current = false
            }

            // Cleanup retry timeout
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current)
                retryTimeoutRef.current = null
            }

            // Reset retry count
            retryCountRef.current = 0 // Cleanup conference and connection
            if (conferenceRef.current) {
                conferenceRef.current.leave().catch((error: Error) => {
                    console.error('[Jitsi] Failed to leave conference:', error)
                })
            }

            if (connectionRef.current) {
                connectionRef.current.disconnect()
            }
        }
    }, [roomName, userName, localTracks, buildConnectionOptions, jwt])

    // Handle camera enable/disable
    useEffect(() => {
        const videoTrack = localTracks.find(
            (track) => track.getType() === 'video'
        )
        if (videoTrack) {
            if (cameraEnabled) {
                videoTrack.unmute()
            } else {
                videoTrack.mute()
            }
        }
    }, [cameraEnabled, localTracks])

    // Handle mic enable/disable
    useEffect(() => {
        const audioTrack = localTracks.find(
            (track) => track.getType() === 'audio'
        )
        if (audioTrack) {
            if (micEnabled) {
                audioTrack.unmute()
            } else {
                audioTrack.mute()
            }
        }
    }, [micEnabled, localTracks])

    return {
        isConnected,
        isJoined,
        localTracks,
        connection: connectionRef.current,
        conference: conferenceRef.current,
        disconnect: () => {
            if (conferenceRef.current) {
                conferenceRef.current.leave()
            }
            if (connectionRef.current) {
                connectionRef.current.disconnect()
            }
        },
    }
}
