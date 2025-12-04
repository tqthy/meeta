/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { JitsiService } from '@/services/JitsiService'
import { MediaManager } from '@/services/MediaManager'
import { resetConnectionState } from '@/store/slices/connectionSlice'
import {
    resetMediaState,
    setMicEnabled,
    setCameraEnabled,
} from '@/store/slices/mediaSlice'
import { updateParticipantMuteState } from '@/store/slices/participantsSlice'

// Dynamically import JitsiMeetJS
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
    cameraEnabled, // eslint-disable-line @typescript-eslint/no-unused-vars
    micEnabled, // eslint-disable-line @typescript-eslint/no-unused-vars
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
    const {
        localTracks,
        cameraEnabled: reduxCameraEnabled,
        micEnabled: reduxMicEnabled,
    } = useAppSelector((state) => state.media)

    // Service instances
    const jitsiServiceRef = useRef<JitsiService | null>(null)
    const mediaManagerRef = useRef<MediaManager | null>(null)
    const isInitializedRef = useRef(false)
    const previousStatesRef = useRef({
        cameraEnabled: reduxCameraEnabled,
        micEnabled: reduxMicEnabled,
    })

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

    // Create local tracks once per room
    useEffect(() => {
        if (!mediaManagerRef.current || !roomName || isInitializedRef.current) {
            return
        }

        const initializeTracks = async () => {
            try {
                console.log('[Hook] Creating local tracks...')
                await mediaManagerRef.current!.createLocalTracks({
                    cameraEnabled: reduxCameraEnabled,
                    micEnabled: reduxMicEnabled,
                })
                isInitializedRef.current = true
            } catch (error) {
                console.error('[Hook] Failed to create tracks:', error)
            }
        }

        initializeTracks()
    }, [roomName, reduxCameraEnabled, reduxMicEnabled])

    // Cleanup local tracks only on unmount
    useEffect(() => {
        return () => {
            if (mediaManagerRef.current) {
                console.log('[Hook] Cleaning up local tracks...')
                mediaManagerRef.current.disposeLocalTracks().catch((err) => {
                    console.error('[Hook] Error disposing tracks:', err)
                })
            }
        }
    }, [])

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

        const handleTrackAdded = (track: any) => {
            mediaManagerRef.current!.handleRemoteTrackAdded(track)
        }

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
        const toggleCamera = async () => {
            if (
                mediaManagerRef.current &&
                reduxCameraEnabled !== previousStatesRef.current.cameraEnabled
            ) {
                const tracks = mediaManagerRef.current.getLocalTracks() || []
                const videoTrack = tracks.find(
                    (t: any) => t.getType() === 'video'
                ) as any
                const trackMutedBefore = videoTrack?.isMuted()

                console.log(
                    '[Hook] Camera toggle - Redux state changed:',
                    reduxCameraEnabled
                )
                console.log('[Hook] Video track found:', !!videoTrack)
                console.log(
                    '[Hook] Video track muted before:',
                    trackMutedBefore
                )

                try {
                    await mediaManagerRef.current.setCamera(reduxCameraEnabled)
                    previousStatesRef.current.cameraEnabled = reduxCameraEnabled

                    const trackMutedAfter = videoTrack?.isMuted()
                    console.log(
                        '[Hook] Video track muted after:',
                        trackMutedAfter
                    )
                } catch (error) {
                    console.error('[Hook] ❌ Failed to toggle camera:', error)
                }
            }
        }

        toggleCamera()
    }, [reduxCameraEnabled])

    // Handle mic toggle
    useEffect(() => {
        const toggleMic = async () => {
            if (
                mediaManagerRef.current &&
                reduxMicEnabled !== previousStatesRef.current.micEnabled
            ) {
                const tracks = mediaManagerRef.current.getLocalTracks() || []
                const audioTrack = tracks.find(
                    (t: any) => t.getType() === 'audio'
                ) as any
                const trackMutedBefore = audioTrack?.isMuted()

                console.log(
                    '[Hook] Mic toggle - Redux state changed:',
                    reduxMicEnabled
                )
                console.log('[Hook] Audio track found:', !!audioTrack)
                console.log(
                    '[Hook] Audio track muted before:',
                    trackMutedBefore
                )

                try {
                    await mediaManagerRef.current.setMic(reduxMicEnabled)
                    previousStatesRef.current.micEnabled = reduxMicEnabled

                    const trackMutedAfter = audioTrack?.isMuted()
                    console.log(
                        '[Hook] Audio track muted after:',
                        trackMutedAfter
                    )

                    // Update local participant mute state
                    dispatch(
                        updateParticipantMuteState({
                            participantId: 'local',
                            isMuted: !reduxMicEnabled,
                            isLocal: true,
                        })
                    )
                    console.log(
                        '[Hook] ✅ Local participant mute state updated:',
                        !reduxMicEnabled
                    )
                } catch (error) {
                    console.error(
                        '[Hook] ❌ Failed to toggle microphone:',
                        error
                    )
                }
            }
        }

        toggleMic()
    }, [reduxMicEnabled, dispatch])

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
        mediaManager: mediaManagerRef.current,
        disconnect,
        toggleCamera: useCallback(() => {
            console.log('[Hook] toggleCamera callback called')
            if (!mediaManagerRef.current) {
                console.log('[Hook] mediaManagerRef.current not available')
                return
            }
            const tracks = mediaManagerRef.current.getLocalTracks() || []
            console.log('[Hook] toggleCamera - Total tracks:', tracks.length)
            const videoTrack = tracks.find(
                (track: any) => track.getType() === 'video'
            )
            console.log(
                '[Hook] toggleCamera - Video track found:',
                !!videoTrack
            )
            if (videoTrack) {
                const wasMuted = videoTrack.isMuted()
                console.log(
                    '[Hook] toggleCamera - Video track was muted:',
                    wasMuted
                )
                if (wasMuted) {
                    videoTrack.unmute()
                    console.log('[Hook] toggleCamera - Unmuting camera')
                    dispatch(setCameraEnabled(true))
                } else {
                    videoTrack.mute()
                    console.log('[Hook] toggleCamera - Muting camera')
                    dispatch(setCameraEnabled(false))
                }
                console.log(
                    '[Hook] toggleCamera - Video track now muted:',
                    videoTrack.isMuted()
                )
            }
        }, [dispatch]),
        toggleMic: useCallback(() => {
            console.log('[Hook] toggleMic callback called')
            if (!mediaManagerRef.current) {
                console.log('[Hook] mediaManagerRef.current not available')
                return
            }
            const tracks = mediaManagerRef.current.getLocalTracks() || []
            console.log('[Hook] toggleMic - Total tracks:', tracks.length)
            const audioTrack = tracks.find(
                (track: any) => track.getType() === 'audio'
            )
            console.log('[Hook] toggleMic - Audio track found:', !!audioTrack)
            if (audioTrack) {
                const wasMuted = audioTrack.isMuted()
                console.log(
                    '[Hook] toggleMic - Audio track was muted:',
                    wasMuted
                )
                if (wasMuted) {
                    audioTrack.unmute()
                    console.log('[Hook] toggleMic - Unmuting mic')
                    dispatch(setMicEnabled(true))
                } else {
                    audioTrack.mute()
                    console.log('[Hook] toggleMic - Muting mic')
                    dispatch(setMicEnabled(false))
                }
                console.log(
                    '[Hook] toggleMic - Audio track now muted:',
                    audioTrack.isMuted()
                )
            }
        }, [dispatch]),
    }
}
