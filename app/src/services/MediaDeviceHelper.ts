/**
 * MediaDeviceHelper - Inspired by Jitsi's mediaDeviceHelper.js
 * 
 * Xử lý device changes, switching, và fallback logic
 * Tham khảo: jitsi-meet/modules/devices/mediaDeviceHelper.js
 */

import { AppDispatch } from '@/store'
import {
    setPreferredCameraDeviceId,
    setPreferredMicDeviceId,
    setPreferredAudioOutputDeviceId
} from '@/store/slices/settingsSlice'


/* eslint-disable @typescript-eslint/no-explicit-any */
export interface MediaDeviceChange {
    audioinput?: string
    videoinput?: string
    audiooutput?: string
}

export interface DeviceLabelsChange {
    hasNewLabels: boolean
    deviceCount: number
}

/**
 * So sánh 2 danh sách devices xem có chỉ khác nhau về labels không
 * (Firefox permission flow - user chọn device sau khi grant permission)
 */
export function checkIfOnlyLabelsChanged(
    oldDevices: MediaDeviceInfo[],
    newDevices: MediaDeviceInfo[]
): boolean {
    if (oldDevices.length !== newDevices.length) {
        return false
    }

    // Kiểm tra mọi device có cùng deviceId không
    for (const oldDevice of oldDevices) {
        // Nếu old device đã có label, không phải trường hợp này
        if (oldDevice.label !== '') {
            return false
        }

        const newDevice = newDevices.find(d => d.deviceId === oldDevice.deviceId)

        // Nếu không tìm thấy device tương ứng hoặc new device vẫn chưa có label
        if (!newDevice || newDevice.label === '') {
            return false
        }
    }

    return true
}

/**
 * Xác định audio output device mới sau khi device list thay đổi
 */
export function getNewAudioOutputDevice(
    newDevices: MediaDeviceInfo[],
    currentOutputDeviceId: string | null,
    preferredOutputDeviceId: string | null
): string | undefined {
    const availableOutputs = newDevices.filter(d => d.kind === 'audiooutput')

    // Nếu không còn device hiện tại, switch về default
    if (currentOutputDeviceId !== 'default' && currentOutputDeviceId) {
        const currentExists = availableOutputs.find(
            d => d.deviceId === currentOutputDeviceId
        )
        if (!currentExists) {
            return 'default'
        }
    }

    // Nếu có preferred device và nó khác current và có trong danh sách mới
    // => Device vừa được cắm vào, switch sang nó
    if (
        preferredOutputDeviceId &&
        preferredOutputDeviceId !== currentOutputDeviceId &&
        availableOutputs.find(d => d.deviceId === preferredOutputDeviceId)
    ) {
        return preferredOutputDeviceId
    }

    return undefined
}

/**
 * Xác định audio input device mới sau khi device list thay đổi
 */
export function getNewAudioInputDevice(
    newDevices: MediaDeviceInfo[],
    currentTrack: any | null, // JitsiLocalTrack hoặc MediaStreamTrack
    preferredMicDeviceId: string | null,
    onlyLabelsChanged: boolean,
    dispatch: AppDispatch
): string | undefined {
    const availableInputs = newDevices.filter(d => d.kind === 'audioinput')

    const currentDeviceId = currentTrack?.getDeviceId?.() ||
        currentTrack?.getSettings?.()?.deviceId

    const currentDevice = availableInputs.find(d => d.deviceId === currentDeviceId)

    // Case 1: Không có track hoặc track đã disposed/ended
    if (!currentTrack || currentTrack.disposed || currentTrack.isEnded?.() ||
        currentTrack.readyState === 'ended') {

        // Nếu có preferred device, dùng nó
        if (preferredMicDeviceId) {
            const preferredDevice = availableInputs.find(
                d => d.deviceId === preferredMicDeviceId
            )
            if (preferredDevice) {
                return preferredMicDeviceId
            }
        }

        // Không thì dùng device đầu tiên có label (đã được grant permission)
        if (availableInputs.length > 0 && availableInputs[0].label !== '') {
            return availableInputs[0].deviceId
        }
    }

    // Case 2: Có track đang hoạt động và có preferred device khác current
    else if (preferredMicDeviceId && preferredMicDeviceId !== currentDeviceId) {
        const preferredDevice = availableInputs.find(
            d => d.deviceId === preferredMicDeviceId
        )

        if (onlyLabelsChanged) {
            // Firefox flow: User vừa chọn device trong permission dialog
            // Update preference để match với device user đã chọn
            dispatch(setPreferredMicDeviceId({
                deviceId: currentDeviceId || '',
                deviceLabel: currentDevice?.label || ''
            }))
        } else if (preferredDevice) {
            // Preferred device vừa được cắm vào, switch sang nó
            return preferredMicDeviceId
        }
    }

    return undefined
}

