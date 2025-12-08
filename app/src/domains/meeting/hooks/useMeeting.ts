/**
 * useMeeting Hook
 *
 * Orchestrates meetingService (join/end meeting) and keeps meetingStore
 * synchronized with normalized participant payloads.
 *
 * @see JitsiAPI/1-JitsiConference for conference events
 * @see JitsiAPI/2-JitsiConnection for connection lifecycle
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { integratedMeetingService } from '../services/meeting-runtime/meetingServiceIntegration'
import { trackService } from '../services/meeting-runtime/trackService'
import { deviceService } from '../services/meeting-runtime/deviceService'
import {
    setConnectionStatus,
    setConferenceStatus,
    setRoomName,
    setLocalParticipantId,
    addParticipant,
    updateParticipant,
    removeParticipant,
    setDominantSpeaker,
    setError,
    resetMeetingState,
} from '../store/meetingStore'
import {
    addRemoteTrack,
    removeRemoteTrack,
    updateRemoteTrack,
    removeRemoteTracksByParticipant,
    clearRemoteTracks,
    resetTrackState,
} from '../store/trackStore'
import { MeetingConfig, Participant } from '../types/meeting'


// Event processing queue to serialize track add/remove events
interface TrackEvent {
    type: 'add' | 'remove' | 'mute'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    track: any // JitsiTrack - SDK object, not serializable
    timestamp: number
    sequence: number
}

let eventSequence = 0
let processingQueue = false
const trackEventQueue: TrackEvent[] = []

export function useMeeting() {
    const dispatch = useAppDispatch()
    const meetingState = useAppSelector((state) => state.meeting)
    const trackState = useAppSelector((state) => state.tracks)
    const isJoiningRef = useRef(false)
    const isLeavingRef = useRef(false)
    const reconciliationInProgressRef = useRef(false)

    // Handle track added (called by queue processor)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTrackAdded = useCallback((track: any) => {
        if (trackService.isLocalTrack(track)) {
            console.log('[useMeeting] Ignoring local track in onTrackAdded')
            return
        }

        const trackInfo = trackService.extractRemoteTrackInfo(track)
        const participantId = trackService.getParticipantId(track)
        const trackType = trackService.getTrackType(track)
        const isMuted = trackService.isTrackMuted(track)
        const connectionStatus = integratedMeetingService.getConnectionStatus?.()

        console.log('[useMeeting] 🎬 Remote track added:', {
            seq: eventSequence,
            trackId: trackInfo.id,
            participantId,
            trackType,
            isMuted,
            epoch: connectionStatus?.epoch,
            mode: connectionStatus?.mode,
            timestamp: Date.now(),
        })

        trackService.storeRemoteTrack(trackInfo.id, track)
        dispatch(addRemoteTrack(trackInfo))

        // Update participant mute state
        if (participantId && trackType) {
            const muteUpdate = trackType === 'audio'
                ? { isAudioMuted: isMuted }
                : { isVideoMuted: isMuted }

            dispatch(
                updateParticipant({
                    id: participantId,
                    updates: muteUpdate,
                })
            )
        }
    }, [dispatch])

    // Handle track removed (called by queue processor)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTrackRemoved = useCallback((track: any) => {
        if (trackService.isLocalTrack(track)) {
            console.log('[useMeeting] Ignoring local track in onTrackRemoved')
            return
        }

        const trackId = track.getId?.() || `remote-${track.getType?.()}`
        const participantId = trackService.getParticipantId(track)
        const trackType = trackService.getTrackType(track)
        const connectionStatus = integratedMeetingService.getConnectionStatus?.()

        console.log('[useMeeting] 🗑️ Remote track removed:', {
            seq: eventSequence,
            trackId,
            participantId,
            trackType,
            epoch: connectionStatus?.epoch,
            mode: connectionStatus?.mode,
        })

        trackService.removeRemoteTrack(trackId)
        dispatch(removeRemoteTrack(trackId))
    }, [dispatch])

    // Handle track mute changed (called by queue processor)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTrackMuteChanged = useCallback((track: any) => {
        if (trackService.isLocalTrack(track)) {
            console.log('[useMeeting] Ignoring local track in onTrackMuteChanged')
            return
        }

        const trackId = track.getId?.()
        const isMuted = trackService.isTrackMuted(track)
        const participantId = trackService.getParticipantId(track)
        const trackType = trackService.getTrackType(track)

        console.log('[useMeeting] 🔇 Remote track mute changed:', {
            seq: eventSequence,
            trackId,
            participantId,
            trackType,
            isMuted,
        })

        if (trackId) {
            dispatch(
                updateRemoteTrack({
                    id: trackId,
                    updates: { isMuted },
                })
            )
        }

        if (participantId && trackType) {
            const muteUpdate = trackType === 'audio'
                ? { isAudioMuted: isMuted }
                : { isVideoMuted: isMuted }

            dispatch(
                updateParticipant({
                    id: participantId,
                    updates: muteUpdate,
                })
            )
        }
    }, [dispatch])

    // Process queued track events sequentially to avoid race conditions
    const processTrackEventQueue = useCallback(async () => {
        if (processingQueue || trackEventQueue.length === 0) return

        processingQueue = true

        while (trackEventQueue.length > 0) {
            const event = trackEventQueue.shift()
            if (!event) break

            try {
                if (event.type === 'add') {
                    handleTrackAdded(event.track)
                } else if (event.type === 'remove') {
                    handleTrackRemoved(event.track)
                } else if (event.type === 'mute') {
                    handleTrackMuteChanged(event.track)
                }
            } catch (error) {
                console.error('[useMeeting] Error processing track event:', error)
            }

            // Small delay to let React batch updates
            await new Promise(resolve => setTimeout(resolve, 10))
        }

        processingQueue = false
    }, [handleTrackAdded, handleTrackRemoved, handleTrackMuteChanged])

    // Queue track event for sequential processing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queueTrackEvent = useCallback((type: 'add' | 'remove' | 'mute', track: any) => {
        trackEventQueue.push({
            type,
            track,
            timestamp: Date.now(),
            sequence: eventSequence++,
        })

        // Process queue on next microtask
        Promise.resolve().then(processTrackEventQueue)
    }, [processTrackEventQueue])

    // Perform full track reconciliation after connection mode change
    const reconcileTracks = useCallback(async () => {
        if (reconciliationInProgressRef.current) {
            console.log('[useMeeting] Reconciliation already in progress, skipping')
            return
        }

        reconciliationInProgressRef.current = true
        console.warn('[useMeeting] 🔄 Starting track reconciliation...')

        try {
            // Get snapshot of current tracks from conference
            const snapshot = integratedMeetingService.getRemoteTracksSnapshot?.()
            if (!snapshot) {
                console.warn('[useMeeting] No snapshot available')
                return
            }

            // Build a set of track IDs from snapshot
            const snapshotTrackIds = new Set<string>()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            snapshot.forEach(({ tracks }: { participantId: string; tracks: any[] }) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tracks.forEach((track: any) => {
                    const trackId = track.getId?.()
                    if (trackId) snapshotTrackIds.add(trackId)
                })
            })

            // Get current tracked IDs from track store (not meeting store)
            const currentTrackIds = new Set(Object.keys(trackState.remoteTracks || {}))

            // Find tracks to remove (in store but not in snapshot)
            const tracksToRemove = [...currentTrackIds].filter(id => !snapshotTrackIds.has(id))

            // Find tracks to add (in snapshot but not in store)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tracksToAdd: any[] = []
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            snapshot.forEach(({ tracks }: { participantId: string; tracks: any[] }) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tracks.forEach((track: any) => {
                    const trackId = track.getId?.()
                    if (trackId && !currentTrackIds.has(trackId)) {
                        tracksToAdd.push(track)
                    }
                })
            })

            console.log('[useMeeting] Reconciliation diff:', {
                toRemove: tracksToRemove.length,
                toAdd: tracksToAdd.length,
                snapshot: snapshotTrackIds.size,
                current: currentTrackIds.size,
            })

            // Remove stale tracks
            for (const trackId of tracksToRemove) {
                console.log('[useMeeting] Removing stale track:', trackId)
                trackService.removeRemoteTrack(trackId)
                dispatch(removeRemoteTrack(trackId))
            }

            // Add missing tracks
            for (const track of tracksToAdd) {
                console.log('[useMeeting] Adding missing track:', track.getId?.())
                handleTrackAdded(track)
            }

            console.log('[useMeeting] ✅ Track reconciliation complete')
        } catch (error) {
            console.error('[useMeeting] Reconciliation failed:', error)
        } finally {
            reconciliationInProgressRef.current = false
        }
    }, [dispatch, trackState.remoteTracks, handleTrackAdded])

    // Setup event handlers on mount
    useEffect(() => {
        integratedMeetingService.setEventHandlers({
            onConnectionEstablished: () => {
                dispatch(setConnectionStatus('connected'))
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onConnectionFailed: (error: any) => {
                dispatch(setConnectionStatus('failed'))
                dispatch(
                    setError({
                        type: 'connection',
                        message: error?.message || 'Connection failed',
                        timestamp: Date.now(),
                    })
                )
            },
            onConnectionDisconnected: () => {
                dispatch(setConnectionStatus('disconnected'))
            },
            onConferenceJoined: () => {
                dispatch(setConferenceStatus('joined'))

                // Add local participant
                const localParticipant = integratedMeetingService.getLocalParticipant()
                if (localParticipant) {
                    dispatch(setLocalParticipantId(localParticipant.id))
                    dispatch(addParticipant(localParticipant))
                }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onConferenceFailed: (error: any) => {
                dispatch(setConferenceStatus('failed'))
                dispatch(
                    setError({
                        type: 'conference',
                        message: error?.message || 'Conference failed',
                        timestamp: Date.now(),
                    })
                )
            },
            onConferenceLeft: () => {
                dispatch(setConferenceStatus('left'))
            },
            onUserJoined: (participant: Participant) => {
                console.log('[useMeeting] 👤 User joined:', {
                    id: participant.id,
                    displayName: participant.displayName,
                    isAudioMuted: participant.isAudioMuted,
                    isVideoMuted: participant.isVideoMuted,
                    role: participant.role
                })
                dispatch(addParticipant(participant))
            },
            onUserLeft: (participantId: string) => {
                console.log('[useMeeting] 👋 User left:', { participantId })
                dispatch(removeParticipant(participantId))
                dispatch(removeRemoteTracksByParticipant(participantId))
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onTrackAdded: (track: any) => {
                queueTrackEvent('add', track)
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onTrackRemoved: (track: any) => {
                queueTrackEvent('remove', track)
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onTrackMuteChanged: (track: any) => {
                queueTrackEvent('mute', track)

            },
            onConnectionModeChanged: (mode: 'p2p' | 'jvb', participantCount: number) => {
                console.warn('[useMeeting] 🔄 Connection mode changed event:', { mode, participantCount })
            },
            onReconcileRequired: () => {
                console.warn('[useMeeting] 🔄 Reconciliation required, scheduling...')
                // Debounce reconciliation - wait 500ms for events to settle
                setTimeout(() => {
                    reconcileTracks()
                }, 500)
            },
            onDominantSpeakerChanged: (participantId: string) => {
                dispatch(setDominantSpeaker(participantId))
            },
            onDisplayNameChanged: (participantId: string, displayName: string) => {
                dispatch(
                    updateParticipant({
                        id: participantId,
                        updates: { displayName },
                    })
                )
            },
        })

        return () => {
            integratedMeetingService.clearEventHandlers()
        }
    }, [dispatch, queueTrackEvent, reconcileTracks])

    /**
     * Joins a meeting room
     */
    const joinMeeting = useCallback(
        async (
            roomName: string,
            displayName: string,
            meetingId: string,
            userId?: string,
            title?: string,
            description?: string
        ) => {
            if (isJoiningRef.current) return
            isJoiningRef.current = true

            try {
                dispatch(setError(null))
                dispatch(setConnectionStatus('connecting'))
                dispatch(setRoomName(roomName))

                const config: MeetingConfig = {
                    roomName,
                    displayName,
                }

                // Connect to server with event emission
                await integratedMeetingService.connect(
                    config,
                    meetingId,
                    userId || 'anonymous',
                    title,
                    description
                )

                // Join the conference
                dispatch(setConferenceStatus('joining'))
                await integratedMeetingService.joinConference(roomName, displayName)
            } catch (error) {
                console.error('Failed to join meeting:', error)
                dispatch(setConnectionStatus('failed'))
                dispatch(
                    setError({
                        type: 'join',
                        message:
                            error instanceof Error
                                ? error.message
                                : 'Failed to join meeting',
                        timestamp: Date.now(),
                    })
                )
            } finally {
                isJoiningRef.current = false
            }
        },
        [dispatch]
    )

    /**
     * Leaves the current meeting and cleans up resources
     * 
     * Critical: Must properly dispose tracks and disconnect to release device access
     */
    const leaveMeeting = useCallback(async () => {
        // Prevent multiple simultaneous leave attempts
        if (isLeavingRef.current) {
            console.log('[useMeeting] ⚠️ Leave already in progress, skipping...')
            return
        }

        isLeavingRef.current = true
        console.log('[useMeeting] 🚪 Leaving meeting - starting cleanup...')

        try {
            dispatch(setConferenceStatus('leaving'))

            // Step 1: Clear event handlers to prevent new events during cleanup
            integratedMeetingService.clearEventHandlers()

            // Step 2: Release all local tracks and stop device access
            console.log('[useMeeting] Releasing local tracks...')
            await deviceService.releaseAllTracks()

            // Step 3: Clear remote tracks storage
            console.log('[useMeeting] Clearing remote tracks...')
            trackService.clearRemoteTracks()

            // Step 4: Leave conference and disconnect
            console.log('[useMeeting] Disconnecting from conference...')
            await integratedMeetingService.disconnect()

            // Step 5: Reset stores
            console.log('[useMeeting] Resetting stores...')
            dispatch(resetMeetingState())
            dispatch(resetTrackState())
            dispatch(clearRemoteTracks())

            console.log('[useMeeting] ✅ Meeting left successfully')
        } catch (error) {
            console.error('[useMeeting] ❌ Error leaving meeting:', error)
            // Still reset state even on error to prevent stuck state
            dispatch(resetMeetingState())
            dispatch(resetTrackState())
            dispatch(clearRemoteTracks())
        } finally {
            // Reset the flag after a delay to allow for re-join if needed
            setTimeout(() => {
                isLeavingRef.current = false
            }, 1000)
        }
    }, [dispatch])    /**
     * Adds a local track to the conference
     */
    const addLocalTrack = useCallback(
        async (track: unknown) => {
            await integratedMeetingService.addTrack(track)
        },
        []
    )

    /**
     * Removes a local track from the conference
     */
    const removeLocalTrack = useCallback(
        async (track: unknown) => {
            await integratedMeetingService.removeTrack(track)
        },
        []
    )

    return {
        // State
        connectionStatus: meetingState.connectionStatus,
        conferenceStatus: meetingState.conferenceStatus,
        roomName: meetingState.roomName,
        localParticipantId: meetingState.localParticipantId,
        participants: meetingState.participants,
        participantList: Object.values(meetingState.participants),
        dominantSpeakerId: meetingState.dominantSpeakerId,
        error: meetingState.error,
        isConnected: meetingState.connectionStatus === 'connected',
        isJoined: meetingState.conferenceStatus === 'joined',
        isConnecting:
            meetingState.connectionStatus === 'connecting' ||
            meetingState.conferenceStatus === 'joining',

        // Actions
        joinMeeting,
        leaveMeeting,
        addLocalTrack,
        removeLocalTrack,
    }
}
