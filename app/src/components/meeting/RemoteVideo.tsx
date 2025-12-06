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
        if (!videoElement) return

        if (videoTrack && !isVideoMuted) {
            setIsLoading(true)
            setHasError(false)

            try {
                // Get the MediaStream from the track
                const stream = trackService.getMediaStream(videoTrack)
                if (stream) {
                    videoElement.srcObject = stream
                    videoElement
                        .play()
                        .then(() => {
                            setHasVideoStream(true)
                            setIsLoading(false)
                        })
                        .catch((err) => {
                            // AbortError is expected when track changes rapidly
                            if (err.name === 'AbortError') {
                                return
                            }
                            console.error('Failed to play remote video:', err)
                            setHasError(true)
                            setIsLoading(false)
                        })
                } else {
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
                videoElement.srcObject = null
            }
        }
    }, [videoTrack, isVideoMuted])

    // Attach audio track to the audio element
    useEffect(() => {
        const audioElement = audioRef.current
        if (!audioElement) return

        if (audioTrack && !isAudioMuted) {
            try {
                const stream = trackService.getMediaStream(audioTrack)
                if (stream) {
                    audioElement.srcObject = stream
                    audioElement.play().catch((err) => {
                        // AbortError is expected when track changes rapidly
                        if (err.name === 'AbortError') {
                            return
                        }
                        console.error('Failed to play remote audio:', err)
                    })
                } else {
                    // Fallback to Jitsi attach method
                    trackService.attachTrack(audioTrack, audioElement)
                }
            } catch (error) {
                console.error('Failed to attach remote audio track:', error)
            }
        } else {
            audioElement.srcObject = null
        }

        return () => {
            if (audioTrack && audioElement) {
                audioElement.srcObject = null
            }
        }
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
