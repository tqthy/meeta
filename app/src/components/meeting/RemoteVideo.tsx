'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Loader } from 'lucide-react'
import { VideoPlaceholder } from './video-tile/VideoPlaceholder'
import { StatusIndicators } from './video-tile/StatusIndicators'

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

/**
 * RemoteVideo Component - Simplified Approach
 *
 * Strategy: Use Jitsi's built-in attach() method directly.
 * Let Jitsi SDK handle all MediaStream management internally.
 * This is more reliable for P2P↔SFU transitions.
 */
function RemoteVideoComponent({
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
    const [hasVideoStream, setHasVideoStream] = useState(false)

    // Track what's currently attached to avoid duplicate attachments
    const attachedVideoTrack = useRef<any>(null)
    const attachedAudioTrack = useRef<any>(null)

    // Attach video track using Jitsi's built-in attach() method
    useEffect(() => {
        const videoElement = videoRef.current
        if (!videoElement || !videoTrack) {
            setHasVideoStream(false)
            return
        }

        // Check if this is the same track already attached
        if (attachedVideoTrack.current === videoTrack) {
            return // Already attached, no action needed
        }

        console.log('[RemoteVideo] 📹 Attaching video track:', {
            participant: name,
            trackId: videoTrack.getId?.(),
            participantId: videoTrack.getParticipantId?.(),
        })

        setIsLoading(true)

        try {
            // Detach previous track if exists
            if (
                attachedVideoTrack.current &&
                typeof attachedVideoTrack.current.detach === 'function'
            ) {
                console.log('[RemoteVideo] Detaching old video track')
                attachedVideoTrack.current.detach(videoElement)
            }

            // Attach new track using Jitsi's method
            if (typeof videoTrack.attach === 'function') {
                videoTrack.attach(videoElement)
                attachedVideoTrack.current = videoTrack
                setHasVideoStream(true)
                setIsLoading(false)
                console.log('[RemoteVideo] ✅ Video track attached')
            } else {
                console.error('[RemoteVideo] Track does not have attach method')
                setIsLoading(false)
            }
        } catch (error) {
            console.error('[RemoteVideo] Error attaching video track:', error)
            setIsLoading(false)
        }

        return () => {
            console.log('[RemoteVideo] 🧹 Cleaning up video track:', name)
            if (
                attachedVideoTrack.current &&
                videoElement &&
                typeof attachedVideoTrack.current.detach === 'function'
            ) {
                attachedVideoTrack.current.detach(videoElement)
                attachedVideoTrack.current = null
            }
        }
    }, [videoTrack, name]) // Handle video mute state (show/hide video)
    useEffect(() => {
        setHasVideoStream(!isVideoMuted && !!videoTrack)
    }, [isVideoMuted, videoTrack])

    // Attach audio track using Jitsi's built-in attach() method
    useEffect(() => {
        const audioElement = audioRef.current
        if (!audioElement || !audioTrack) {
            return
        }

        // Check if this is the same track already attached
        if (attachedAudioTrack.current === audioTrack) {
            return // Already attached, no action needed
        }

        console.log('[RemoteVideo] 🔊 Attaching audio track:', {
            participant: name,
            trackId: audioTrack.getId?.(),
        })

        try {
            // Detach previous track if exists
            if (
                attachedAudioTrack.current &&
                typeof attachedAudioTrack.current.detach === 'function'
            ) {
                console.log('[RemoteVideo] Detaching old audio track')
                attachedAudioTrack.current.detach(audioElement)
            }

            // Attach new track using Jitsi's method
            if (typeof audioTrack.attach === 'function') {
                audioTrack.attach(audioElement)
                attachedAudioTrack.current = audioTrack
                console.log('[RemoteVideo] ✅ Audio track attached')
            } else {
                console.error('[RemoteVideo] Track does not have attach method')
            }
        } catch (error) {
            console.error('[RemoteVideo] Error attaching audio track:', error)
        }

        return () => {
            console.log('[RemoteVideo] 🧹 Cleaning up audio track:', name)
            if (
                attachedAudioTrack.current &&
                audioElement &&
                typeof attachedAudioTrack.current.detach === 'function'
            ) {
                attachedAudioTrack.current.detach(audioElement)
                attachedAudioTrack.current = null
            }
        }
    }, [audioTrack, name])

    const showVideo = hasVideoStream && !isLoading

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
                muted
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

            {isLoading && (
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

// Memoize component - re-render only when props actually change
export const RemoteVideo = React.memo(
    RemoteVideoComponent,
    (prevProps, nextProps) => {
        // Compare track object references (not IDs)
        // Jitsi provides new objects during P2P↔SFU transitions
        return (
            prevProps.videoTrack === nextProps.videoTrack &&
            prevProps.audioTrack === nextProps.audioTrack &&
            prevProps.isVideoMuted === nextProps.isVideoMuted &&
            prevProps.isAudioMuted === nextProps.isAudioMuted &&
            prevProps.name === nextProps.name &&
            prevProps.isDominantSpeaker === nextProps.isDominantSpeaker
        )
    }
)
