/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppDispatch } from '@/store'
import {
    setLocalTracks,
    clearLocalTracks,
    addRemoteTrack,
    removeRemoteTrack,
    setCameraEnabled,
    setMicEnabled,
    setAudioLevel,
    setIsCreatingTracks,
    setTrackError,
    clearRemoteTracks,
} from '@/store/slices/mediaSlice'

// Dynamically import JitsiMeetJS
let JitsiMeetJS: any = null
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    JitsiMeetJS = require('lib-jitsi-meet')
}

/**
 * MediaManager - Quản lý tất cả media-related operations
 * - Tạo và dispose local tracks
 * - Quản lý remote tracks
 * - Handle mute/unmute
 * - Audio level monitoring
 */
export class MediaManager {
    private dispatch: AppDispatch
    private localTracks: any[] = []
    private remoteTracks: Map<string, any[]> = new Map()
    private audioLevelHandlers: Map<string, (level: number) => void> =
        new Map()

    constructor(dispatch: AppDispatch) {
        this.dispatch = dispatch
    }

    /**
     * Tạo local tracks (audio + video)
     */
    async createLocalTracks(options?: {
        cameraEnabled?: boolean
        micEnabled?: boolean
    }): Promise<any[]> {
        if (!JitsiMeetJS) {
            throw new Error('JitsiMeetJS not initialized')
        }

        this.dispatch(setIsCreatingTracks(true))
        this.dispatch(setTrackError(null))

        try {
            console.log('[MediaManager] Creating local tracks...')
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

            this.localTracks = tracks
            this.dispatch(setLocalTracks(tracks))

            // Apply initial mute states
            tracks.forEach((track: any) => {
                if (track.getType() === 'video') {
                    if (!options?.cameraEnabled) {
                        track.mute()
                    }
                    this.dispatch(setCameraEnabled(options?.cameraEnabled ?? true))
                } else if (track.getType() === 'audio') {
                    if (!options?.micEnabled) {
                        track.mute()
                    }
                    this.dispatch(setMicEnabled(options?.micEnabled ?? true))
                }
            })

            console.log('[MediaManager] Local tracks created:', tracks.length)
            return tracks
        } catch (error) {
            console.error('[MediaManager] Failed to create tracks:', error)

            // Fallback với basic constraints
            try {
                console.log('[MediaManager] Trying fallback constraints...')
                const fallbackTracks = await JitsiMeetJS.createLocalTracks({
                    devices: ['audio', 'video'],
                })

                this.localTracks = fallbackTracks
                this.dispatch(setLocalTracks(fallbackTracks))
                console.log('[MediaManager] Fallback tracks created:', fallbackTracks.length)
                return fallbackTracks
            } catch (fallbackError) {
                console.error('[MediaManager] Fallback failed:', fallbackError)
                const errorMsg =
                    fallbackError instanceof Error
                        ? fallbackError.message
                        : 'Unknown error'
                this.dispatch(setTrackError(errorMsg))
                throw fallbackError
            }
        } finally {
            this.dispatch(setIsCreatingTracks(false))
        }
    }

    /**
     * Dispose tất cả local tracks
     */
    async disposeLocalTracks(): Promise<void> {
        console.log('[MediaManager] Disposing local tracks...')

        for (const track of this.localTracks) {
            try {
                track.dispose()
                console.log('[MediaManager] Disposed track:', track.getType())
            } catch (error) {
                console.error('[MediaManager] Failed to dispose track:', error)
            }
        }

        this.localTracks = []
        this.dispatch(clearLocalTracks())
    }

    /**
     * Toggle camera on/off
     */
    toggleCamera(): void {
        const videoTrack = this.localTracks.find(
            (track) => track.getType() === 'video'
        )
        if (videoTrack) {
            if (videoTrack.isMuted()) {
                videoTrack.unmute()
                this.dispatch(setCameraEnabled(true))
            } else {
                videoTrack.mute()
                this.dispatch(setCameraEnabled(false))
            }
        }
    }

