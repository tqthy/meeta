'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useAppDispatch, useAppSelector, type RootState } from '@/store'
import { JitsiService } from '@/services/JitsiService'
import { MediaManager } from '@/services/MediaManager'
import { resetConnectionState } from '@/store/slices/connectionSlice'
import { resetMediaState } from '@/store/slices/mediaSlice'

// Dynamically import JitsiMeetJS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let JitsiMeetJS: any = null
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    JitsiMeetJS = require('lib-jitsi-meet')
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

/**
 * Hook để quản lý Jitsi connection và media
 * - Sử dụng Redux để quản lý state
 * - Sử dụng Service classes để tách logic
 * - Cleanup đầy đủ khi unmount
 */
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
    const dispatch = useAppDispatch()

    // Get state from Redux
    const { isConnected, isJoined } = useAppSelector(
        (state) => state.connection
    )
    const { localTracks } = useAppSelector((state) => state.media)

    // Service instances
    const jitsiServiceRef = useRef<JitsiService | null>(null)
    const mediaManagerRef = useRef<MediaManager | null>(null)
    const isInitializedRef = useRef(false)
    const previousStatesRef = useRef({ cameraEnabled, micEnabled })

    // Store callbacks in refs
    const callbacksRef = useRef({
        onConferenceJoined,
        onConferenceLeft,
        onConferenceFailed,
        onConnectionEstablished,
        onConnectionFailed,
    })

    // Update callbacks
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

    // Initialize services
    useEffect(() => {
        if (!JitsiMeetJS || typeof window === 'undefined') return

        if (!jitsiServiceRef.current) {
            jitsiServiceRef.current = new JitsiService(dispatch)
            console.log('[Hook] JitsiService created')
        }

        if (!mediaManagerRef.current) {
            mediaManagerRef.current = new MediaManager(dispatch)
            console.log('[Hook] MediaManager created')
        }
    }, [dispatch])

    // Create local tracks
    useEffect(() => {
        if (!mediaManagerRef.current || !roomName || isInitializedRef.current) {
            return
        }

        const initializeTracks = async () => {
            try {
                console.log('[Hook] Creating local tracks...')
                await mediaManagerRef.current!.createLocalTracks({
                    cameraEnabled,
                    micEnabled,
                })
                isInitializedRef.current = true
            } catch (error) {
                console.error('[Hook] Failed to create tracks:', error)
            }
        }

        initializeTracks()
    }, [roomName, cameraEnabled, micEnabled])

    // Connect and join conference
    useEffect(() => {
        if (
            !jitsiServiceRef.current ||
            !mediaManagerRef.current ||
            !roomName ||
            localTracks.length === 0 ||
            isConnected
        ) {
            return
        }

        const connectAndJoin = async () => {
            try {
                console.log('[Hook] Connecting to Jitsi...')

                // Set callbacks
                jitsiServiceRef.current!.setCallbacks({
                    onConnectionEstablished: () => {
                        callbacksRef.current.onConnectionEstablished?.()

                        // Join conference after connection established
                        if (jitsiServiceRef.current && localTracks.length > 0) {
                            console.log('[Hook] Joining conference...')
                            jitsiServiceRef.current
                                .joinConference(userName, localTracks)
                                .catch((error: Error) => {
                                    console.error('[Hook] Join failed:', error)
                                })
                        }
                    },
                    onConnectionFailed: (error) => {
                        callbacksRef.current.onConnectionFailed?.(error)
                    },
                    onConferenceJoined: (room) => {
                        callbacksRef.current.onConferenceJoined?.(room)
                    },
                    onConferenceLeft: (room) => {
                        callbacksRef.current.onConferenceLeft?.(room)
                    },
                    onConferenceFailed: (error) => {
                        callbacksRef.current.onConferenceFailed?.(error)
                    },
                })

                // Connect to Jitsi
                await jitsiServiceRef.current!.connect(roomName, jwt)
            } catch (error) {
                console.error('[Hook] Connection error:', error)
            }
        }

        connectAndJoin()
    }, [roomName, userName, jwt, localTracks, isConnected])

    // Setup track event handlers for remote tracks
    useEffect(() => {
        if (!jitsiServiceRef.current || !mediaManagerRef.current || !isJoined) {
            return
        }

        const conference = jitsiServiceRef.current.getConference()
        if (!conference) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleTrackAdded = (track: any) => {
            mediaManagerRef.current!.handleRemoteTrackAdded(track)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleTrackRemoved = (track: any) => {
            mediaManagerRef.current!.handleRemoteTrackRemoved(track)
        }

        conference.on(
            JitsiMeetJS.events.conference.TRACK_ADDED,
            handleTrackAdded
        )
        conference.on(
            JitsiMeetJS.events.conference.TRACK_REMOVED,
            handleTrackRemoved
        )

        return () => {
            conference.off(
                JitsiMeetJS.events.conference.TRACK_ADDED,
                handleTrackAdded
            )
            conference.off(
                JitsiMeetJS.events.conference.TRACK_REMOVED,
                handleTrackRemoved
            )
        }
    }, [isJoined])

    // Handle camera toggle
    useEffect(() => {
        if (mediaManagerRef.current && cameraEnabled !== previousStatesRef.current.cameraEnabled) {
            mediaManagerRef.current.setCamera(cameraEnabled)
            previousStatesRef.current.cameraEnabled = cameraEnabled
        }
    }, [cameraEnabled])

    // Handle mic toggle
    useEffect(() => {
        if (mediaManagerRef.current && micEnabled !== previousStatesRef.current.micEnabled) {
            mediaManagerRef.current.setMic(micEnabled)
            previousStatesRef.current.micEnabled = micEnabled
        }
    }, [micEnabled])

    // Disconnect function
    const disconnect = useCallback(async () => {
        console.log('[Hook] Disconnecting...')

        // Cleanup services
        if (mediaManagerRef.current) {
            await mediaManagerRef.current.cleanup()
        }

        if (jitsiServiceRef.current) {
            await jitsiServiceRef.current.cleanup()
        }

        // Reset state
        dispatch(resetMediaState())
        dispatch(resetConnectionState())
        isInitializedRef.current = false

        console.log('[Hook] Disconnected and cleaned up')
    }, [dispatch])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('[Hook] Component unmounting, cleaning up...')

            // Cleanup tracks
            if (mediaManagerRef.current) {
                mediaManagerRef.current.cleanup().catch((error: Error) => {
                    console.error('[Hook] Media cleanup error:', error)
                })
            }

            // Cleanup connection
            if (jitsiServiceRef.current) {
                jitsiServiceRef.current.cleanup().catch((error: Error) => {
                    console.error('[Hook] Service cleanup error:', error)
                })
            }

            // Reset state
            dispatch(resetMediaState())
            dispatch(resetConnectionState())
        }
    }, [dispatch])

    return {
        isConnected,
        isJoined,
        localTracks,
        connection: jitsiServiceRef.current?.getConnection() || null,
        conference: jitsiServiceRef.current?.getConference() || null,
        disconnect,
        toggleCamera: () => mediaManagerRef.current?.toggleCamera(),
        toggleMic: () => mediaManagerRef.current?.toggleMic(),
    }
}
