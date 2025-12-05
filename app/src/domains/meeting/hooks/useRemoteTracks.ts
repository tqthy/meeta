/**
 * useRemoteTracks Hook
 *
 * Subscribes to conference track events and updates trackStore.
 * Provides access to remote participant tracks for rendering.
 *
 * @see JitsiAPI/1-JitsiConference/JitsiConferenceEvents_Enum.txt for TRACK_ADDED/TRACK_REMOVED events
 * @see JitsiAPI/6-JitsiTrack for track model
 */

'use client'

import { useCallback, useEffect, useRef, useMemo } from 'react'
import { useAppSelector } from '@/store'
import { trackService } from '../services/meeting-runtime/trackService'
import { RemoteTrackInfo } from '../types/tracks'

interface RemoteTrackWithAttach extends RemoteTrackInfo {
    attach: (container: HTMLElement) => void
    detach: (container?: HTMLElement) => void
    getMediaStream: () => MediaStream | null
}

export function useRemoteTracks() {
    const trackState = useAppSelector((state) => state.tracks)
    const participants = useAppSelector((state) => state.meeting.participants)

    // Cache for attached containers per track
    const attachedContainersRef = useRef<Map<string, Set<HTMLElement>>>(
        new Map()
    )

    /**
     * Attaches a remote track to a container element
     */
    const attachTrack = useCallback(
        (trackId: string, container: HTMLElement) => {
            const track = trackService.getRemoteTrack(trackId)
            if (!track || !container) return

            trackService.attachTrack(track, container)

            // Track attached containers
            if (!attachedContainersRef.current.has(trackId)) {
                attachedContainersRef.current.set(trackId, new Set())
            }
            attachedContainersRef.current.get(trackId)!.add(container)
        },
        []
    )

    /**
     * Detaches a remote track from a container element
     */
    const detachTrack = useCallback(
        (trackId: string, container?: HTMLElement) => {
            const track = trackService.getRemoteTrack(trackId)
            if (!track) return

            trackService.detachTrack(track, container)

            // Update attached containers tracking
            if (container && attachedContainersRef.current.has(trackId)) {
                attachedContainersRef.current.get(trackId)!.delete(container)
            } else if (!container) {
                attachedContainersRef.current.delete(trackId)
            }
        },
        []
    )

    /**
     * Gets the MediaStream for a remote track
     */
    const getMediaStream = useCallback(
        (trackId: string): MediaStream | null => {
            const track = trackService.getRemoteTrack(trackId)
            return trackService.getMediaStream(track)
        },
        []
    )

    /**
     * Gets tracks for a specific participant
     */
    const getParticipantTracks = useCallback(
        (participantId: string): RemoteTrackInfo[] => {
            return Object.values(trackState.remoteTracks).filter(
                (track) => track.participantId === participantId
            )
        },
        [trackState.remoteTracks]
    )

    /**
     * Gets the audio track for a participant
     */
    const getParticipantAudioTrack = useCallback(
        (participantId: string): RemoteTrackInfo | null => {
            return (
                Object.values(trackState.remoteTracks).find(
                    (track) =>
                        track.participantId === participantId &&
                        track.type === 'audio'
                ) || null
            )
        },
        [trackState.remoteTracks]
    )

    /**
     * Gets the video track for a participant
     */
    const getParticipantVideoTrack = useCallback(
        (participantId: string): RemoteTrackInfo | null => {
            return (
                Object.values(trackState.remoteTracks).find(
                    (track) =>
                        track.participantId === participantId &&
                        track.type === 'video'
                ) || null
            )
        },
        [trackState.remoteTracks]
    )

    /**
     * Remote tracks with helper methods attached
     */
    const tracksWithHelpers: Record<string, RemoteTrackWithAttach> = useMemo(() => {
        const result: Record<string, RemoteTrackWithAttach> = {}

        for (const [trackId, trackInfo] of Object.entries(trackState.remoteTracks)) {
            result[trackId] = {
                ...trackInfo,
                attach: (container: HTMLElement) => attachTrack(trackId, container),
                detach: (container?: HTMLElement) => detachTrack(trackId, container),
                getMediaStream: () => getMediaStream(trackId),
            }
        }

        return result
    }, [trackState.remoteTracks, attachTrack, detachTrack, getMediaStream])

    /**
     * Grouped tracks by participant
     */
    const tracksByParticipant = useMemo(() => {
        const grouped: Record<
            string,
            { audio: RemoteTrackInfo | null; video: RemoteTrackInfo | null }
        > = {}

        // Initialize for all remote participants
        for (const participant of Object.values(participants)) {
            if (!participant.isLocal) {
                grouped[participant.id] = { audio: null, video: null }
            }
        }

        // Populate with tracks
        for (const track of Object.values(trackState.remoteTracks)) {
            if (!grouped[track.participantId]) {
                grouped[track.participantId] = { audio: null, video: null }
            }
            if (track.type === 'audio') {
                grouped[track.participantId].audio = track
            } else if (track.type === 'video') {
                grouped[track.participantId].video = track
            }
        }

        return grouped
    }, [trackState.remoteTracks, participants])

    // Cleanup attached containers on unmount
    useEffect(() => {
        const containersRef = attachedContainersRef.current
        return () => {
            // Detach all tracks from all containers
            for (const [trackId, containers] of containersRef) {
                for (const container of containers) {
                    detachTrack(trackId, container)
                }
            }
            containersRef.clear()
        }
    }, [detachTrack])

    return {
        // All remote tracks
        remoteTracks: trackState.remoteTracks,
        remoteTracksWithHelpers: tracksWithHelpers,
        tracksByParticipant,

        // Track count
        remoteTrackCount: Object.keys(trackState.remoteTracks).length,

        // Actions
        attachTrack,
        detachTrack,
        getMediaStream,
        getParticipantTracks,
        getParticipantAudioTrack,
        getParticipantVideoTrack,
    }
}
