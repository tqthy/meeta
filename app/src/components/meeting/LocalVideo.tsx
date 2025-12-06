'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Loader } from 'lucide-react'
import { StatusIndicators, VideoPlaceholder } from './video-tile'
import { trackService } from '@/domains/meeting/services'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface LocalVideoProps {
    name: string
    isAudioMuted?: boolean
    isVideoMuted?: boolean
    videoTrack?: any // JitsiLocalTrack
    imageUrl?: string
    isActive?: boolean
}

export function LocalVideo({
    name,
    isAudioMuted = true,
    isVideoMuted = true,
    videoTrack,
    imageUrl,
    isActive = false,
}: LocalVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
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
                            console.error('Failed to play video:', err)
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
                console.error('Failed to attach local video track:', error)
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

    const showVideo = hasVideoStream && !isLoading && !hasError && !isVideoMuted

    return (
        <div
            className={`relative rounded-lg overflow-hidden bg-gray-900 aspect-video group ${
                isActive ? 'ring-2 ring-blue-500' : ''
            }`}
        >
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${
                    showVideo ? 'block' : 'hidden'
                }`}
            />

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

            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-sm flex items-center gap-1">
                {name}
                <span className="text-xs text-gray-400">(You)</span>
            </div>

            <StatusIndicators
                isVideoMuted={isVideoMuted}
                isAudioMuted={isAudioMuted}
            />

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
        </div>
    )
}
