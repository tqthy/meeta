import React, { useRef, useState } from 'react'
import { Loader } from 'lucide-react'
import { VideoPlaceholder } from './video-tile/VideoPlaceholder'
import { StatusIndicators } from './video-tile/StatusIndicators'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface RemoteVideoProps {
    name: string
    isMuted?: boolean
    videoTrack?: any
    imageUrl?: string
}

export function RemoteVideo({
    name,
    isMuted = false,
    videoTrack,
    imageUrl,
}: RemoteVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isLoading] = useState(false)
    const [hasError] = useState(false)
    const [hasVideoStream] = useState(false)

    const isVideoTrackMuted = true
    const isAudioTrackMuted = isMuted
    const isActive = Boolean(videoTrack && !isVideoTrackMuted)

    return (
        <div
            className={`relative rounded-lg overflow-hidden bg-gray-900 aspect-video group ${
                isActive ? 'ring-2 ring-blue-500' : ''
            }`}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${
                    hasVideoStream && !isLoading && !hasError
                        ? 'block'
                        : 'hidden'
                }`}
            />

            <VideoPlaceholder
                name={name}
                imageUrl={imageUrl}
                isVisible={(!hasVideoStream || hasError) && !isLoading}
            />

            {isLoading && !hasError && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-sm">
                {name}
            </div>

            <StatusIndicators
                isVideoMuted={isVideoTrackMuted}
                isAudioMuted={isAudioTrackMuted}
            />

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
        </div>
    )
}