/**
 * Xác định video input device mới sau khi device list thay đổi
 */
export function getNewVideoInputDevice(
    newDevices: MediaDeviceInfo[],
    currentTrack: any | null,
    preferredCameraDeviceId: string | null,
    onlyLabelsChanged: boolean,
    dispatch: AppDispatch
): string | undefined {
    const availableInputs = newDevices.filter(d => d.kind === 'videoinput')

    const currentDeviceId = currentTrack?.getDeviceId?.() ||
        currentTrack?.getSettings?.()?.deviceId

    const currentDevice = availableInputs.find(d => d.deviceId === currentDeviceId)

    // Case 1: Không có track hoặc track đã disposed/ended
    if (!currentTrack || currentTrack.disposed || currentTrack.isEnded?.() ||
        currentTrack.readyState === 'ended') {

        if (preferredCameraDeviceId) {
            const preferredDevice = availableInputs.find(
                d => d.deviceId === preferredCameraDeviceId
            )
            if (preferredDevice) {
                return preferredCameraDeviceId
            }
        }

        if (availableInputs.length > 0 && availableInputs[0].label !== '') {
            return availableInputs[0].deviceId
        }
    }

    // Case 2: Có track đang hoạt động và có preferred device khác current
    else if (preferredCameraDeviceId && preferredCameraDeviceId !== currentDeviceId) {
        const preferredDevice = availableInputs.find(
            d => d.deviceId === preferredCameraDeviceId
        )

        if (onlyLabelsChanged) {
            // Firefox flow
            dispatch(setPreferredCameraDeviceId({
                deviceId: currentDeviceId || '',
                deviceLabel: currentDevice?.label || ''
            }))
        } else if (preferredDevice) {
            return preferredCameraDeviceId
        }
    }

    return undefined
}

/**
 * Tổng hợp tất cả device changes cần thực hiện
 */
export function getMediaDeviceChanges(
    newDevices: MediaDeviceInfo[],
    oldDevices: MediaDeviceInfo[],
    currentAudioTrack: any | null,
    currentVideoTrack: any | null,
    currentOutputDeviceId: string | null,
    preferences: {
        micDeviceId: string | null
        cameraDeviceId: string | null
        audioOutputDeviceId: string | null
    },
    dispatch: AppDispatch
): MediaDeviceChange {
    const onlyLabelsChanged = checkIfOnlyLabelsChanged(oldDevices, newDevices)

    return {
        audioinput: getNewAudioInputDevice(
            newDevices,
            currentAudioTrack,
            preferences.micDeviceId,
            onlyLabelsChanged,
            dispatch
        ),
        videoinput: getNewVideoInputDevice(
            newDevices,
            currentVideoTrack,
            preferences.cameraDeviceId,
            onlyLabelsChanged,
            dispatch
        ),
        audiooutput: getNewAudioOutputDevice(
            newDevices,
            currentOutputDeviceId,
            preferences.audioOutputDeviceId
        )
    }
}

/**
 * Tạo local tracks với graceful fallback
 * Inspired by Jitsi's createLocalTracksAfterDeviceListChanged
 */

