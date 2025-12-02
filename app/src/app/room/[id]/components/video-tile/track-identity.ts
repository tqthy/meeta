/* eslint-disable @typescript-eslint/no-explicit-any */
const getMediaStreamTrack = (track: any): MediaStreamTrack | undefined => {
    if (!track) return undefined

    const directTrack = track.getTrack?.()
    if (directTrack) {
        return directTrack
    }

    const type = track.getType?.()

    const tryFromOriginal = track.getOriginalStream?.()
    if (tryFromOriginal) {
        if (type === 'video') {
            const video = tryFromOriginal.getVideoTracks?.()[0]
            if (video) return video
        }
        if (type === 'audio') {
            const audio = tryFromOriginal.getAudioTracks?.()[0]
            if (audio) return audio
        }
        const tracks = tryFromOriginal.getTracks?.()
        if (tracks && tracks.length > 0) {
            return tracks[0]
        }
    }

    const tryFromStream = track.getStream?.()
    if (tryFromStream) {
        if (type === 'video') {
            const video = tryFromStream.getVideoTracks?.()[0]
            if (video) return video
        }
        if (type === 'audio') {
            const audio = tryFromStream.getAudioTracks?.()[0]
            if (audio) return audio
        }
        const tracks = tryFromStream.getTracks?.()
        if (tracks && tracks.length > 0) {
            return tracks[0]
        }
    }

    return undefined
}

export const getTrackIdentity = (track: any): string | undefined => {
    if (!track) return undefined

    const mediaTrack = getMediaStreamTrack(track)
    if (mediaTrack?.id) {
        return mediaTrack.id
    }

    if (typeof track.getId === 'function') {
        const candidate = track.getId()
        if (candidate) {
            return candidate
        }
    }

    if (typeof track.id === 'string') {
        return track.id
    }

    if (typeof track._id === 'string') {
        return track._id
    }

    return undefined
}
