import React from 'react'
import { Loader } from 'lucide-react'
import { LocalVideo } from './LocalVideo'
import { RemoteVideo } from './RemoteVideo'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Participant {
    id: string | number
    displayName: string
    isAudioMuted: boolean
    isVideoMuted: boolean
    isLocal: boolean
    isDominantSpeaker?: boolean
    videoTrack?: any
    audioTrack?: any
    imageUrl?: string
}

interface MeetingContainerProps {
    participants: Participant[]
    currentLayout: 'auto' | 'grid' | 'sidebar' | 'spotlight'
    isLoading?: boolean
    dominantSpeakerId?: string | null
}

export function MeetingContainer({
    participants,
    currentLayout,
    isLoading = false,
    dominantSpeakerId,
}: MeetingContainerProps) {
    // Log participant rendering info
    console.log('[MeetingContainer] 🎭 Rendering with participants:', {
        count: participants.length,
        layout: currentLayout,
        participants: participants.map((p) => ({
            id: p.id,
            name: p.displayName,
            isLocal: p.isLocal,
            hasVideo: !!p.videoTrack,
            hasAudio: !!p.audioTrack,
            isVideoMuted: p.isVideoMuted,
            isAudioMuted: p.isAudioMuted,
            videoTrackId: p.videoTrack?.getId?.(),
            audioTrackId: p.audioTrack?.getId?.(),
        })),
    })

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-gray-400">Connecting to meeting...</p>
                </div>
            </div>
        )
    }

    if (participants.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <p className="text-gray-400">Waiting for participants...</p>
            </div>
        )
    }

    // Spotlight layout
    if (currentLayout === 'spotlight') {
        const mainParticipant = participants[0]
        const sidebarParticipants = participants.slice(1)

        return (
            <div className="w-full h-full flex flex-col gap-4">
                <div className="flex-1 min-h-0">
                    {mainParticipant.isLocal ? (
                        <LocalVideo
                            name={mainParticipant.displayName}
                            isAudioMuted={mainParticipant.isAudioMuted}
                            isVideoMuted={mainParticipant.isVideoMuted}
                            videoTrack={mainParticipant.videoTrack}
                            imageUrl={mainParticipant.imageUrl}
                        />
                    ) : (
                        <RemoteVideo
                            name={mainParticipant.displayName}
                            isAudioMuted={mainParticipant.isAudioMuted}
                            isVideoMuted={mainParticipant.isVideoMuted}
                            videoTrack={mainParticipant.videoTrack}
                            audioTrack={mainParticipant.audioTrack}
                            imageUrl={mainParticipant.imageUrl}
                            isDominantSpeaker={
                                dominantSpeakerId === String(mainParticipant.id)
                            }
                        />
                    )}
                </div>
                {sidebarParticipants.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 h-24">
                        {sidebarParticipants.map((participant) => (
                            <div key={participant.id}>
                                {participant.isLocal ? (
                                    <LocalVideo
                                        name={participant.displayName}
                                        isAudioMuted={participant.isAudioMuted}
                                        isVideoMuted={participant.isVideoMuted}
                                        videoTrack={participant.videoTrack}
                                        imageUrl={participant.imageUrl}
                                    />
                                ) : (
                                    <RemoteVideo
                                        name={participant.displayName}
                                        isAudioMuted={participant.isAudioMuted}
                                        isVideoMuted={participant.isVideoMuted}
                                        videoTrack={participant.videoTrack}
                                        audioTrack={participant.audioTrack}
                                        imageUrl={participant.imageUrl}
                                        isDominantSpeaker={
                                            dominantSpeakerId ===
                                            String(participant.id)
                                        }
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // Sidebar layout
    if (currentLayout === 'sidebar') {
        const mainParticipant = participants[0]
        const sidebarParticipants = participants.slice(1)

        return (
            <div className="flex gap-4 h-full">
                <div className="flex-1">
                    {mainParticipant.isLocal ? (
                        <LocalVideo
                            name={mainParticipant.displayName}
                            isAudioMuted={mainParticipant.isAudioMuted}
                            isVideoMuted={mainParticipant.isVideoMuted}
                            videoTrack={mainParticipant.videoTrack}
                            imageUrl={mainParticipant.imageUrl}
                        />
                    ) : (
                        <RemoteVideo
                            name={mainParticipant.displayName}
                            isAudioMuted={mainParticipant.isAudioMuted}
                            isVideoMuted={mainParticipant.isVideoMuted}
                            videoTrack={mainParticipant.videoTrack}
                            audioTrack={mainParticipant.audioTrack}
                            imageUrl={mainParticipant.imageUrl}
                            isDominantSpeaker={
                                dominantSpeakerId === String(mainParticipant.id)
                            }
                        />
                    )}
                </div>
                {sidebarParticipants.length > 0 && (
                    <div className="w-64 flex flex-col gap-2 overflow-y-auto">
                        {sidebarParticipants.map((participant) => (
                            <div key={participant.id} className="h-40">
                                {participant.isLocal ? (
                                    <LocalVideo
                                        name={participant.displayName}
                                        isAudioMuted={participant.isAudioMuted}
                                        isVideoMuted={participant.isVideoMuted}
                                        videoTrack={participant.videoTrack}
                                        imageUrl={participant.imageUrl}
                                    />
                                ) : (
                                    <RemoteVideo
                                        name={participant.displayName}
                                        isAudioMuted={participant.isAudioMuted}
                                        isVideoMuted={participant.isVideoMuted}
                                        videoTrack={participant.videoTrack}
                                        audioTrack={participant.audioTrack}
                                        imageUrl={participant.imageUrl}
                                        isDominantSpeaker={
                                            dominantSpeakerId ===
                                            String(participant.id)
                                        }
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // Grid layout (default and auto)
    const gridClasses = {
        auto: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        grid: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        sidebar: 'grid-cols-1',
        spotlight: 'grid-cols-1',
    }

    return (
        <div className={`grid ${gridClasses[currentLayout]} gap-2 h-full`}>
            {participants.map((participant) => (
                <div key={participant.id}>
                    {participant.isLocal ? (
                        <LocalVideo
                            name={participant.displayName}
                            isAudioMuted={participant.isAudioMuted}
                            isVideoMuted={participant.isVideoMuted}
                            videoTrack={participant.videoTrack}
                            imageUrl={participant.imageUrl}
                        />
                    ) : (
                        <RemoteVideo
                            name={participant.displayName}
                            isAudioMuted={participant.isAudioMuted}
                            isVideoMuted={participant.isVideoMuted}
                            videoTrack={participant.videoTrack}
                            audioTrack={participant.audioTrack}
                            imageUrl={participant.imageUrl}
                            isDominantSpeaker={
                                dominantSpeakerId === String(participant.id)
                            }
                        />
                    )}
                </div>
            ))}
        </div>
    )
}
