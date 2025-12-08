'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Loader } from 'lucide-react'
import { VideoPlaceholder } from './video-tile/VideoPlaceholder'
import { StatusIndicators } from './video-tile/StatusIndicators'
import { trackService } from '@/domains/meeting/services'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface RemoteVideoProps {
    name: string
    isAudioMuted?: boolean
    isVideoMuted?: boolean
    videoTrack?: any // JitsiRemoteTrack
    audioTrack?: any // JitsiRemoteTrack
    imageUrl?: string
    isDominantSpeaker?: boolean
}

export function RemoteVideo({
    name,
    isAudioMuted = true,
    isVideoMuted = true,
    videoTrack,
    audioTrack,
    imageUrl,
    isDominantSpeaker = false,
}: RemoteVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [hasVideoStream, setHasVideoStream] = useState(false)

    // Attach video track to the video element
    useEffect(() => {
        const videoElement = videoRef.current
        if (!videoElement) {
            console.log('[RemoteVideo] No video element ref for:', name)
            return
        }

        console.log('[RemoteVideo] 📹 Video track effect triggered:', {
            participant: name,
            hasVideoTrack: !!videoTrack,
            isVideoMuted,
            trackId: videoTrack?.getId?.(),
            trackType: videoTrack?.getType?.(),
        })

        if (videoTrack && !isVideoMuted) {
            setIsLoading(true)
            setHasError(false)

            try {
                // Get the MediaStream from the track
                const stream = trackService.getMediaStream(videoTrack)
                if (stream) {
                    console.log('[RemoteVideo] ✅ Got video stream:', {
                        participant: name,
                        streamId: stream.id,
                        trackCount: stream.getTracks().length,
                        videoTracks: stream.getVideoTracks().length,
                    })
                    videoElement.srcObject = stream
                    videoElement
                        .play()
                        .then(() => {
                            console.log('[RemoteVideo] ▶️ Video playing:', name)
                            setHasVideoStream(true)
                            setIsLoading(false)
                        })
                        .catch((err) => {
                            // AbortError is expected when track changes rapidly
                            if (err.name === 'AbortError') {
                                console.log(
                                    '[RemoteVideo] ⚠️ Video play aborted (expected):',
                                    name
                                )
                                return
                            }
                            console.error(
                                '[RemoteVideo] ❌ Failed to play remote video:',
                                name,
                                err
                            )
                            setHasError(true)
                            setIsLoading(false)
                        })
                } else {
                    console.log(
                        '[RemoteVideo] Using Jitsi attach fallback for:',
                        name
                    )
                    // Fallback to Jitsi attach method
                    trackService.attachTrack(videoTrack, videoElement)
                    setHasVideoStream(true)
                    setIsLoading(false)
                }
            } catch (error) {
                console.error('Failed to attach remote video track:', error)
                setHasError(true)
                setIsLoading(false)
            }
        } else {
            // No video track or muted - clear the video
            videoElement.srcObject = null
            setHasVideoStream(false)
            setIsLoading(false)
        }

        return () => {
            if (videoTrack && videoElement) {
                console.log(
                    '[RemoteVideo] 🧹 Cleaning up video track for:',
                    name
                )
                videoElement.srcObject = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoTrack, isVideoMuted])

    // Attach audio track to the audio element
    useEffect(() => {
        const audioElement = audioRef.current
        if (!audioElement) {
            console.log('[RemoteVideo] No audio element ref for:', name)
            return
        }

        console.log('[RemoteVideo] 🔊 Audio track effect triggered:', {
            participant: name,
            hasAudioTrack: !!audioTrack,
            isAudioMuted,
            trackId: audioTrack?.getId?.(),
        })

        if (audioTrack && !isAudioMuted) {
            try {
                const stream = trackService.getMediaStream(audioTrack)
                if (stream) {
                    console.log('[RemoteVideo] ✅ Got audio stream:', {
                        participant: name,
                        streamId: stream.id,
                        audioTracks: stream.getAudioTracks().length,
                    })
                    audioElement.srcObject = stream
                    audioElement.play().catch((err) => {
                        // AbortError is expected when track changes rapidly
                        if (err.name === 'AbortError') {
                            console.log(
                                '[RemoteVideo] ⚠️ Audio play aborted (expected):',
                                name
                            )
                            return
                        }
                        console.error(
                            '[RemoteVideo] ❌ Failed to play remote audio:',
                            name,
                            err
                        )
                    })
                } else {
                    console.log(
                        '[RemoteVideo] Using Jitsi attach fallback for audio:',
                        name
                    )
                    // Fallback to Jitsi attach method
                    trackService.attachTrack(audioTrack, audioElement)
                }
            } catch (error) {
                console.error(
                    '[RemoteVideo] ❌ Failed to attach remote audio track:',
                    name,
                    error
                )
            }
        } else {
            audioElement.srcObject = null
        }

        return () => {
            if (audioTrack && audioElement) {
                console.log(
                    '[RemoteVideo] 🧹 Cleaning up audio track for:',
                    name
                )
                audioElement.srcObject = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioTrack, isAudioMuted])

    const showVideo = hasVideoStream && !isLoading && !hasError && !isVideoMuted

    return (
        <div
            className={`relative rounded-lg overflow-hidden bg-gray-900 aspect-video group ${
                isDominantSpeaker ? 'ring-2 ring-green-500' : ''
            }`}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${
                    showVideo ? 'block' : 'hidden'
                }`}
            />

            {/* Hidden audio element for remote audio playback */}
            <audio ref={audioRef} autoPlay />

            <VideoPlaceholder
                name={name}
                imageUrl={imageUrl}
                isVisible={!showVideo && !isLoading}
            />

            {isLoading && !hasError && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-sm flex items-center gap-2">
                {name}
                {isDominantSpeaker && (
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
            </div>

            <StatusIndicators
                isVideoMuted={isVideoMuted}
                isAudioMuted={isAudioMuted}
            />

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
        </div>
    )
}
