import { useEffect, useRef, useState } from 'react'
import {
    attachTrackMuteListener,
    attachTrackStreamingStatusListener,
} from './track-events'
import { getTrackIdentity } from './track-identity'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface UseTrackMuteStateOptions {
    track: any
    fallbackMuted?: boolean
    participantName: string
    trackType: 'audio' | 'video'
    onAvailabilityChange?: (available: boolean) => void
}

interface TrackMuteStateResult {
    isMuted: boolean
    lifecycleVersion: number
    streamingStatus: string
}

export const useTrackMuteState = ({
    track,
    fallbackMuted = false,
    participantName,
    trackType,
    onAvailabilityChange,
}: UseTrackMuteStateOptions): TrackMuteStateResult => {
    const [isMuted, setIsMuted] = useState<boolean>(fallbackMuted)
    const [streamingStatus, setStreamingStatus] = useState<string>('unknown')
    const [lifecycleVersion, setLifecycleVersion] = useState<number>(0)
    const trackedIdentityRef = useRef<string | undefined>(undefined)
    const streamingStatusRef = useRef<string>('unknown')
    const mutedRef = useRef<boolean>(fallbackMuted)

    useEffect(() => {
        console.log(
            `[VideoTile][${participantName}] ${trackType} track effect - hasTrack:`,
            !!track
        )

        if (!track) {
            setIsMuted(true)
            mutedRef.current = true
            onAvailabilityChange?.(false)
            setStreamingStatus('unavailable')
            streamingStatusRef.current = 'unavailable'
            trackedIdentityRef.current = undefined
            setLifecycleVersion((prev) => prev + 1)
            return
        }

        setStreamingStatus('unknown')
        streamingStatusRef.current = 'unknown'

        const currentIdentity = getTrackIdentity(track)
        if (trackedIdentityRef.current !== currentIdentity) {
            trackedIdentityRef.current = currentIdentity
            setLifecycleVersion((prev) => prev + 1)
        }

        const updateMuteState = (changedTrack: any = track) => {
            if (typeof changedTrack.isMuted === 'function') {
                const muted = changedTrack.isMuted()
                setIsMuted(muted)
                mutedRef.current = muted
                if (trackType === 'video') {
                    onAvailabilityChange?.(!muted)
                }
            } else {
                setIsMuted(fallbackMuted)
                mutedRef.current = fallbackMuted
                if (trackType === 'video') {
                    onAvailabilityChange?.(!fallbackMuted)
                }
            }
        }

        updateMuteState(track)

        const detach = attachTrackMuteListener(track, (changedTrack: any) => {
            console.log(
                `[VideoTile][${participantName}] ${trackType} mute changed`
            )
            updateMuteState(changedTrack)
        })

        const detachStreaming = attachTrackStreamingStatusListener(
            track,
            (status) => {
                console.log(
                    `[VideoTile][${participantName}] ${trackType} streaming status: ${status}`
                )
                setStreamingStatus(status)
                if (streamingStatusRef.current !== status) {
                    streamingStatusRef.current = status
                    setLifecycleVersion((prev) => prev + 1)
                }

                if (trackType === 'video') {
                    const isAvailable = status === 'active' && !mutedRef.current
                    onAvailabilityChange?.(isAvailable)
                }

                const refreshedIdentity = getTrackIdentity(track)
                if (trackedIdentityRef.current !== refreshedIdentity) {
                    trackedIdentityRef.current = refreshedIdentity
                    setLifecycleVersion((prev) => prev + 1)
                }
            }
        )

        return () => {
            detach?.()
            detachStreaming?.()
            if (trackType === 'video') {
                onAvailabilityChange?.(false)
            }
        }
    }, [
        track,
        fallbackMuted,
        participantName,
        trackType,
        onAvailabilityChange,
    ])

    useEffect(() => {
        if (!track) {
            setIsMuted(fallbackMuted)
            mutedRef.current = fallbackMuted
        }
    }, [track, fallbackMuted])

    return { isMuted, lifecycleVersion, streamingStatus }
}
