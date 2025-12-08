/**
 * deviceService
 *
 * Adapter for JitsiMediaDevices.
 * Handles device enumeration, getUserMedia wrappers, and release logic.
 * Releases hardware when toggling camera/mic or ending a meeting.
 *
 * @see JitsiAPI/3-JitsiMediaDevices/Class_JitsiMediaDevices.txt for device methods
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getJitsiMeetJS } from './jitsiLoader'
import { DeviceInfo } from '../../types/tracks'

// Track storage - holds actual SDK track objects (not serializable)
const trackStorage = new Map<string, any>()

/**
 * Converts MediaDeviceInfo to our DeviceInfo type
 */
function toDeviceInfo(device: MediaDeviceInfo): DeviceInfo {
    return {
        deviceId: device.deviceId,
        label: device.label || `Device ${device.deviceId.slice(0, 8)}`,
        kind: device.kind as DeviceInfo['kind'],
        groupId: device.groupId,
    }
}

/**
 * Enumerates all available media devices
 * 
 * @see JitsiAPI/3-JitsiMediaDevices/Class_JitsiMediaDevices.txt (method: enumerateDevices)
 */
async function enumerateDevices(): Promise<{
    audioInput: DeviceInfo[]
    audioOutput: DeviceInfo[]
    videoInput: DeviceInfo[]
}> {
    const JitsiMeetJS = await getJitsiMeetJS()

    return new Promise((resolve, reject) => {
        if (!JitsiMeetJS) {
            // Fallback to native API if Jitsi not available
            navigator.mediaDevices.enumerateDevices()
                .then((devices) => {
                    resolve({
                        audioInput: devices
                            .filter((d) => d.kind === 'audioinput')
                            .map(toDeviceInfo),
                        audioOutput: devices
                            .filter((d) => d.kind === 'audiooutput')
                            .map(toDeviceInfo),
                        videoInput: devices
                            .filter((d) => d.kind === 'videoinput')
                            .map(toDeviceInfo),
                    })
                })
                .catch(reject)
            return
        }

        try {
            // Use Jitsi's enumerateDevices with callback
            JitsiMeetJS.mediaDevices.enumerateDevices(
                (devices: MediaDeviceInfo[]) => {
                    try {
                        resolve({
                            audioInput: devices
                                .filter((d) => d.kind === 'audioinput')
                                .map(toDeviceInfo),
                            audioOutput: devices
                                .filter((d) => d.kind === 'audiooutput')
                                .map(toDeviceInfo),
                            videoInput: devices
                                .filter((d) => d.kind === 'videoinput')
                                .map(toDeviceInfo),
                        })
                    } catch (error) {
                        console.error('[deviceService] Error processing device list:', error)
                        reject(error)
                    }
                }
            )
        } catch (error) {
            console.error('[deviceService] Error calling enumerateDevices:', error)
            reject(error)
        }
    })
}

/**
 * Creates local audio and/or video tracks
 * 
 * @see JitsiAPI/4-JitsiMeetJS/Variable_JitsiMeetJS.txt (method: createLocalTracks)
 */
async function createLocalTracks(options: {
    audio?: boolean | { deviceId?: string }
    video?: boolean | { deviceId?: string; resolution?: number }
}): Promise<any[]> {
    const JitsiMeetJS = await getJitsiMeetJS()
    if (!JitsiMeetJS) {
        throw new Error('JitsiMeetJS not available - cannot create local tracks')
    }

    const devices: string[] = []
    const constraints: any = {}

    // Build device list and constraints per Jitsi API
    if (options.audio) {
        devices.push('audio')
        if (typeof options.audio === 'object' && options.audio.deviceId) {
            constraints.micDeviceId = options.audio.deviceId
        }
    }

    if (options.video) {
        devices.push('video')
        if (typeof options.video === 'object') {
            if (options.video.deviceId) {
                constraints.cameraDeviceId = options.video.deviceId
            }
            if (options.video.resolution) {
                constraints.resolution = options.video.resolution
            }
        }
    }

    if (devices.length === 0) {
        console.warn('[deviceService] No devices requested for track creation')
        return []
    }

    try {
        console.log('[deviceService] Creating local tracks:', { devices, constraints })

        const tracks = await JitsiMeetJS.createLocalTracks({
            devices,
            ...constraints,
        })

        if (!Array.isArray(tracks)) {
            console.error('[deviceService] createLocalTracks did not return array')
            return []
        }

        // Validate and store only valid JitsiLocalTrack objects
        const validTracks = []
        for (const track of tracks) {
            try {
                // Validate track has required methods per JitsiLocalTrack API
                if (track &&
                    typeof track.getId === 'function' &&
                    typeof track.getType === 'function' &&
                    typeof track.attach === 'function' &&
                    typeof track.dispose === 'function') {

                    const trackId = track.getId()
                    const trackType = track.getType()

                    if (!trackId || !trackType) {
                        console.warn('[deviceService] Track missing id or type, skipping')
                        continue
                    }

                    trackStorage.set(trackId, track)
                    validTracks.push(track)
                    console.log('[deviceService] Valid track created:', trackType, trackId)
                } else {
                    console.warn('[deviceService] Invalid track object - missing required methods')
                }
            } catch (error) {
                console.warn('[deviceService] Error validating track:', error)
            }
        }

        console.log('[deviceService] Created', validTracks.length, 'valid tracks')
        return validTracks
    } catch (error: any) {
        console.error('[deviceService] Failed to create local tracks:', error)
        // Provide more context about the error
        const errorMessage = error?.message || error?.name || 'Unknown error'
        throw new Error(`Failed to create local tracks: ${errorMessage}`)
    }
}