export async function createTracksWithFallback(
    createLocalTracks: (options: any) => Promise<any[]>,
    cameraDeviceId?: string,
    micDeviceId?: string
): Promise<{
    tracks: any[]
    audioError?: Error
    videoError?: Error
}> {
    let audioError: Error | undefined
    let videoError: Error | undefined

    // If no specific device requested, request default devices
    // micDeviceId === undefined means request default audio
    // cameraDeviceId === undefined means request default video
    const audioRequested = micDeviceId !== null
    const videoRequested = cameraDeviceId !== null

    console.log('[MediaDeviceHelper] createTracksWithFallback:', {
        cameraDeviceId,
        micDeviceId,
        audioRequested,
        videoRequested
    })

    // Helper để tạo audio track
    const createAudioTrack = async (showError = true): Promise<any[]> => {
        try {
            console.log('[MediaDeviceHelper] Creating audio track with deviceId:', micDeviceId)
            const result = await createLocalTracks({
                devices: ['audio'],
                cameraDeviceId: null,
                micDeviceId
            })
            console.log('[MediaDeviceHelper] Audio track created successfully:', result.length)
            return result
        } catch (err) {
            console.error('[MediaDeviceHelper] Audio track creation failed:', err)
            audioError = err as Error
            if (!showError) {
                return []
            }
            throw err
        }
    }

    // Helper để tạo video track
    const createVideoTrack = async (showError = true): Promise<any[]> => {
        try {
            console.log('[MediaDeviceHelper] Creating video track with deviceId:', cameraDeviceId)
            const result = await createLocalTracks({
                devices: ['video'],
                cameraDeviceId,
                micDeviceId: null
            })
            console.log('[MediaDeviceHelper] Video track created successfully:', result.length)
            return result
        } catch (err) {
            console.error('[MediaDeviceHelper] Video track creation failed:', err)
            videoError = err as Error
            if (!showError) {
                return []
            }
            throw err
        }
    }

    // Case 1: Cần cả audio và video
    if (audioRequested && videoRequested) {
        try {
            // Thử tạo cùng lúc
            console.log('[MediaDeviceHelper] Creating both audio and video tracks...')
            const tracks = await createLocalTracks({
                devices: ['audio', 'video'],
                cameraDeviceId,
                micDeviceId
            })
            console.log('[MediaDeviceHelper] Successfully created', tracks.length, 'tracks')
            return { tracks }
        } catch (error) {
            console.error('[MediaDeviceHelper] Failed to create both tracks together:', error)
            // Nếu fail, thử tạo riêng lẻ
            console.log('[MediaDeviceHelper] Attempting to create tracks separately...')
            const [audioTracks, videoTracks] = await Promise.all([
                createAudioTrack(false),
                createVideoTrack(false)
            ])

            const allTracks = [
                ...(Array.isArray(audioTracks) ? audioTracks : [audioTracks]),
                ...(Array.isArray(videoTracks) ? videoTracks : [videoTracks])
            ].filter(t => t !== undefined)

            return { tracks: allTracks, audioError, videoError }
        }
    }

    // Case 2: Chỉ cần video
    else if (videoRequested && !audioRequested) {
        try {
            const tracks = await createVideoTrack()
            return { tracks }
        } catch (err) {
            return { tracks: [], videoError: err as Error }
        }
    }

    // Case 3: Chỉ cần audio
    else if (audioRequested && !videoRequested) {
        try {
            const tracks = await createAudioTrack()
            return { tracks }
        } catch (err) {
            return { tracks: [], audioError: err as Error }
        }
    }

    // Case 4: No tracks requested (both are null)
    console.warn('[MediaDeviceHelper] No tracks requested - both audio and video are disabled/null')
    return {
        tracks: [],
        audioError: new Error('Audio track not requested (disabled or null)'),
        videoError: new Error('Video track not requested (disabled or null)')
    }
}

/**
 * Kiểm tra xem device có còn available không
 */
export function isDeviceAvailable(
    deviceId: string,
    kind: MediaDeviceKind,
    availableDevices: MediaDeviceInfo[]
): boolean {
    return availableDevices.some(
        d => d.deviceId === deviceId && d.kind === kind
    )
}

/**
 * Lấy device info từ deviceId
 */
export function getDeviceInfo(
    deviceId: string,
    availableDevices: MediaDeviceInfo[]
): MediaDeviceInfo | undefined {
    return availableDevices.find(d => d.deviceId === deviceId)
}

/**
 * Flatten device list theo kind
 */
export function groupDevicesByKind(devices: MediaDeviceInfo[]): {
    audioinput: MediaDeviceInfo[]
    videoinput: MediaDeviceInfo[]
    audiooutput: MediaDeviceInfo[]
} {
    return {
        audioinput: devices.filter(d => d.kind === 'audioinput'),
        videoinput: devices.filter(d => d.kind === 'videoinput'),
        audiooutput: devices.filter(d => d.kind === 'audiooutput')
    }
}
