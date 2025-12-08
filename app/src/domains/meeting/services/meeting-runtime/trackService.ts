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
 * 
 * @see JitsiAPI/1-JitsiConference/Class_JitsiLocalTrack.txt for available methods
 */
function extractLocalTrackInfo(track: any): LocalTrackInfo {
    try {
        return {
            id: track.getId?.() || `${track.getType?.()}-${Date.now()}`,
            type: track.getType?.() as MediaType,
            videoType: track.getVideoType?.() || track.videoType || (track.getType?.() === 'video' ? 'camera' : undefined),
            deviceId: track.getDeviceId?.() || '',
            isMuted: track.isMuted?.() ?? false,
            isActive: track.isActive?.() ?? !track.disposed,
        }
    } catch (error) {
        console.error('[trackService] Error extracting local track info:', error)
        return {
            id: `error-${Date.now()}`,
            type: 'video' as MediaType,
            videoType: undefined,
            deviceId: '',
            isMuted: true,
            isActive: false,
        }
    }
}

/**
 * Extracts serializable remote track info from JitsiRemoteTrack
 * 
 * @see JitsiAPI/1-JitsiConference/Class_JitsiRemoteTrack.txt for available methods
 */
function extractRemoteTrackInfo(track: any): RemoteTrackInfo {
    try {
        return {
            id: track.getId?.() || `remote-${Date.now()}`,
            participantId: track.getParticipantId?.() || '',
            type: track.getType?.() as MediaType,
            videoType: track.getVideoType?.() || track.videoType,
            isMuted: track.isMuted?.() ?? false,
            streamingStatus: 'active',
        }
    } catch (error) {
        console.error('[trackService] Error extracting remote track info:', error)
        return {
            id: `error-${Date.now()}`,
            participantId: '',
            type: 'video' as MediaType,
            videoType: undefined,
            isMuted: true,
            streamingStatus: 'interrupted',
        }
    }
}

/**
 * Mutes a track
 */
async function muteTrack(track: any): Promise<void> {
    if (!track) {
        console.warn('[trackService] Cannot mute: track is null or undefined')
        return
    }

    try {
        if (track.isMuted?.()) return

        if (typeof track.mute === 'function') {
            await track.mute?.()
        } else {
            console.warn('[trackService] Track mute method not available')
        }
    } catch (error) {
        console.error('[trackService] Failed to mute track:', error)
        // Continue even if mute fails - the track may still function
    }
}

/**
 * Unmutes a track
 */
async function unmuteTrack(track: any): Promise<void> {
    if (!track) {
        console.warn('[trackService] Cannot unmute: track is null or undefined')
        return
    }

    try {
        if (!track.isMuted?.()) return

        if (typeof track.unmute === 'function') {
            await track.unmute?.()
        } else {
            console.warn('[trackService] Track unmute method not available')
        }
    } catch (error) {
        console.error('[trackService] Failed to unmute track:', error)
        // Continue even if unmute fails - the track may still function
    }
}

/**
 * Toggles track mute state
 */
async function toggleMute(track: any): Promise<boolean> {
    if (!track) {
        console.warn('[trackService] Cannot toggle mute: track is null or undefined')
        return true
    }

    try {
        if (track.isMuted?.()) {
            await unmuteTrack(track)
            return false
        } else {
            await muteTrack(track)
            return true
        }
    } catch (error) {
        console.error('[trackService] Failed to toggle mute:', error)
        // Return current muted state or assume muted on error
        return track.isMuted?.() ?? true
    }
}

/**
 * Attaches a track to a DOM element
 * 
 * @see JitsiAPI/1-JitsiConference/Class_JitsiLocalTrack.txt (method: attach)
 * @see JitsiAPI/1-JitsiConference/Class_JitsiRemoteTrack.txt (method: attach)
 */
function attachTrack(track: any, container: HTMLElement): void {
    if (!track || !container) {
        console.warn('[trackService] Cannot attach: track or container is null')
        return
    }

    try {
        // Validate container is a valid HTMLElement (video or audio)
        const tagName = container.tagName?.toLowerCase()
        if (tagName !== 'video' && tagName !== 'audio') {
            console.warn('[trackService] Container must be video or audio element, got:', tagName)
            return
        }

        if (typeof track.attach === 'function') {
            track.attach(container)
        } else {
            console.warn('[trackService] Track does not have attach method')
        }
    } catch (error) {
        console.error('[trackService] Failed to attach track:', error)
    }
}

/**
 * Detaches a track from a DOM element
 * 
 * @see JitsiAPI/1-JitsiConference/Class_JitsiLocalTrack.txt (method: detach)
 * @see JitsiAPI/1-JitsiConference/Class_JitsiRemoteTrack.txt (method: detach)
 */
function detachTrack(track: any, container?: HTMLElement): void {
    if (!track) {
        console.warn('[trackService] Cannot detach: track is null')
        return
    }

    try {
        if (typeof track.detach === 'function') {
            if (container) {
                // Detach from specific container
                track.detach(container)
            } else {
                // Detach from all containers
                track.detach()
            }
        } else {
            console.warn('[trackService] Track does not have detach method')
        }
    } catch (error) {
        console.error('[trackService] Failed to detach track:', error)
    }
}

/**
 * Gets the original MediaStream from a track
 * 
 * @see JitsiAPI/1-JitsiConference/Class_JitsiLocalTrack.txt (method: getOriginalStream)
 * @see JitsiAPI/1-JitsiConference/Class_JitsiRemoteTrack.txt (method: getStream)
 */
function getMediaStream(track: any): MediaStream | null {
    if (!track) return null

    try {
        // Local tracks use getOriginalStream(), remote tracks use getStream()
        if (track.isLocal?.()) {
            return track.getOriginalStream?.() || track.stream || null
        } else {
            return track.getStream?.() || track.stream || null
        }
    } catch (error) {
        console.error('[trackService] Error getting media stream:', error)
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