/**
 * Creates a local audio track
 */
async function createAudioTrack(deviceId?: string): Promise<any | null> {
    try {
        const tracks = await createLocalTracks({
            audio: deviceId ? { deviceId } : true,
        })
        return tracks.find((t: any) => t.getType() === 'audio') || null
    } catch (error) {
        console.error('Failed to create audio track:', error)
        throw error
    }
}

/**
 * Creates a local video track
 */
async function createVideoTrack(
    deviceId?: string,
    resolution?: number
): Promise<any | null> {
    try {
        const tracks = await createLocalTracks({
            video: { deviceId, resolution: resolution || 720 },
        })
        return tracks.find((t: any) => t.getType() === 'video') || null
    } catch (error) {
        console.error('Failed to create video track:', error)
        throw error
    }
}

/**
 * Releases (disposes) a local track and stops the hardware
 * 
 * @see JitsiAPI/1-JitsiConference/Class_JitsiLocalTrack.txt (method: dispose)
 * 
 * Critical: Must properly dispose tracks to release camera/microphone access
 */
async function releaseTrack(track: any): Promise<void> {
    if (!track) {
        console.warn('[deviceService] Cannot release: track is null')
        return
    }

    const trackId = track.getId?.()
    const trackType = track.getType?.()

    console.log('[deviceService] 🗑️ Releasing track:', { trackId, trackType })

    try {
        // Validate track has required methods before attempting disposal
        if (typeof track.dispose === 'function') {
            // dispose() is the proper way to stop JitsiLocalTrack
            await track.dispose()
            console.log('[deviceService] ✅ Track disposed:', trackType)
        } else if (typeof track.stop === 'function') {
            // Fallback to stop() if dispose is not available
            track.stop()
            console.log('[deviceService] ✅ Track stopped (fallback):', trackType)
        } else {
            console.warn('[deviceService] Track has no dispose or stop method')
        }

        // Remove from storage
        if (trackId) {
            trackStorage.delete(trackId)
        }
    } catch (error) {
        console.error('[deviceService] ❌ Failed to release track:', error)
        // Don't rethrow - continue cleanup even if disposal fails
        // Attempt to remove from storage anyway
        try {
            const trackId = track?.getId?.()
            if (trackId) {
                trackStorage.delete(trackId)
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

/**
 * Releases all stored tracks
 */
async function releaseAllTracks(): Promise<void> {
    const tracks = Array.from(trackStorage.values())
    await Promise.all(tracks.map(releaseTrack))
    trackStorage.clear()
}

/**
 * Gets a stored track by ID
 */
function getTrack(trackId: string): any | null {
    return trackStorage.get(trackId) || null
}

/**
 * Stores a track reference
 */
function storeTrack(trackId: string, track: any): void {
    trackStorage.set(trackId, track)
}

/**
 * Removes a track from storage without disposing
 */
function unstoreTrack(trackId: string): void {
    trackStorage.delete(trackId)
}

/**
 * Checks if audio permission is granted
 */
async function isAudioPermissionGranted(): Promise<boolean> {
    const JitsiMeetJS = await getJitsiMeetJS()
    if (JitsiMeetJS?.mediaDevices?.isDevicePermissionGranted) {
        return JitsiMeetJS.mediaDevices.isDevicePermissionGranted('audio')
    }
    // Fallback check
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioDevices = devices.filter((d) => d.kind === 'audioinput')
        return audioDevices.some((d) => d.label !== '')
    } catch {
        return false
    }
}

/**
 * Checks if video permission is granted
 */
async function isVideoPermissionGranted(): Promise<boolean> {
    const JitsiMeetJS = await getJitsiMeetJS()
    if (JitsiMeetJS?.mediaDevices?.isDevicePermissionGranted) {
        return JitsiMeetJS.mediaDevices.isDevicePermissionGranted('video')
    }
    // Fallback check
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((d) => d.kind === 'videoinput')
        return videoDevices.some((d) => d.label !== '')
    } catch {
        return false
    }
}

/**
 * Sets the audio output device
 */
async function setAudioOutputDevice(deviceId: string): Promise<void> {
    const JitsiMeetJS = await getJitsiMeetJS()
    if (JitsiMeetJS?.mediaDevices?.setAudioOutputDevice) {
        JitsiMeetJS.mediaDevices.setAudioOutputDevice(deviceId)
    }
}

/**
 * Subscribes to device change events
 */
async function onDeviceListChanged(callback: () => void): Promise<() => void> {
    const JitsiMeetJS = await getJitsiMeetJS()
    const deviceEvents = JitsiMeetJS?.events?.mediaDevices

    if (JitsiMeetJS && deviceEvents) {
        JitsiMeetJS.mediaDevices.addEventListener(
            deviceEvents.DEVICE_LIST_CHANGED,
            callback
        )
        return () => {
            JitsiMeetJS.mediaDevices.removeEventListener(
                deviceEvents.DEVICE_LIST_CHANGED,
                callback
            )
        }
    }

    // Fallback to native API
    const handler = () => callback()
    navigator.mediaDevices.addEventListener('devicechange', handler)
    return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handler)
    }
}

export const deviceService = {
    enumerateDevices,
    createLocalTracks,
    createAudioTrack,
    createVideoTrack,
    releaseTrack,
    releaseAllTracks,
    getTrack,
    storeTrack,
    unstoreTrack,
    isAudioPermissionGranted,
    isVideoPermissionGranted,
    setAudioOutputDevice,
    onDeviceListChanged,
}