    /**
     * Toggle microphone on/off
     */
    toggleMic(): void {
        const audioTrack = this.localTracks.find(
            (track) => track.getType() === 'audio'
        )
        if (audioTrack) {
            if (audioTrack.isMuted()) {
                audioTrack.unmute()
                this.dispatch(setMicEnabled(true))
            } else {
                audioTrack.mute()
                this.dispatch(setMicEnabled(false))
            }
        }
    }

    /**
     * Set camera enabled/disabled
     */
    setCamera(enabled: boolean): void {
        const videoTrack = this.localTracks.find(
            (track) => track.getType() === 'video'
        )
        if (videoTrack) {
            if (enabled) {
                videoTrack.unmute()
            } else {
                videoTrack.mute()
            }
            this.dispatch(setCameraEnabled(enabled))
        }
    }

    /**
     * Set microphone enabled/disabled
     */
    setMic(enabled: boolean): void {
        const audioTrack = this.localTracks.find(
            (track) => track.getType() === 'audio'
        )
        if (audioTrack) {
            if (enabled) {
                audioTrack.unmute()
            } else {
                audioTrack.mute()
            }
            this.dispatch(setMicEnabled(enabled))
        }
    }

    /**
     * Handle remote track được add vào conference
     */
    handleRemoteTrackAdded(track: any): void {
        if (track.isLocal()) return

        const participantId = track.getParticipantId()
        const trackType = track.getType()

        console.log(
            '[MediaManager] Remote track added:',
            trackType,
            'from:',
            participantId
        )

        // Store track
        const tracks = this.remoteTracks.get(participantId) || []
        tracks.push(track)
        this.remoteTracks.set(participantId, tracks)

        // Dispatch to Redux
        this.dispatch(addRemoteTrack({ participantId, track }))

        // Listen to mute changes
        track.addEventListener(
            JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
            () => {
                console.log(
                    '[MediaManager] Track mute changed:',
                    trackType,
                    'muted:',
                    track.isMuted()
                )
            }
        )

        // Listen to audio levels (for audio tracks)
        if (trackType === 'audio') {
            const audioLevelHandler = (audioLevel: number) => {
                if (audioLevel > 0.01) {
                    this.dispatch(
                        setAudioLevel({ participantId, level: audioLevel })
                    )
                }
            }
            track.addEventListener(
                JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                audioLevelHandler
            )
            this.audioLevelHandlers.set(track.getId(), audioLevelHandler)
        }
    }

    /**
     * Handle remote track bị remove khỏi conference
     */
    handleRemoteTrackRemoved(track: any): void {
        const participantId = track.getParticipantId()
        const trackId = track.getId()
        const trackType = track.getType()

        console.log(
            '[MediaManager] Track removed:',
            trackType,
            'from:',
            participantId
        )

        // Remove from local storage
        const tracks = this.remoteTracks.get(participantId) || []
        const filtered = tracks.filter((t) => t.getId() !== trackId)
        if (filtered.length > 0) {
            this.remoteTracks.set(participantId, filtered)
        } else {
            this.remoteTracks.delete(participantId)
        }

        // Cleanup audio level handler
        const audioLevelHandler = this.audioLevelHandlers.get(trackId)
        if (audioLevelHandler) {
            track.removeEventListener(
                JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                audioLevelHandler
            )
            this.audioLevelHandlers.delete(trackId)
        }

        // Dispatch to Redux
        this.dispatch(removeRemoteTrack({ participantId, trackId }))
    }

    /**
     * Get local tracks
     */
    getLocalTracks(): any[] {
        return this.localTracks
    }

    /**
     * Get remote tracks for a participant
     */
    getRemoteTracksForParticipant(participantId: string): any[] {
        return this.remoteTracks.get(participantId) || []
    }

    /**
     * Cleanup all remote tracks
     */
    clearAllRemoteTracks(): void {
        console.log('[MediaManager] Clearing all remote tracks...')

        // Remove all audio level handlers
        this.audioLevelHandlers.clear()

        // Clear remote tracks
        this.remoteTracks.clear()
        this.dispatch(clearRemoteTracks())
    }

    /**
     * Complete cleanup
     */
    async cleanup(): Promise<void> {
        console.log('[MediaManager] Complete cleanup...')
        await this.disposeLocalTracks()
        this.clearAllRemoteTracks()
    }
}
