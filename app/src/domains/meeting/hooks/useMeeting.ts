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


export function useMeeting() {
    const dispatch = useAppDispatch()
    const meetingState = useAppSelector((state) => state.meeting)
    const isJoiningRef = useRef(false)

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
                // Only handle remote tracks here
                if (trackService.isLocalTrack(track)) {
                    console.log('[useMeeting] Ignoring local track in onTrackAdded')
                    return
                }

                const trackInfo = trackService.extractRemoteTrackInfo(track)
                const participantId = trackService.getParticipantId(track)
                const trackType = trackService.getTrackType(track)
                const isMuted = trackService.isTrackMuted(track)

                console.log('[useMeeting] 🎬 Remote track added:', {
                    trackId: trackInfo.id,
                    participantId,
                    trackType,
                    isMuted,
                    isVideoType: track.isVideoType?.(),
                    isAudioType: track.isAudioType?.(),
                    isEnded: track.isEnded?.(),
                    trackInfo
                })

                trackService.storeRemoteTrack(trackInfo.id, track)
                dispatch(addRemoteTrack(trackInfo))

                // Update participant mute state
                if (participantId && trackType) {
                    const muteUpdate = trackType === 'audio'
                        ? { isAudioMuted: isMuted }
                        : { isVideoMuted: isMuted }

                    console.log('[useMeeting] Updating participant mute state:', {
                        participantId,
                        trackType,
                        updates: muteUpdate
                    })

                    dispatch(
                        updateParticipant({
                            id: participantId,
                            updates: muteUpdate,
                        })
                    )
                }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onTrackRemoved: (track: any) => {
                if (trackService.isLocalTrack(track)) {
                    console.log('[useMeeting] Ignoring local track in onTrackRemoved')
                    return
                }

                const trackId = track.getId?.() || `remote-${track.getType?.()}`
                const participantId = trackService.getParticipantId(track)
                const trackType = trackService.getTrackType(track)

                console.log('[useMeeting] 🗑️ Remote track removed:', {
                    trackId,
                    participantId,
                    trackType
                })

                trackService.removeRemoteTrack(trackId)
                dispatch(removeRemoteTrack(trackId))
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onTrackMuteChanged: (track: any) => {
                if (trackService.isLocalTrack(track)) {
                    console.log('[useMeeting] Ignoring local track in onTrackMuteChanged')
                    return
                }

                const trackId = track.getId?.()
                const isMuted = trackService.isTrackMuted(track)
                const participantId = trackService.getParticipantId(track)
                const trackType = trackService.getTrackType(track)

                console.log('[useMeeting] 🔇 Remote track mute changed:', {
                    trackId,
                    participantId,
                    trackType,
                    isMuted,
                    wasAlreadyMuted: track.isMuted?.() // Check Jitsi's internal state
                })

                if (trackId) {
                    dispatch(
                        updateRemoteTrack({
                            id: trackId,
                            updates: { isMuted },
                        })
                    )
                }

                // Update participant state
                if (participantId && trackType) {
                    const muteUpdate = trackType === 'audio'
                        ? { isAudioMuted: isMuted }
                        : { isVideoMuted: isMuted }

                    console.log('[useMeeting] Updating participant from mute change:', {
                        participantId,
                        updates: muteUpdate
                    })

                    dispatch(
                        updateParticipant({
                            id: participantId,
                            updates: muteUpdate,
                        })
                    )
                }
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
    }, [dispatch])

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
     */
    const leaveMeeting = useCallback(async () => {
        try {
            dispatch(setConferenceStatus('leaving'))

            // Release all tracks
            await deviceService.releaseAllTracks()

            // Clear remote tracks storage
            trackService.clearRemoteTracks()

            // Disconnect from meeting
            await integratedMeetingService.disconnect()

            // Reset stores
            dispatch(resetMeetingState())
            dispatch(resetTrackState())
            dispatch(clearRemoteTracks())
        } catch (error) {
            console.error('Error leaving meeting:', error)
            // Still reset state even on error
            dispatch(resetMeetingState())
            dispatch(resetTrackState())
        }
    }, [dispatch])

    /**
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
