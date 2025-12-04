import React, { useEffect, useRef, useState } from 'react'
import { Loader } from 'lucide-react'
import { mergeTracksToStream } from './stream-utils'
import { VideoPlaceholder } from './VideoPlaceholder'
import { StatusIndicators } from './StatusIndicators'
import { useTrackMuteState } from './useTrackMuteState'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface VideoTileProps {
    name: string
    isMuted?: boolean
    isVideoActive?: boolean
    isLocalParticipant?: boolean
    videoTrack?: any
    audioTrack?: any
    imageUrl?: string
}

export function VideoTile({
    name,
    isMuted = false,
    isVideoActive = true,
    isLocalParticipant = false,
    videoTrack,
    audioTrack,
    imageUrl,
}: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [hasVideoStream, setHasVideoStream] = useState(false)
    const handlersRef = useRef<{
        loadedmetadata?: () => void
        play?: () => void
        error?: (e: Event) => void
    }>({})

    const {
        isMuted: isVideoTrackMuted,
        lifecycleVersion: videoTrackVersion,
        streamingStatus: videoStreamingStatus,
    } = useTrackMuteState({
        track: videoTrack,
        fallbackMuted: true,
        participantName: name,
        trackType: 'video',
        onAvailabilityChange: (available) => setHasVideoStream(available),
    })

    const {
        isMuted: isAudioTrackMuted,
        lifecycleVersion: audioTrackVersion,
        streamingStatus: audioStreamingStatus,
    } = useTrackMuteState({
        track: audioTrack,
        fallbackMuted: isMuted,
        participantName: name,
        trackType: 'audio',
    })

    useEffect(() => {
        const videoElement = videoRef.current
        if (!videoElement) {
            console.log(`[VideoTile][${name}] No video element ref`)
            return
        }

        console.log(
            `[VideoTile][${name}] ========== Setting up stream ==========`
        )
        console.log(`[VideoTile][${name}] Setup details:`, {
            hasVideoTrack: !!videoTrack,
            hasAudioTrack: !!audioTrack,
            isVideoTrackMuted,
            isAudioTrackMuted,
            videoTrackType: videoTrack?.constructor?.name,
            audioTrackType: audioTrack?.constructor?.name,
            videoTrackId: videoTrack?.getId?.(),
            audioTrackId: audioTrack?.getId?.(),
            videoReadyState: videoTrack?.getTrack?.()?.readyState,
            audioReadyState: audioTrack?.getTrack?.()?.readyState,
            videoStreamingStatus,
            audioStreamingStatus,
            videoTrackVersion,
            audioTrackVersion,
        })

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

        videoElement.pause()
        videoElement.srcObject = null
        handlersRef.current = {}
        setIsLoading(true)
        setHasError(false)

        if (!videoTrack && !audioTrack) {
            console.warn(
                `[VideoTile][${name}] No tracks provided, showing placeholder`
            )
            setIsLoading(false)
            setHasVideoStream(false)
            return
        }

        const hasValidVideoTrack =
            videoTrack &&
            !isVideoTrackMuted &&
            (typeof videoTrack.getOriginalStream === 'function' ||
                typeof videoTrack.getStream === 'function')

        const hasValidAudioTrack =
            audioTrack &&
            (typeof audioTrack.getOriginalStream === 'function' ||
                typeof audioTrack.getStream === 'function')

        console.log(`[VideoTile][${name}] Track validation:`, {
            hasValidVideoTrack,
            hasValidAudioTrack,
            isVideoTrackMuted,
            isAudioTrackMuted,
        })

        if (!hasValidVideoTrack && !hasValidAudioTrack) {
            console.log(
                `[VideoTile][${name}] No active tracks (video muted or no valid tracks)`
            )
            setIsLoading(false)
            setHasVideoStream(false)
            return
        }

        const videoTrackToUse = hasValidVideoTrack ? videoTrack : null
        const audioTrackToUse = hasValidAudioTrack ? audioTrack : null

        console.log(`[VideoTile][${name}] Tracks to merge:`, {
            videoTrackToUse: !!videoTrackToUse,
            audioTrackToUse: !!audioTrackToUse,
        })

        try {
            const mergedStream = mergeTracksToStream(
                videoTrackToUse,
                audioTrackToUse
            )

            if (!mergedStream || mergedStream.getTracks().length === 0) {
                console.warn(
                    `[VideoTile][${name}] Failed to merge tracks - no stream created`
                )
                setIsLoading(false)
                setHasVideoStream(false)
                return
            }

            const hasVideo = mergedStream.getVideoTracks().length > 0
            const hasAudio = mergedStream.getAudioTracks().length > 0
            setHasVideoStream(hasVideo)

            console.log(`[VideoTile][${name}] ✅ Successfully merged stream:`, {
                videoTracks: mergedStream.getVideoTracks().length,
                audioTracks: mergedStream.getAudioTracks().length,
                hasVideo,
                hasAudio,
                trackDetails: mergedStream.getTracks().map((t) => ({
                    kind: t.kind,
                    enabled: t.enabled,
                    readyState: t.readyState,
                    muted: t.muted,
                    id: t.id.slice(0, 8),
                })),
            })

            const handleLoadedMetadata = () => {
                console.log(`[VideoTile][${name}] ✅ Stream metadata loaded`)
                setIsLoading(false)
                setHasError(false)
            }

            const handlePlay = () => {
                console.log(`[VideoTile][${name}] ✅ Stream playing`)
                setIsLoading(false)
                setHasError(false)
            }

            const handleError = (error: Event) => {
                console.error(
                    `[VideoTile][${name}] ❌ Error playing stream:`,
                    error
                )
                setHasError(true)
                setIsLoading(false)
            }

            handlersRef.current = {
                loadedmetadata: handleLoadedMetadata,
                play: handlePlay,
                error: handleError,
            }

            console.log(
                `[VideoTile][${name}] Attaching stream to video element`
            )
            videoElement.srcObject = mergedStream

            videoElement.addEventListener(
                'loadedmetadata',
                handleLoadedMetadata
            )
            videoElement.addEventListener('play', handlePlay)
            videoElement.addEventListener('error', handleError)

            console.log(`[VideoTile][${name}] Calling video.play()`)
            const playPromise = videoElement.play()
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log(
                            `[VideoTile][${name}] ✅ Play promise resolved`
                        )
                    })
                    .catch((err) => {
                        console.warn(
                            `[VideoTile][${name}] ⚠️ Auto-play failed:`,
                            err.name,
                            err.message
                        )
                    })
            }
        } catch (error) {
            console.error(
                `[VideoTile][${name}] ❌ Error setting up stream:`,
                error
            )
            setHasError(true)
            setIsLoading(false)
        }

        return () => {
            console.log(`[VideoTile][${name}] 🧹 Cleaning up stream effect`)
            if (!videoElement) return

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

            videoElement.pause()
            const oldStream = videoElement.srcObject as MediaStream | null
            if (oldStream) {
                console.log(`[VideoTile][${name}] Stopping old stream tracks`)
                oldStream.getTracks().forEach((track) => {
                    console.log(
                        `[VideoTile][${name}] Detaching track:`,
                        track.kind,
                        track.id.slice(0, 8)
                    )
                })
            }
            videoElement.srcObject = null
        }
    }, [
        videoTrack,
        audioTrack,
        name,
        isVideoTrackMuted,
        isAudioTrackMuted,
        videoTrackVersion,
        audioTrackVersion,
        videoStreamingStatus,
        audioStreamingStatus,
    ])

    const isActive = Boolean(videoTrack && !isVideoTrackMuted)

    return (
        <div
            className={`relative rounded-lg overflow-hidden bg-gray-900 aspect-video group ${isActive ? 'ring-2 ring-blue-500' : ''}`}
        >
            <video
                ref={videoRef}
                autoPlay
                muted={isLocalParticipant}
                playsInline
                className={`w-full h-full object-cover ${hasVideoStream && !isLoading && !hasError ? 'block' : 'hidden'}`}
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
