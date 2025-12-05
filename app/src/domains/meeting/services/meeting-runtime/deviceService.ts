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
 */
async function enumerateDevices(): Promise<{
    audioInput: DeviceInfo[]
    audioOutput: DeviceInfo[]
    videoInput: DeviceInfo[]
}> {
    const JitsiMeetJS = await getJitsiMeetJS()

    return new Promise((resolve) => {
        if (!JitsiMeetJS) {
            // Fallback to native API
            navigator.mediaDevices.enumerateDevices().then((devices) => {
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
            return
        }

        JitsiMeetJS.mediaDevices.enumerateDevices(
            (devices: MediaDeviceInfo[]) => {
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
            }
        )
    })
}

/**
 * Creates local audio and/or video tracks
 */
async function createLocalTracks(options: {
    audio?: boolean | { deviceId?: string }
    video?: boolean | { deviceId?: string; resolution?: number }
}): Promise<any[]> {
    const JitsiMeetJS = await getJitsiMeetJS()
    if (!JitsiMeetJS) {
        throw new Error('JitsiMeetJS not available')
    }

    const devices: string[] = []
    const constraints: any = {}

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
        return []
    }

    const tracks = await JitsiMeetJS.createLocalTracks({
        devices,
        ...constraints,
    })

    // Store tracks for later retrieval
    for (const track of tracks) {
        const trackId = track.getId?.() || `${track.getType()}-${Date.now()}`
        trackStorage.set(trackId, track)
    }

    return tracks
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
 */
async function releaseTrack(track: any): Promise<void> {
    if (!track) return

    try {
        // Stop the track to release hardware access
        if (track.dispose) {
            await track.dispose()
        }

        // Remove from storage
        const trackId = track.getId?.()
        if (trackId) {
            trackStorage.delete(trackId)
        }
    } catch (error) {
        console.error('Failed to release track:', error)
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
