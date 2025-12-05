/**
 * trackService
 *
 * Adapter for JitsiTrack operations.
 * Creates/destroys local tracks, handles mute/unmute, and attaches track events to store updates.
 *
 * @see JitsiAPI/6-JitsiTrack for track lifecycle and events
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getJitsiMeetJS } from './jitsiLoader'
import { LocalTrackInfo, RemoteTrackInfo, MediaType } from '../../types/tracks'

// Remote track storage (SDK objects, not serializable)
const remoteTrackStorage = new Map<string, any>()

/**
 * Extracts serializable local track info from JitsiLocalTrack
 */
function extractLocalTrackInfo(track: any): LocalTrackInfo {
    return {
        id: track.getId?.() || `${track.getType()}-${Date.now()}`,
        type: track.getType() as MediaType,
        videoType: track.videoType || (track.getType() === 'video' ? 'camera' : undefined),
        deviceId: track.getDeviceId?.() || '',
        isMuted: track.isMuted?.() || false,
        isActive: !track.disposed,
    }
}

/**
 * Extracts serializable remote track info from JitsiRemoteTrack
 */
function extractRemoteTrackInfo(track: any): RemoteTrackInfo {
    return {
        id: track.getId?.() || `remote-${Date.now()}`,
        participantId: track.getParticipantId?.() || '',
        type: track.getType() as MediaType,
        videoType: track.videoType,
        isMuted: track.isMuted?.() || false,
        streamingStatus: 'active',
    }
}

/**
 * Mutes a track
 */
async function muteTrack(track: any): Promise<void> {
    if (!track || track.isMuted?.()) return
    await track.mute?.()
}

/**
 * Unmutes a track
 */
async function unmuteTrack(track: any): Promise<void> {
    if (!track || !track.isMuted?.()) return
    await track.unmute?.()
}

/**
 * Toggles track mute state
 */
async function toggleMute(track: any): Promise<boolean> {
    if (!track) return true

    if (track.isMuted?.()) {
        await unmuteTrack(track)
        return false
    } else {
        await muteTrack(track)
        return true
    }
}

/**
 * Attaches a track to a DOM element
 */
function attachTrack(track: any, container: HTMLElement): void {
    if (!track || !container) return

    try {
        track.attach?.(container)
    } catch (error) {
        console.error('Failed to attach track:', error)
    }
}

/**
 * Detaches a track from a DOM element
 */
function detachTrack(track: any, container?: HTMLElement): void {
    if (!track) return

    try {
        if (container) {
            track.detach?.(container)
        } else {
            // Detach from all containers
            track.detach?.()
        }
    } catch (error) {
        console.error('Failed to detach track:', error)
    }
}

/**
 * Gets the original MediaStream from a track
 */
function getMediaStream(track: any): MediaStream | null {
    if (!track) return null

    try {
        return track.getOriginalStream?.() || track.stream || null
    } catch {
        return null
    }
}

/**
 * Checks if a track is local
 */
function isLocalTrack(track: any): boolean {
    return track?.isLocal?.() ?? false
}

/**
 * Stores a remote track
 */
function storeRemoteTrack(trackId: string, track: any): void {
    remoteTrackStorage.set(trackId, track)
}

/**
 * Gets a stored remote track
 */
function getRemoteTrack(trackId: string): any | null {
    return remoteTrackStorage.get(trackId) || null
}

/**
 * Removes a remote track from storage
 */
function removeRemoteTrack(trackId: string): void {
    remoteTrackStorage.delete(trackId)
}

/**
 * Clears all remote tracks
 */
function clearRemoteTracks(): void {
    remoteTrackStorage.clear()
}

/**
 * Gets the participant ID from a track
 */
function getParticipantId(track: any): string | null {
    return track?.getParticipantId?.() || null
}

/**
 * Gets the track type
 */
function getTrackType(track: any): MediaType | null {
    const type = track?.getType?.()
    return type === 'audio' || type === 'video' ? type : null
}

/**
 * Checks if a track is muted
 */
function isTrackMuted(track: any): boolean {
    return track?.isMuted?.() ?? true
}

/**
 * Subscribes to track mute change events
 */
async function onTrackMuteChanged(
    track: any,
    callback: (isMuted: boolean) => void
): Promise<() => void> {
    const JitsiMeetJS = await getJitsiMeetJS()
    const trackEvents = JitsiMeetJS?.events?.track

    if (!track || !trackEvents) {
        return () => { }
    }

    const handler = () => {
        callback(track.isMuted?.() ?? true)
    }

    track.addEventListener?.(trackEvents.TRACK_MUTE_CHANGED, handler)

    return () => {
        track.removeEventListener?.(trackEvents.TRACK_MUTE_CHANGED, handler)
    }
}

/**
 * Subscribes to track audio level changes
 */
async function onAudioLevelChanged(
    track: any,
    callback: (level: number) => void
): Promise<() => void> {
    const JitsiMeetJS = await getJitsiMeetJS()
    const trackEvents = JitsiMeetJS?.events?.track

    if (!track || !trackEvents || track.getType?.() !== 'audio') {
        return () => { }
    }

    const handler = (level: number) => {
        callback(level)
    }

    track.addEventListener?.(trackEvents.TRACK_AUDIO_LEVEL_CHANGED, handler)

    return () => {
        track.removeEventListener?.(
            trackEvents.TRACK_AUDIO_LEVEL_CHANGED,
            handler
        )
    }
}

export const trackService = {
    extractLocalTrackInfo,
    extractRemoteTrackInfo,
    muteTrack,
    unmuteTrack,
    toggleMute,
    attachTrack,
    detachTrack,
    getMediaStream,
    isLocalTrack,
    storeRemoteTrack,
    getRemoteTrack,
    removeRemoteTrack,
    clearRemoteTracks,
    getParticipantId,
    getTrackType,
    isTrackMuted,
    onTrackMuteChanged,
    onAudioLevelChanged,
}
