'use client'

import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import {
    setLocalParticipant,
    addRemoteParticipant,
    removeRemoteParticipant,
    updateParticipantTracks,
    updateParticipantMuteState,
    type Participant,
    ParticipantRole,
} from '@/store/slices/participantsSlice'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface UseParticipantsManagerProps {
    room: any
    userName: string
    localTracks: any[]
}

export const useParticipantsManager = ({
    room,
    userName,
    localTracks,
}: UseParticipantsManagerProps) => {
    const dispatch = useAppDispatch()
    const { localParticipant, remoteParticipants } = useAppSelector(
        (state) => state.participants
    )
    const localParticipantIdRef = useRef<string | null>(null)

    // Initialize local participant when tracks are ready
    useEffect(() => {
        if (localTracks.length === 0 || !room) return

        // Đúng cách phân biệt video/audio track: sử dụng getType() thay vì getVideoType()
        const videoTrack = localTracks.find(
            (track) => track.getType() === 'video'
        )
        const audioTrack = localTracks.find(
            (track) => track.getType() === 'audio'
        )

        const audioTrackMuted = audioTrack?.isMuted?.()
        const videoTrackMuted = videoTrack?.isMuted?.()

        const newLocalParticipant: Participant = {
            id: room?.myUserId || 'local',
            displayName: userName || 'You',
            role: ParticipantRole.HOST,
            isMuted: audioTrackMuted ?? true,
            videoTrack: videoTrack || null,
            audioTrack: audioTrack || null,
            audioLevel: 0,
            isLocalParticipant: true,
            joinedAt: Date.now(),
        }

        localParticipantIdRef.current = newLocalParticipant.id
        dispatch(setLocalParticipant(newLocalParticipant))

        console.log('[ParticipantsManager] Local participant updated:', {
            id: newLocalParticipant.id,
            name: newLocalParticipant.displayName,
            hasVideo: !!videoTrack,
            videoMuted: videoTrackMuted,
            hasAudio: !!audioTrack,
            audioMuted: audioTrackMuted,
        })
    }, [room, userName, localTracks, dispatch])

    // Handle remote participant joined
    useEffect(() => {
        if (!room) return

        const onUserJoined = (participantId: string) => {
            const participant: Participant = {
                id: participantId,
                displayName:
                    room
                        .getParticipantById?.(participantId)
                        ?.getDisplayName?.() || `User ${participantId}`,
                role: ParticipantRole.PARTICIPANT,
                isMuted: false,
                videoTrack: null,
                audioTrack: null,
                audioLevel: 0,
                isLocalParticipant: false,
                joinedAt: Date.now(),
            }

            dispatch(addRemoteParticipant(participant))
            console.log('[ParticipantsManager] User joined:', participantId)
        }

        const onUserLeft = (participantId: string) => {
            dispatch(removeRemoteParticipant(participantId))
            console.log('[ParticipantsManager] User left:', participantId)
        }

        const onTrackAdded = (track: any) => {
            if (!track) return

            const participantId = track.getParticipantId?.()
            if (
                !participantId ||
                participantId === localParticipantIdRef.current
            ) {
                return
            }

            // Sử dụng getType() để phân biệt video và audio tracks
            const isVideoTrack = track.getType?.() === 'video'
            const payload: any = {
                participantId,
                isLocal: false,
            }

            if (isVideoTrack) {
                payload.videoTrack = track
            } else {
                payload.audioTrack = track
            }

            dispatch(updateParticipantTracks(payload))

            console.log(
                '[ParticipantsManager] Track added:',
                participantId,
                isVideoTrack ? 'video' : 'audio'
            )
        }

        const onTrackRemoved = (track: any) => {
            if (!track) return

            const participantId = track.getParticipantId?.()
            if (!participantId) return

            // Sử dụng getType() để phân biệt video và audio tracks
            const isVideoTrack = track.getType?.() === 'video'
            const payload: any = {
                participantId,
                isLocal: false,
            }

            if (isVideoTrack) {
                payload.videoTrack = null
            } else {
                payload.audioTrack = null
            }

            dispatch(updateParticipantTracks(payload))

            console.log(
                '[ParticipantsManager] Track removed:',
                participantId,
                isVideoTrack ? 'video' : 'audio'
            )
        }

        const onAudioMuteStatusChanged = (
            participantId: string,
            isMuted: boolean
        ) => {
            dispatch(
                updateParticipantMuteState({
                    participantId,
                    isMuted,
                    isLocal: participantId === localParticipantIdRef.current,
                })
            )

            console.log(
                '[ParticipantsManager] Audio mute changed:',
                participantId,
                isMuted
            )
        }

        // Register event listeners
        if (!room || typeof room.on !== 'function') {
            console.warn('[ParticipantsManager] Room not ready or invalid')
            return
        }

        room.on('participantJoined', onUserJoined)
        room.on('participantLeft', onUserLeft)
        room.on('trackAdded', onTrackAdded)
        room.on('trackRemoved', onTrackRemoved)
        room.on('audioMuteStatusChanged', onAudioMuteStatusChanged)

        // Cleanup
        return () => {
            if (!room || typeof room.off !== 'function') return
            room.off('participantJoined', onUserJoined)
            room.off('participantLeft', onUserLeft)
            room.off('trackAdded', onTrackAdded)
            room.off('trackRemoved', onTrackRemoved)
            room.off('audioMuteStatusChanged', onAudioMuteStatusChanged)
        }
    }, [room, dispatch])

    // Get all participants including local
    const allParticipants: Participant[] = []
    if (localParticipant) {
        allParticipants.push(localParticipant)
    }
    allParticipants.push(...Object.values(remoteParticipants))

    return {
        localParticipant,
        remoteParticipants,
        allParticipants,
    }
}
