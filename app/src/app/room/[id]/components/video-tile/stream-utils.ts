/* eslint-disable @typescript-eslint/no-explicit-any */
export const mergeTracksToStream = (
    videoTrack: any,
    audioTrack: any
): MediaStream | null => {
    console.log('[mergeTracksToStream] Starting merge:', {
        hasVideoTrack: !!videoTrack,
        hasAudioTrack: !!audioTrack,
    })

    try {
        const stream = new MediaStream()

        if (videoTrack) {
            try {
                const videoStream = videoTrack.getOriginalStream?.()
                if (videoStream && videoStream.getVideoTracks().length > 0) {
                    const tracks = videoStream.getVideoTracks()
                    tracks.forEach((track: MediaStreamTrack) => {
                        console.log(
                            '[mergeTracksToStream] Adding video track:',
                            {
                                id: track.id.slice(0, 8),
                                enabled: track.enabled,
                                readyState: track.readyState,
                                muted: track.muted,
                            }
                        )
                        stream.addTrack(track)
                    })
                    console.log(
                        '[mergeTracksToStream] ✅ Added video track from getOriginalStream'
                    )
                }
            } catch (videoErr) {
                console.warn(
                    '[mergeTracksToStream] getOriginalStream failed, trying getStream:',
                    videoErr
                )
                try {
                    const videoStream = videoTrack.getStream?.()
                    if (
                        videoStream &&
                        videoStream.getVideoTracks().length > 0
                    ) {
                        const tracks = videoStream.getVideoTracks()
                        tracks.forEach((track: MediaStreamTrack) => {
                            console.log(
                                '[mergeTracksToStream] Adding video track (fallback):',
                                {
                                    id: track.id.slice(0, 8),
                                    enabled: track.enabled,
                                    readyState: track.readyState,
                                }
                            )
                            stream.addTrack(track)
                        })
                        console.log(
                            '[mergeTracksToStream] ✅ Added video track from getStream (fallback)'
                        )
                    }
                } catch (err) {
                    console.error(
                        '[mergeTracksToStream] ❌ Video track extraction failed:',
                        err
                    )
                }
            }
        }

        if (audioTrack) {
            try {
                const audioStream = audioTrack.getOriginalStream?.()
                if (audioStream && audioStream.getAudioTracks().length > 0) {
                    const tracks = audioStream.getAudioTracks()
                    tracks.forEach((track: MediaStreamTrack) => {
                        console.log(
                            '[mergeTracksToStream] Adding audio track:',
                            {
                                id: track.id.slice(0, 8),
                                enabled: track.enabled,
                                readyState: track.readyState,
                                muted: track.muted,
                            }
                        )
                        stream.addTrack(track)
                    })
                    console.log(
                        '[mergeTracksToStream] ✅ Added audio track from getOriginalStream'
                    )
                }
            } catch (audioErr) {
                console.warn(
                    '[mergeTracksToStream] getOriginalStream failed, trying getStream:',
                    audioErr
                )
                try {
                    const audioStream = audioTrack.getStream?.()
                    if (
                        audioStream &&
                        audioStream.getAudioTracks().length > 0
                    ) {
                        const tracks = audioStream.getAudioTracks()
                        tracks.forEach((track: MediaStreamTrack) => {
                            console.log(
                                '[mergeTracksToStream] Adding audio track (fallback):',
                                {
                                    id: track.id.slice(0, 8),
                                    enabled: track.enabled,
                                    readyState: track.readyState,
                                }
                            )
                            stream.addTrack(track)
                        })
                        console.log(
                            '[mergeTracksToStream] ✅ Added audio track from getStream (fallback)'
                        )
                    }
                } catch (err) {
                    console.error(
                        '[mergeTracksToStream] ❌ Audio track extraction failed:',
                        err
                    )
                }
            }
        }

        const trackCount = stream.getTracks().length
        console.log(
            '[mergeTracksToStream] Result:',
            trackCount > 0 ? '✅' : '❌',
            'Merged stream has',
            trackCount,
            'tracks'
        )
        return trackCount > 0 ? stream : null
    } catch (error) {
        console.error('[mergeTracksToStream] ❌ Error merging tracks:', error)
        return null
    }
}
