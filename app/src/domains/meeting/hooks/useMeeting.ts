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
import { meetingService } from '../services/meeting-runtime/meetingService'
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

interface UseMeetingOptions {
    serverUrl: string
}

export function useMeeting(options: UseMeetingOptions) {
    const dispatch = useAppDispatch()
    const meetingState = useAppSelector((state) => state.meeting)
    const isJoiningRef = useRef(false)

    // Setup event handlers on mount
    useEffect(() => {
        meetingService.setEventHandlers({
            onConnectionEstablished: () => {
                dispatch(setConnectionStatus('connected'))
            },
            onConnectionFailed: (error) => {
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
                const localParticipant = meetingService.getLocalParticipant()
                if (localParticipant) {
                    dispatch(setLocalParticipantId(localParticipant.id))
                    dispatch(addParticipant(localParticipant))
                }
            },
            onConferenceFailed: (error) => {
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
                dispatch(addParticipant(participant))
            },
            onUserLeft: (participantId: string) => {
                dispatch(removeParticipant(participantId))
                dispatch(removeRemoteTracksByParticipant(participantId))
            },
            onTrackAdded: (track) => {
                // Only handle remote tracks here
                if (trackService.isLocalTrack(track)) return

                const trackInfo = trackService.extractRemoteTrackInfo(track)
                trackService.storeRemoteTrack(trackInfo.id, track)
                dispatch(addRemoteTrack(trackInfo))

                // Update participant mute state
                const participantId = trackService.getParticipantId(track)
                const trackType = trackService.getTrackType(track)
                if (participantId && trackType) {
                    dispatch(
                        updateParticipant({
                            id: participantId,
                            updates:
                                trackType === 'audio'
                                    ? {
                                        isAudioMuted:
                                            trackService.isTrackMuted(track),
                                    }
                                    : {
                                        isVideoMuted:
                                            trackService.isTrackMuted(track),
                                    },
                        })
                    )
                }
            },
            onTrackRemoved: (track) => {
                if (trackService.isLocalTrack(track)) return

                const trackId =
                    track.getId?.() || `remote-${track.getType?.()}`
                trackService.removeRemoteTrack(trackId)
                dispatch(removeRemoteTrack(trackId))
            },
            onTrackMuteChanged: (track) => {
                if (trackService.isLocalTrack(track)) return

                const trackId = track.getId?.()
                const isMuted = trackService.isTrackMuted(track)

                if (trackId) {
                    dispatch(
                        updateRemoteTrack({
                            id: trackId,
                            updates: { isMuted },
                        })
                    )
                }

                // Update participant state
                const participantId = trackService.getParticipantId(track)
                const trackType = trackService.getTrackType(track)
                if (participantId && trackType) {
                    dispatch(
                        updateParticipant({
                            id: participantId,
                            updates:
                                trackType === 'audio'
                                    ? { isAudioMuted: isMuted }
                                    : { isVideoMuted: isMuted },
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
            meetingService.clearEventHandlers()
        }
    }, [dispatch])

    /**
     * Joins a meeting room
     */
    const joinMeeting = useCallback(
        async (roomName: string, displayName: string) => {
            if (isJoiningRef.current) return
            isJoiningRef.current = true

            try {
                dispatch(setError(null))
                dispatch(setConnectionStatus('connecting'))
                dispatch(setRoomName(roomName))

                const config: MeetingConfig = {
                    roomName,
                    displayName,
                    serverUrl: options.serverUrl,
                }

                // Connect to server
                await meetingService.connect(config)

                // Join the conference
                dispatch(setConferenceStatus('joining'))
                await meetingService.joinConference(roomName, displayName)
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
        [dispatch, options.serverUrl]
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
            await meetingService.disconnect()

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
            await meetingService.addTrack(track)
        },
        []
    )

    /**
     * Removes a local track from the conference
     */
    const removeLocalTrack = useCallback(
        async (track: unknown) => {
            await meetingService.removeTrack(track)
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
