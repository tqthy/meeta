import React, { useEffect, useRef } from 'react'
import { Mic, MicOff, Loader } from 'lucide-react'
import Image from 'next/image'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface VideoTileProps {
    name: string
    isMuted?: boolean
    isActive?: boolean
    isLocalParticipant?: boolean
    videoTrack?: any
    audioTrack?: any
    imageUrl?: string
}

/**
 * Hợp nhất video và audio tracks thành một MediaStream
 * Điều này đảm bảo âm thanh được đồng bộ với video
 */
const mergeTracksToStream = (
    videoTrack: any,
    audioTrack: any
): MediaStream | null => {
    try {
        const stream = new MediaStream()

        // Thêm video track - Jitsi tracks use getOriginalStream()
        if (videoTrack) {
            try {
                // Try getOriginalStream() first (Jitsi API)
                const videoStream = videoTrack.getOriginalStream?.()
                if (videoStream && videoStream.getVideoTracks().length > 0) {
                    videoStream
                        .getVideoTracks()
                        .forEach((track: MediaStreamTrack) => {
                            stream.addTrack(track)
                        })
                    console.log(
                        '[VideoTile] Added video track from getOriginalStream'
                    )
                }
            } catch {
                // Fallback: try getStream() (alternative API)
                try {
                    const videoStream = videoTrack.getStream?.()
                    if (
                        videoStream &&
                        videoStream.getVideoTracks().length > 0
                    ) {
                        videoStream
                            .getVideoTracks()
                            .forEach((track: MediaStreamTrack) => {
                                stream.addTrack(track)
                            })
                        console.log(
                            '[VideoTile] Added video track from getStream'
                        )
                    }
                } catch (err) {
                    console.warn(
                        '[VideoTile] Video track extraction failed:',
                        err
                    )
                }
            }
        }

        // Thêm audio track - Jitsi tracks use getOriginalStream()
        if (audioTrack) {
            try {
                // Try getOriginalStream() first (Jitsi API)
                const audioStream = audioTrack.getOriginalStream?.()
                if (audioStream && audioStream.getAudioTracks().length > 0) {
                    audioStream
                        .getAudioTracks()
                        .forEach((track: MediaStreamTrack) => {
                            stream.addTrack(track)
                        })
                    console.log(
                        '[VideoTile] Added audio track from getOriginalStream'
                    )
                }
            } catch {
                // Fallback: try getStream()
                try {
                    const audioStream = audioTrack.getStream?.()
                    if (
                        audioStream &&
                        audioStream.getAudioTracks().length > 0
                    ) {
                        audioStream
                            .getAudioTracks()
                            .forEach((track: MediaStreamTrack) => {
                                stream.addTrack(track)
                            })
                        console.log(
                            '[VideoTile] Added audio track from getStream'
                        )
                    }
                } catch (err) {
                    console.warn(
                        '[VideoTile] Audio track extraction failed:',
                        err
                    )
                }
            }
        }

        console.log(
            '[VideoTile] Merged stream has',
            stream.getTracks().length,
            'tracks'
        )
        return stream.getTracks().length > 0 ? stream : null
    } catch (error) {
        console.error('[VideoTile] Error merging tracks:', error)
        return null
    }
}

