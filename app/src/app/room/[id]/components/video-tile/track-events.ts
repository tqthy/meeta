/* eslint-disable @typescript-eslint/no-explicit-any */
const getTrackMuteEventName = (): string => {
    if (typeof window !== 'undefined') {
        const muteEvent = (window as any)?.JitsiMeetJS?.events?.track
            ?.TRACK_MUTE_CHANGED
        if (muteEvent) {
            return muteEvent
        }
    }
    return 'track_mute_changed'
}

export const attachTrackMuteListener = (
    track: any,
    handler: (track: any) => void
): (() => void) | null => {
    if (!track) return null
    const eventName = getTrackMuteEventName()

    if (typeof track.addEventListener === 'function') {
        track.addEventListener(eventName, handler)
        return () => {
            track.removeEventListener?.(eventName, handler)
        }
    }

    if (typeof track.on === 'function') {
        track.on(eventName, handler)
        return () => {
            track.off?.(eventName, handler)
        }
    }

    return null
}

const getTrackStreamingStatusEventName = (): string => {
    if (typeof window !== 'undefined') {
        const streamingEvent = (window as any)?.JitsiMeetJS?.events?.track
            ?.TRACK_STREAMING_STATUS_CHANGED
        if (streamingEvent) {
            return streamingEvent
        }
    }
    return 'track_streaming_status_changed'
}

export const attachTrackStreamingStatusListener = (
    track: any,
    handler: (status: string, rawEvent?: any[]) => void
): (() => void) | null => {
    if (!track) return null
    const eventName = getTrackStreamingStatusEventName()

    const wrappedHandler = (...args: any[]) => {
        const statusCandidate = args.find((arg) =>
            typeof arg === 'string'
        )
        const statusFromObject =
            typeof args?.[0]?.streamingStatus === 'string'
                ? args[0].streamingStatus
                : undefined
        const status = (statusCandidate || statusFromObject || 'unknown') as string
        handler(status, args)
    }

    if (typeof track.addEventListener === 'function') {
        track.addEventListener(eventName, wrappedHandler)
        return () => {
            track.removeEventListener?.(eventName, wrappedHandler)
        }
    }

    if (typeof track.on === 'function') {
        track.on(eventName, wrappedHandler)
        return () => {
            track.off?.(eventName, wrappedHandler)
        }
    }

    return null
}
