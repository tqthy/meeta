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
import {
    createTracksWithFallback,
    getMediaDeviceChanges,
    isDeviceAvailable,
    groupDevicesByKind,
    type MediaDeviceChange
} from './MediaDeviceHelper'

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
 * - Device change detection và auto-switching
 * 
 * Improved based on Jitsi's mediaDeviceHelper.js patterns
 */
export class MediaManager {
    private dispatch: AppDispatch
    private localTracks: any[] = []
    private remoteTracks: Record<string, any[]> = {}
    private audioLevelHandlers: Map<string, (level: number) => void> =
        new Map()

    // Device management
    private availableDevices: MediaDeviceInfo[] = []
    private deviceChangeListener: (() => void) | null = null

    constructor(dispatch: AppDispatch) {
        this.dispatch = dispatch
        this.setupDeviceChangeListener()
    }

    /**
     * Setup device change listener
     */
    private setupDeviceChangeListener(): void {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
            return
        }

        this.deviceChangeListener = async () => {
            console.log('[MediaManager] Device change detected')
            await this.handleDeviceListChanged()
        }

        navigator.mediaDevices.addEventListener(
            'devicechange',
            this.deviceChangeListener
        )
    }

    /**
     * Handle khi device list thay đổi (cắm/rút thiết bị)
     */
    private async handleDeviceListChanged(): Promise<void> {
        try {
            const newDevices = await navigator.mediaDevices.enumerateDevices()
            const oldDevices = this.availableDevices

            // Get current tracks
            const audioTrack = this.localTracks.find(t => t.getType() === 'audio')
            const videoTrack = this.localTracks.find(t => t.getType() === 'video')

            // TODO: Get preferences from Redux store
            const preferences = {
                micDeviceId: null,
                cameraDeviceId: null,
                audioOutputDeviceId: null
            }

            // Determine device changes
            const changes = getMediaDeviceChanges(
                newDevices,
                oldDevices,
                audioTrack,
                videoTrack,
                null, // current output device
                preferences,
                this.dispatch
            )

            // Apply changes if needed
            await this.applyDeviceChanges(changes)

            // Update device list
            this.availableDevices = newDevices
        } catch (error) {
            console.error('[MediaManager] Error handling device list change:', error)
        }
    }

    /**
     * Apply device changes
     */
    private async applyDeviceChanges(changes: MediaDeviceChange): Promise<void> {
        const needsRecreate = changes.audioinput || changes.videoinput

        if (!needsRecreate) {
            return
        }

        console.log('[MediaManager] Applying device changes:', changes)

        // Dispose old tracks
        await this.disposeLocalTracks()

        // Recreate tracks with new devices
        try {
            await this.createLocalTracks({
                cameraDeviceId: changes.videoinput,
                micDeviceId: changes.audioinput
            })
        } catch (error) {
            console.error('[MediaManager] Error recreating tracks:', error)
            this.dispatch(setTrackError('Failed to switch devices'))
        }
    }

    /**
     * Tạo local tracks (audio + video) với graceful fallback
     * Improved based on Jitsi's pattern
     */
    async createLocalTracks(options?: {
        cameraEnabled?: boolean
        micEnabled?: boolean
        cameraDeviceId?: string
        micDeviceId?: string
    }): Promise<any[]> {
        if (!JitsiMeetJS) {
            throw new Error('JitsiMeetJS not initialized')
        }

        this.dispatch(setIsCreatingTracks(true))
        this.dispatch(setTrackError(null))

        try {
            // Get current available devices
            this.availableDevices = await navigator.mediaDevices.enumerateDevices()

            console.log('[MediaManager] createLocalTracks options:', options)

            // Determine which devices to use
            // undefined = use default device
            // null = don't create that type of track
            // If enabled is not explicitly false, we want to create the track
            const cameraToUse = options?.cameraEnabled === false ? null :
                (options?.cameraDeviceId || undefined)
            const micToUse = options?.micEnabled === false ? null :
                (options?.micDeviceId || undefined)

            console.log('[MediaManager] Devices to use:', { cameraToUse, micToUse })

            // Use helper for graceful fallback
            const { tracks, audioError, videoError } = await createTracksWithFallback(
                async (createOptions: any) => {
                    return await JitsiMeetJS.createLocalTracks({
                        devices: createOptions.devices,
                        cameraDeviceId: createOptions.cameraDeviceId,
                        micDeviceId: createOptions.micDeviceId,
                        constraints: {
                            video: {
                                deviceId: createOptions.cameraDeviceId ?
                                    { exact: createOptions.cameraDeviceId } : undefined,
                                width: { ideal: 1280, max: 1920 },
                                height: { ideal: 720, max: 1080 },
                                frameRate: { ideal: 30 },
                            },
                            audio: {
                                deviceId: createOptions.micDeviceId ?
                                    { exact: createOptions.micDeviceId } : undefined,
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true,
                            },
                        },
                    })
                },
                cameraToUse || undefined,
                micToUse || undefined
            )

            // Note: tracks can be empty if both audio and video failed
            // We'll handle this with error messages below
            console.log('[MediaManager] Created tracks:', tracks.length, 'tracks')

            if (tracks.length === 0) {
                let errorMsg = 'No tracks created'

                if (audioError && videoError) {
                    errorMsg = `Failed to create both audio and video tracks: ${audioError.message}, ${videoError.message}`
                    console.error('[MediaManager] Audio error:', audioError)
                    console.error('[MediaManager] Video error:', videoError)
                } else if (audioError) {
                    errorMsg = `Failed to create audio track: ${audioError.message}`
                    console.error('[MediaManager] Audio error:', audioError)
                } else if (videoError) {
                    errorMsg = `Failed to create video track: ${videoError.message}`
                    console.error('[MediaManager] Video error:', videoError)
                } else {
                    errorMsg = 'No tracks created (no devices requested or all failed)'
                    console.warn('[MediaManager] No errors but no tracks created. Check device permissions and availability.')
                }

                console.error('[MediaManager]', errorMsg)
                this.dispatch(setTrackError(errorMsg))
                // Don't throw - let the app handle gracefully
            }

            this.localTracks = tracks
            this.dispatch(setLocalTracks(tracks))

            // Handle partial errors
            if (audioError) {
                console.error('[MediaManager] Audio track error:', audioError)
                // Still continue with video if available
            }
            if (videoError) {
                console.error('[MediaManager] Video track error:', videoError)
                // Still continue with audio if available
            }

            // Apply initial mute states
            tracks.forEach((track: any) => {
                if (track.getType() === 'video') {
                    if (options?.cameraEnabled === false) {
                        track.mute()
                    }
                    this.dispatch(setCameraEnabled(options?.cameraEnabled ?? true))
                } else if (track.getType() === 'audio') {
                    if (options?.micEnabled === false) {
                        track.mute()
                    }
                    this.dispatch(setMicEnabled(options?.micEnabled ?? true))
                }
            })

            return tracks
        } catch (error) {
            const errorMsg =
                error instanceof Error
                    ? error.message
                    : 'Unknown error'
            this.dispatch(setTrackError(errorMsg))
            throw error
        } finally {
            this.dispatch(setIsCreatingTracks(false))
        }
    }

    /**
     * Dispose tất cả local tracks với proper cleanup
     */
    async disposeLocalTracks(): Promise<void> {
        for (const track of this.localTracks) {
            try {
                // Check if track is already disposed or ended (Jitsi pattern)
                if (track.disposed || track.isEnded?.()) {
                    console.log('[MediaManager] Track already disposed/ended')
                    continue
                }

                track.dispose()
            } catch (error) {
                console.error('[MediaManager] Track disposal failed:', error)
                // Continue with other tracks
            }
        }

        this.localTracks = []
        this.dispatch(clearLocalTracks())
    }

    /**
     * Toggle camera on/off
     * IMPORTANT: mute/unmute are ASYNC operations!
     */
    async toggleCamera(): Promise<void> {
        const videoTrack = this.localTracks.find(
            (track) => track.getType() === 'video'
        )
        if (videoTrack) {
            const currentlyMuted = videoTrack.isMuted()
            const newState = !currentlyMuted

            console.log('[MediaManager] toggleCamera - currently muted:', currentlyMuted, '-> new state:', newState)

            try {
                if (currentlyMuted) {
                    await videoTrack.unmute()
                    console.log('[MediaManager] ✅ Camera toggled ON')
                } else {
                    await videoTrack.mute()
                    console.log('[MediaManager] ✅ Camera toggled OFF')
                }
                this.dispatch(setCameraEnabled(newState))
            } catch (error) {
                console.error('[MediaManager] ❌ Error toggling camera:', error)
                throw error
            }
        }
    }

    /**
     * Toggle microphone on/off
     * IMPORTANT: mute/unmute are ASYNC operations!
     */
    async toggleMic(): Promise<void> {
        const audioTrack = this.localTracks.find(
            (track) => track.getType() === 'audio'
        )
        if (audioTrack) {
            const currentlyMuted = audioTrack.isMuted()
            const newState = !currentlyMuted

            console.log('[MediaManager] toggleMic - currently muted:', currentlyMuted, '-> new state:', newState)

            try {
                if (currentlyMuted) {
                    await audioTrack.unmute()
                    console.log('[MediaManager] ✅ Microphone toggled ON')
                } else {
                    await audioTrack.mute()
                    console.log('[MediaManager] ✅ Microphone toggled OFF')
                }
                this.dispatch(setMicEnabled(newState))
            } catch (error) {
                console.error('[MediaManager] ❌ Error toggling microphone:', error)
                throw error
            }
        }
    }

    /**
     * Set camera enabled/disabled
     * IMPORTANT: mute/unmute are ASYNC operations in Jitsi!
     */
    async setCamera(enabled: boolean): Promise<void> {
        const videoTrack = this.localTracks.find(
            (track) => track.getType() === 'video'
        )
        console.log('[MediaManager] setCamera called with enabled:', enabled)
        console.log('[MediaManager] Video track found:', !!videoTrack)
        if (videoTrack) {
            console.log('[MediaManager] Video track before - isMuted:', videoTrack.isMuted())
            try {
                if (enabled) {
                    await videoTrack.unmute()
                    console.log('[MediaManager] ✅ Video unmuted successfully')
                } else {
                    await videoTrack.mute()
                    console.log('[MediaManager] ✅ Video muted successfully')
                }
                console.log('[MediaManager] Video track after - isMuted:', videoTrack.isMuted())

                // Update Redux state AFTER mute/unmute completes
                this.dispatch(setCameraEnabled(enabled))
            } catch (error) {
                console.error('[MediaManager] ❌ Error toggling camera:', error)
                throw error
            }
        }
    }

    /**
     * Set microphone enabled/disabled
     * IMPORTANT: mute/unmute are ASYNC operations in Jitsi!
     */
    async setMic(enabled: boolean): Promise<void> {
        const audioTrack = this.localTracks.find(
            (track) => track.getType() === 'audio'
        )
        console.log('[MediaManager] setMic called with enabled:', enabled)
        console.log('[MediaManager] Audio track found:', !!audioTrack)
        if (audioTrack) {
            console.log('[MediaManager] Audio track before - isMuted:', audioTrack.isMuted())
            try {
                if (enabled) {
                    await audioTrack.unmute()
                    console.log('[MediaManager] ✅ Audio unmuted successfully')
                } else {
                    await audioTrack.mute()
                    console.log('[MediaManager] ✅ Audio muted successfully')
                }
                console.log('[MediaManager] Audio track after - isMuted:', audioTrack.isMuted())

                // Update Redux state AFTER mute/unmute completes
                this.dispatch(setMicEnabled(enabled))
            } catch (error) {
                console.error('[MediaManager] ❌ Error toggling microphone:', error)
                throw error
            }
        }
    }

    /**
     * Handle remote track được add vào conference
     */
    handleRemoteTrackAdded(track: any): void {
        if (track.isLocal()) return

        const participantId = track.getParticipantId()
        const trackType = track.getType()

        // Store track
        const tracks = this.remoteTracks[participantId] || []
        tracks.push(track)
        this.remoteTracks[participantId] = tracks

        // Dispatch to Redux
        this.dispatch(addRemoteTrack({ participantId, track }))

        // Listen to mute changes
        track.addEventListener(
            JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
            () => {
                // Track mute state changed
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

        // Remove from local storage
        const tracks = this.remoteTracks[participantId] || []
        const filtered = tracks.filter((t) => t.getId() !== trackId)
        if (filtered.length > 0) {
            this.remoteTracks[participantId] = filtered
        } else {
            delete this.remoteTracks[participantId]
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
        return this.remoteTracks[participantId] || []
    }

    /**
     * Cleanup all remote tracks
     */
    clearAllRemoteTracks(): void {
        // Remove all audio level handlers
        this.audioLevelHandlers.clear()

        // Clear remote tracks
        this.remoteTracks = {}
        this.dispatch(clearRemoteTracks())
    }

    /**
     * Get available devices
     */
    getAvailableDevices(): MediaDeviceInfo[] {
        return this.availableDevices
    }

    /**
     * Get devices grouped by kind
     */
    getDevicesByKind() {
        return groupDevicesByKind(this.availableDevices)
    }

    /**
     * Check if a specific device is available
     */
    isDeviceAvailable(deviceId: string, kind: MediaDeviceKind): boolean {
        return isDeviceAvailable(deviceId, kind, this.availableDevices)
    }

    /**
     * Switch to a specific camera device
     */
    async switchCamera(deviceId: string): Promise<void> {
        if (!this.isDeviceAvailable(deviceId, 'videoinput')) {
            throw new Error('Camera device not available')
        }

        const videoTrack = this.localTracks.find(t => t.getType() === 'video')
        const wasEnabled = videoTrack && !videoTrack.isMuted()

        // Dispose current video track
        if (videoTrack) {
            try {
                videoTrack.dispose()
                this.localTracks = this.localTracks.filter(t => t !== videoTrack)
            } catch (error) {
                console.error('[MediaManager] Error disposing video track:', error)
            }
        }

        // Create new video track with specific device
        try {
            const newTracks = await JitsiMeetJS.createLocalTracks({
                devices: ['video'],
                cameraDeviceId: deviceId,
                constraints: {
                    video: {
                        deviceId: { exact: deviceId },
                        width: { ideal: 1280, max: 1920 },
                        height: { ideal: 720, max: 1080 },
                        frameRate: { ideal: 30 },
                    }
                }
            })

            if (newTracks.length > 0) {
                this.localTracks.push(newTracks[0])
                this.dispatch(setLocalTracks(this.localTracks))

                // Restore mute state
                if (!wasEnabled) {
                    newTracks[0].mute()
                }
            }
        } catch (error) {
            console.error('[MediaManager] Error switching camera:', error)
            throw error
        }
    }

    /**
     * Switch to a specific microphone device
     */
    async switchMicrophone(deviceId: string): Promise<void> {
        if (!this.isDeviceAvailable(deviceId, 'audioinput')) {
            throw new Error('Microphone device not available')
        }

        const audioTrack = this.localTracks.find(t => t.getType() === 'audio')
        const wasEnabled = audioTrack && !audioTrack.isMuted()

        // Dispose current audio track
        if (audioTrack) {
            try {
                audioTrack.dispose()
                this.localTracks = this.localTracks.filter(t => t !== audioTrack)
            } catch (error) {
                console.error('[MediaManager] Error disposing audio track:', error)
            }
        }

        // Create new audio track with specific device
        try {
            const newTracks = await JitsiMeetJS.createLocalTracks({
                devices: ['audio'],
                micDeviceId: deviceId,
                constraints: {
                    audio: {
                        deviceId: { exact: deviceId },
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    }
                }
            })

            if (newTracks.length > 0) {
                this.localTracks.push(newTracks[0])
                this.dispatch(setLocalTracks(this.localTracks))

                // Restore mute state
                if (!wasEnabled) {
                    newTracks[0].mute()
                }
            }
        } catch (error) {
            console.error('[MediaManager] Error switching microphone:', error)
            throw error
        }
    }

    /**
     * Complete cleanup with device listener removal
     */
    async cleanup(): Promise<void> {
        // Remove device change listener
        if (this.deviceChangeListener && typeof navigator !== 'undefined') {
            navigator.mediaDevices?.removeEventListener(
                'devicechange',
                this.deviceChangeListener
            )
            this.deviceChangeListener = null
        }

        await this.disposeLocalTracks()
        this.clearAllRemoteTracks()
    }
}
