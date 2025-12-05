import React from 'react'
import { Loader } from 'lucide-react'
import { LocalVideo } from './LocalVideo'
import { RemoteVideo } from './RemoteVideo'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Participant {
    id: string | number
    displayName: string
    isMuted: boolean
    isLocalParticipant: boolean
    videoTrack?: any
    imageUrl?: string
}

interface MeetingContainerProps {
    participants: Participant[]
    currentLayout: 'auto' | 'grid' | 'sidebar' | 'spotlight'
    isLoading?: boolean
}

export function MeetingContainer({
    participants,
    currentLayout,
    isLoading = false,
}: MeetingContainerProps) {
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
                    {mainParticipant.isLocalParticipant ? (
                        <LocalVideo
                            name={mainParticipant.displayName}
                            isMuted={mainParticipant.isMuted}
                            videoTrack={mainParticipant.videoTrack}
                            imageUrl={mainParticipant.imageUrl}
                        />
                    ) : (
                        <RemoteVideo
                            name={mainParticipant.displayName}
                            isMuted={mainParticipant.isMuted}
                            videoTrack={mainParticipant.videoTrack}
                            imageUrl={mainParticipant.imageUrl}
                        />
                    )}
                </div>
                {sidebarParticipants.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 h-24">
                        {sidebarParticipants.map((participant) => (
                            <div key={participant.id}>
                                {participant.isLocalParticipant ? (
                                    <LocalVideo
                                        name={participant.displayName}
                                        isMuted={participant.isMuted}
                                        videoTrack={participant.videoTrack}
                                        imageUrl={participant.imageUrl}
                                    />
                                ) : (
                                    <RemoteVideo
                                        name={participant.displayName}
                                        isMuted={participant.isMuted}
                                        videoTrack={participant.videoTrack}
                                        imageUrl={participant.imageUrl}
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
                    {mainParticipant.isLocalParticipant ? (
                        <LocalVideo
                            name={mainParticipant.displayName}
                            isMuted={mainParticipant.isMuted}
                            videoTrack={mainParticipant.videoTrack}
                            imageUrl={mainParticipant.imageUrl}
                        />
                    ) : (
                        <RemoteVideo
                            name={mainParticipant.displayName}
                            isMuted={mainParticipant.isMuted}
                            videoTrack={mainParticipant.videoTrack}
                            imageUrl={mainParticipant.imageUrl}
                        />
                    )}
                </div>
                {sidebarParticipants.length > 0 && (
                    <div className="w-64 flex flex-col gap-2 overflow-y-auto">
                        {sidebarParticipants.map((participant) => (
                            <div key={participant.id} className="h-40">
                                {participant.isLocalParticipant ? (
                                    <LocalVideo
                                        name={participant.displayName}
                                        isMuted={participant.isMuted}
                                        videoTrack={participant.videoTrack}
                                        imageUrl={participant.imageUrl}
                                    />
                                ) : (
                                    <RemoteVideo
                                        name={participant.displayName}
                                        isMuted={participant.isMuted}
                                        videoTrack={participant.videoTrack}
                                        imageUrl={participant.imageUrl}
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
                    {participant.isLocalParticipant ? (
                        <LocalVideo
                            name={participant.displayName}
                            isMuted={participant.isMuted}
                            videoTrack={participant.videoTrack}
                            imageUrl={participant.imageUrl}
                        />
                    ) : (
                        <RemoteVideo
                            name={participant.displayName}
                            isMuted={participant.isMuted}
                            videoTrack={participant.videoTrack}
                            imageUrl={participant.imageUrl}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}
