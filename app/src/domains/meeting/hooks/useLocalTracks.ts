/**
 * useLocalTracks Hook
 *
 * Controls mic/cam via trackService + deviceService.
 * Exposes mute/unmute and enable/disableCamera functions.
 * Properly manages device access - only requests when entering meeting,
 * releases when leaving.
 *
 * @see JitsiAPI/3-JitsiMediaDevices for device enumeration
 * @see JitsiAPI/6-JitsiTrack for track lifecycle
 */

'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { deviceService } from '../services/meeting-runtime/deviceService'
import { trackService } from '../services/meeting-runtime/trackService'
import { meetingService } from '../services/meeting-runtime/meetingService'
import {
    setLocalAudioTrack,
    setLocalVideoTrack,
    updateLocalAudioMuted,
    updateLocalVideoMuted,
    setAudioInputDevices,
    setVideoInputDevices,
    setAudioOutputDevices,
    setAudioPermission,
    setVideoPermission,
    setCreatingAudioTrack,
    setCreatingVideoTrack,
    setSelectedAudioInput,
    setSelectedVideoInput,
} from '../store/trackStore'
import { updateParticipant } from '../store/meetingStore'

interface UseLocalTracksOptions {
    autoEnableAudio?: boolean
    autoEnableVideo?: boolean
}