export function VideoTile({
    name,
    isMuted = false,
    isActive = false,
    isLocalParticipant = false,
    videoTrack,
    audioTrack,
    imageUrl,
}: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [hasError, setHasError] = React.useState(false)
    const handlersRef = useRef<{
        loadedmetadata?: () => void
        play?: () => void
        error?: (e: Event) => void
    }>({})

    useEffect(() => {
        const videoElement = videoRef.current
        if (!videoElement) return

        // Debug log
        console.log(`[VideoTile] Setting up for ${name}:`, {
            hasVideoTrack: !!videoTrack,
            hasAudioTrack: !!audioTrack,
            videoTrackType: videoTrack?.constructor?.name,
            audioTrackType: audioTrack?.constructor?.name,
        })

        // Cleanup old listeners
        if (handlersRef.current.loadedmetadata) {
            videoElement.removeEventListener(
                'loadedmetadata',
                handlersRef.current.loadedmetadata
            )
        }
        if (handlersRef.current.play) {
            videoElement.removeEventListener('play', handlersRef.current.play)
        }
        if (handlersRef.current.error) {
            videoElement.removeEventListener('error', handlersRef.current.error)
        }

        // Pause and clear old stream
        videoElement.pause()
        videoElement.srcObject = null
        handlersRef.current = {}
        setIsLoading(true)
        setHasError(false)

        // Kiểm tra xem track có hợp lệ không
        if (!videoTrack && !audioTrack) {
            console.warn(`[VideoTile] No tracks provided for ${name}`)
            setIsLoading(false)
            setHasError(true)
            return
        }

        // Kiểm tra track có methods cần thiết không
        const hasValidVideoTrack =
            videoTrack &&
            (typeof videoTrack.getOriginalStream === 'function' ||
                typeof videoTrack.getStream === 'function')
        const hasValidAudioTrack =
            audioTrack &&
            (typeof audioTrack.getOriginalStream === 'function' ||
                typeof audioTrack.getStream === 'function')

        if (!hasValidVideoTrack && !hasValidAudioTrack) {
            console.warn(
                `[VideoTile] Invalid tracks for ${name} - missing required methods`
            )
            setIsLoading(false)
            setHasError(true)
            return
        }

        try {
            const mergedStream = mergeTracksToStream(videoTrack, audioTrack)

            if (!mergedStream || mergedStream.getTracks().length === 0) {
                console.warn(
                    `[VideoTile] Failed to merge tracks for ${name}`
                )
                setIsLoading(false)
                setHasError(true)
                return
            }

            console.log(
                `[VideoTile] Successfully merged stream for ${name}:`,
                mergedStream.getTracks().map((t) => t.kind)
            )

            // Create new handlers
            const handleLoadedMetadata = () => {
                console.log(
                    `[VideoTile] Stream metadata loaded for ${name}`
                )
                setIsLoading(false)
                setHasError(false)
            }

            const handlePlay = () => {
                console.log(`[VideoTile] Stream playing for ${name}`)
                setIsLoading(false)
                setHasError(false)
            }

            const handleError = (error: Event) => {
                console.error(
                    `[VideoTile] Error playing stream for ${name}:`,
                    error
                )
                setHasError(true)
                setIsLoading(false)
            }

            // Store handlers for cleanup
            handlersRef.current = {
                loadedmetadata: handleLoadedMetadata,
                play: handlePlay,
                error: handleError,
            }

            // Attach stream
            videoElement.srcObject = mergedStream

            // Add event listeners
            videoElement.addEventListener(
                'loadedmetadata',
                handleLoadedMetadata
            )
            videoElement.addEventListener('play', handlePlay)
            videoElement.addEventListener('error', handleError)

            // Force play
            const playPromise = videoElement.play()
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    console.warn(
                        `[VideoTile] Auto-play failed for ${name}:`,
                        err.name,
                        err.message
                    )
                    // Don't set error state for autoplay errors (autoplay policy)
                })
            }
        } catch (error) {
            console.error(`[VideoTile] Error setting up stream for ${name}:`, error)
            setHasError(true)
            setIsLoading(false)
        }

        // Cleanup function
        return () => {
            if (!videoElement) return

            // Remove listeners
            if (handlersRef.current.loadedmetadata) {
                videoElement.removeEventListener(
                    'loadedmetadata',
                    handlersRef.current.loadedmetadata
                )
            }
            if (handlersRef.current.play) {
                videoElement.removeEventListener(
                    'play',
                    handlersRef.current.play
                )
            }
            if (handlersRef.current.error) {
                videoElement.removeEventListener(
                    'error',
                    handlersRef.current.error
                )
            }

            // Pause playback
            videoElement.pause()
            videoElement.srcObject = null
        }
    }, [videoTrack, audioTrack, name])

    return (
        <div
            className={`relative rounded-lg overflow-hidden bg-gray-900 aspect-video group ${isActive ? 'ring-2 ring-blue-500' : ''}`}
        >
            {/* Video element */}
            <video
                ref={videoRef}
                autoPlay
                muted={isLocalParticipant}
                playsInline
                className={`w-full h-full object-cover ${!isLoading && !hasError ? 'bg-black' : 'hidden'}`}
            />

            {/* Error state - show fallback */}
            {hasError && (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={name}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-2xl font-bold text-white">
                                    {name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm">No video</p>
                        </div>
                    )}
                </div>
            )}

            {/* Loading state */}
            {isLoading && !hasError && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            )}

            {/* Gradient overlay for better text visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Name label */}
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-sm">
                {name}
            </div>

            {/* Muted indicator */}
            {isMuted ? (
                <div className="absolute bottom-2 right-2 p-1.5 bg-red-600 rounded-full">
                    <MicOff className="w-4 h-4 text-white" />
                </div>
            ) : (
                <div className="absolute bottom-2 right-2 p-1.5 bg-green-600 rounded-full">
                    <Mic className="w-4 h-4 text-white" />
                </div>
            )}

            {/* Hover effect */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
        </div>
    )
}