export function useLocalTracks(options: UseLocalTracksOptions = {}) {
    const dispatch = useAppDispatch()
    const trackState = useAppSelector((state) => state.tracks)
    const meetingState = useAppSelector((state) => state.meeting)

    // Track refs to hold actual SDK track objects
    const audioTrackRef = useRef<any>(null)
    const videoTrackRef = useRef<any>(null)

    // Track whether tracks are successfully added to conference
    const audioTrackInConference = useRef<boolean>(false)
    const videoTrackInConference = useRef<boolean>(false)

    // Local state for immediate UI feedback
    const [isAudioEnabled, setIsAudioEnabled] = useState(false)
    const [isVideoEnabled, setIsVideoEnabled] = useState(false)

    /**
     * Refreshes the list of available devices
     */
    const refreshDevices = useCallback(async () => {
        const devices = await deviceService.enumerateDevices()
        dispatch(setAudioInputDevices(devices.audioInput))
        dispatch(setAudioOutputDevices(devices.audioOutput))
        dispatch(setVideoInputDevices(devices.videoInput))

        // Check permissions
        const audioGranted = await deviceService.isAudioPermissionGranted()
        const videoGranted = await deviceService.isVideoPermissionGranted()
        dispatch(setAudioPermission(audioGranted))
        dispatch(setVideoPermission(videoGranted))
    }, [dispatch])

    /**
     * Creates and enables the audio track
     */
    const enableAudio = useCallback(
        async (deviceId?: string) => {
            // Check if we already have a valid audio track
            if (audioTrackRef.current) {
                const track = audioTrackRef.current
                // Verify track is not disposed
                if (track && typeof track.isEnded === 'function' && !track.isEnded()) {
                    console.log('[useLocalTracks] Audio track already exists, skipping creation')
                    return
                }
            }

            dispatch(setCreatingAudioTrack(true))

            try {
                const track = await deviceService.createAudioTrack(deviceId)
                if (!track) {
                    throw new Error('Failed to create audio track')
                }

                audioTrackRef.current = track
                const trackInfo = trackService.extractLocalTrackInfo(track)
                dispatch(setLocalAudioTrack(trackInfo))
                dispatch(setSelectedAudioInput(trackInfo.deviceId))
                setIsAudioEnabled(true)

                // Add to conference if joined
                if (meetingState.conferenceStatus === 'joined') {
                    try {
                        await meetingService.addTrack(track)
                        audioTrackInConference.current = true
                    } catch (error) {
                        console.error('[useLocalTracks] Failed to add audio track to conference:', error)
                        audioTrackInConference.current = false
                        // Track is still available locally even if not in conference
                    }
                }

                // Update local participant
                if (meetingState.localParticipantId) {
                    dispatch(
                        updateParticipant({
                            id: meetingState.localParticipantId,
                            updates: { isAudioMuted: false },
                        })
                    )
                }

                dispatch(setAudioPermission(true))
            } catch (error) {
                console.error('Failed to enable audio:', error)
                setIsAudioEnabled(false)
            } finally {
                dispatch(setCreatingAudioTrack(false))
            }
        },
        [dispatch, meetingState.conferenceStatus, meetingState.localParticipantId]
    )

    /**
     * Disables and releases the audio track
     */
    const disableAudio = useCallback(async () => {
        if (!audioTrackRef.current) return

        try {
            const track = audioTrackRef.current

            // Remove from conference first (only if it was successfully added)
            if (meetingState.conferenceStatus === 'joined' && audioTrackInConference.current) {
                try {
                    await meetingService.removeTrack(track)
                    audioTrackInConference.current = false
                } catch (error) {
                    console.error('[useLocalTracks] Failed to remove audio track from conference:', error)
                    audioTrackInConference.current = false
                    // Continue with local cleanup even if conference removal fails
                }
            }

            // Release the track
            await deviceService.releaseTrack(track)
            audioTrackRef.current = null
            dispatch(setLocalAudioTrack(null))
            setIsAudioEnabled(false)

            // Update local participant
            if (meetingState.localParticipantId) {
                dispatch(
                    updateParticipant({
                        id: meetingState.localParticipantId,
                        updates: { isAudioMuted: true },
                    })
                )
            }
        } catch (error) {
            console.error('Failed to disable audio:', error)
        }
    }, [dispatch, meetingState.conferenceStatus, meetingState.localParticipantId])

    /**
     * Toggles audio on/off
     */
    const toggleAudio = useCallback(async () => {
        // Use track ref to determine current state, not local state
        // This prevents stale state issues when toggles happen rapidly
        const hasActiveTrack = audioTrackRef.current &&
            typeof audioTrackRef.current.isEnded === 'function' &&
            !audioTrackRef.current.isEnded()

        if (hasActiveTrack) {
            await disableAudio()
        } else {
            await enableAudio()
        }
    }, [enableAudio, disableAudio])

    /**
     * Mutes the audio track without releasing it
     */
    const muteAudio = useCallback(async () => {
        if (!audioTrackRef.current) return

        await trackService.muteTrack(audioTrackRef.current)
        dispatch(updateLocalAudioMuted(true))

        if (meetingState.localParticipantId) {
            dispatch(
                updateParticipant({
                    id: meetingState.localParticipantId,
                    updates: { isAudioMuted: true },
                })
            )
        }
    }, [dispatch, meetingState.localParticipantId])

    /**
     * Unmutes the audio track
     */
    const unmuteAudio = useCallback(async () => {
        if (!audioTrackRef.current) return

        await trackService.unmuteTrack(audioTrackRef.current)
        dispatch(updateLocalAudioMuted(false))

        if (meetingState.localParticipantId) {
            dispatch(
                updateParticipant({
                    id: meetingState.localParticipantId,
                    updates: { isAudioMuted: false },
                })
            )
        }
    }, [dispatch, meetingState.localParticipantId])

    /**
     * Creates and enables the video track
     */
    const enableVideo = useCallback(
        async (deviceId?: string) => {
            // Check if we already have a valid video track
            if (videoTrackRef.current) {
                const track = videoTrackRef.current
                // Verify track is not disposed
                if (track && typeof track.isEnded === 'function' && !track.isEnded()) {
                    console.log('[useLocalTracks] Video track already exists, skipping creation')
                    return
                }
            }

            dispatch(setCreatingVideoTrack(true))

            try {
                const track = await deviceService.createVideoTrack(deviceId)
                if (!track) {
                    throw new Error('Failed to create video track')
                }

                videoTrackRef.current = track
                const trackInfo = trackService.extractLocalTrackInfo(track)
                dispatch(setLocalVideoTrack(trackInfo))
                dispatch(setSelectedVideoInput(trackInfo.deviceId))
                setIsVideoEnabled(true)

                // Add to conference if joined
                if (meetingState.conferenceStatus === 'joined') {
                    try {
                        await meetingService.addTrack(track)
                        videoTrackInConference.current = true
                    } catch (error) {
                        console.error('[useLocalTracks] Failed to add video track to conference:', error)
                        videoTrackInConference.current = false
                        // Track is still available locally even if not in conference
                    }
                }

                // Update local participant
                if (meetingState.localParticipantId) {
                    dispatch(
                        updateParticipant({
                            id: meetingState.localParticipantId,
                            updates: { isVideoMuted: false },
                        })
                    )
                }

                dispatch(setVideoPermission(true))
            } catch (error) {
                console.error('Failed to enable video:', error)
                setIsVideoEnabled(false)
            } finally {
                dispatch(setCreatingVideoTrack(false))
            }
        },
        [dispatch, meetingState.conferenceStatus, meetingState.localParticipantId]
    )

    /**
     * Disables and releases the video track
     */
    const disableVideo = useCallback(async () => {
        if (!videoTrackRef.current) return

        try {
            const track = videoTrackRef.current

            // Remove from conference first (only if it was successfully added)
            if (meetingState.conferenceStatus === 'joined' && videoTrackInConference.current) {
                try {
                    await meetingService.removeTrack(track)
                    videoTrackInConference.current = false
                } catch (error) {
                    console.error('[useLocalTracks] Failed to remove video track from conference:', error)
                    videoTrackInConference.current = false
                    // Continue with local cleanup even if conference removal fails
                }
            }

            // Release the track
            await deviceService.releaseTrack(track)
            videoTrackRef.current = null
            dispatch(setLocalVideoTrack(null))
            setIsVideoEnabled(false)

            // Update local participant
            if (meetingState.localParticipantId) {
                dispatch(
                    updateParticipant({
                        id: meetingState.localParticipantId,
                        updates: { isVideoMuted: true },
                    })
                )
            }
        } catch (error) {
            console.error('Failed to disable video:', error)
        }
    }, [dispatch, meetingState.conferenceStatus, meetingState.localParticipantId])

    /**
     * Toggles video on/off
     */
    const toggleVideo = useCallback(async () => {
        // Use track ref to determine current state, not local state
        // This prevents stale state issues when toggles happen rapidly
        const hasActiveTrack = videoTrackRef.current &&
            typeof videoTrackRef.current.isEnded === 'function' &&
            !videoTrackRef.current.isEnded()

        if (hasActiveTrack) {
            await disableVideo()
        } else {
            await enableVideo()
        }
    }, [enableVideo, disableVideo])

    /**
     * Mutes the video track without releasing it
     */
    const muteVideo = useCallback(async () => {
        if (!videoTrackRef.current) return

        await trackService.muteTrack(videoTrackRef.current)
        dispatch(updateLocalVideoMuted(true))

        if (meetingState.localParticipantId) {
            dispatch(
                updateParticipant({
                    id: meetingState.localParticipantId,
                    updates: { isVideoMuted: true },
                })
            )
        }
    }, [dispatch, meetingState.localParticipantId])

    /**
     * Unmutes the video track
     */
    const unmuteVideo = useCallback(async () => {
        if (!videoTrackRef.current) return

        await trackService.unmuteTrack(videoTrackRef.current)
        dispatch(updateLocalVideoMuted(false))

        if (meetingState.localParticipantId) {
            dispatch(
                updateParticipant({
                    id: meetingState.localParticipantId,
                    updates: { isVideoMuted: false },
                })
            )
        }
    }, [dispatch, meetingState.localParticipantId])

    /**
     * Releases all local tracks
     */
    const releaseAllTracks = useCallback(async () => {
        await disableAudio()
        await disableVideo()
    }, [disableAudio, disableVideo])

    /**
     * Gets the current audio track
     */
    const getAudioTrack = useCallback(() => {
        return audioTrackRef.current
    }, [])

    /**
     * Gets the current video track
     */
    const getVideoTrack = useCallback(() => {
        return videoTrackRef.current
    }, [])

    /**
     * Attaches the local video track to a container
     */
    const attachVideoToElement = useCallback((container: HTMLElement) => {
        if (videoTrackRef.current && container) {
            trackService.attachTrack(videoTrackRef.current, container)
        }
    }, [])

    /**
     * Detaches the local video track from a container
     */
    const detachVideoFromElement = useCallback((container?: HTMLElement) => {
        if (videoTrackRef.current) {
            trackService.detachTrack(videoTrackRef.current, container)
        }
    }, [])

    // Initialize devices on mount
    useEffect(() => {
        refreshDevices()

        // Subscribe to device changes
        let unsubscribe: (() => void) | undefined

        deviceService.onDeviceListChanged(() => {
            refreshDevices()
        }).then((unsub) => {
            unsubscribe = unsub
        })

        return () => {
            unsubscribe?.()
        }
    }, [refreshDevices])

    // Auto-enable tracks when conference is joined (if options specify)
    useEffect(() => {
        if (meetingState.conferenceStatus === 'joined') {
            if (options.autoEnableAudio && !audioTrackRef.current) {
                enableAudio()
            }
            if (options.autoEnableVideo && !videoTrackRef.current) {
                enableVideo()
            }
        }
    }, [
        meetingState.conferenceStatus,
        options.autoEnableAudio,
        options.autoEnableVideo,
        enableAudio,
        enableVideo,
    ])

    // Cleanup on unmount - CRITICAL for releasing device access
    // This ONLY runs when the hook is actually unmounted (meeting page closes)
    // NOT when parent components re-render
    useEffect(() => {
        const cleanup = () => {
            console.log('[useLocalTracks] 🧹 Component unmounting - releasing tracks')
            // Release tracks when component unmounts
            const audioTrack = audioTrackRef.current
            const videoTrack = videoTrackRef.current

            if (audioTrack) {
                console.log('[useLocalTracks] Releasing audio track')
                deviceService.releaseTrack(audioTrack).catch(err => {
                    console.error('[useLocalTracks] Error releasing audio track:', err)
                })
                audioTrackRef.current = null
            }
            if (videoTrack) {
                console.log('[useLocalTracks] Releasing video track')
                deviceService.releaseTrack(videoTrack).catch(err => {
                    console.error('[useLocalTracks] Error releasing video track:', err)
                })
                videoTrackRef.current = null
            }
        }

        // Return cleanup function that will ONLY run on unmount
        return cleanup
    }, [])

    return {
        // Track state
        audioTrack: trackState.localAudioTrack,
        videoTrack: trackState.localVideoTrack,
        isAudioEnabled,
        isVideoEnabled,
        isAudioMuted: trackState.localAudioTrack?.isMuted ?? true,
        isVideoMuted: trackState.localVideoTrack?.isMuted ?? true,

        // Loading states
        isCreatingAudio: trackState.isCreatingAudioTrack,
        isCreatingVideo: trackState.isCreatingVideoTrack,

        // Permissions
        audioPermissionGranted: trackState.audioPermissionGranted,
        videoPermissionGranted: trackState.videoPermissionGranted,

        // Devices
        audioInputDevices: trackState.audioInputDevices,
        videoInputDevices: trackState.videoInputDevices,
        audioOutputDevices: trackState.audioOutputDevices,
        selectedAudioInputId: trackState.selectedAudioInputId,
        selectedVideoInputId: trackState.selectedVideoInputId,

        // Actions
        enableAudio,
        disableAudio,
        toggleAudio,
        muteAudio,
        unmuteAudio,
        enableVideo,
        disableVideo,
        toggleVideo,
        muteVideo,
        unmuteVideo,
        releaseAllTracks,
        refreshDevices,

        // Track accessors
        getAudioTrack,
        getVideoTrack,
        attachVideoToElement,
        detachVideoFromElement,
    }
}
