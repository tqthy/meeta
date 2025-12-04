import React from 'react'
import { X, Mic, MicOff, MoreVertical, UserPlus } from 'lucide-react'
import Image from 'next/image'

interface Participant {
    id: string | number
    name: string
    imageUrl: string
    isMuted: boolean
}

interface ParticipantsPanelProps {
    isOpen: boolean
    onClose: () => void
    participants: Participant[]
}

export function ParticipantsPanel({
    isOpen,
    onClose,
    participants,
}: ParticipantsPanelProps) {
    if (!isOpen) return null

    return (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-gray-900">
                    Participants ({participants.length})
                </h2>
                <button
                    onClick={() => {
                        console.log('Participants panel closed')
                        onClose()
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Close participants panel"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Add participant button */}
            <div className="p-3 border-b border-gray-200">
                <button
                    onClick={() => console.log('Add participant clicked')}
                    className="w-full flex items-center justify-center gap-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                    <UserPlus className="w-5 h-5" />
                    <span>Add participants</span>
                </button>
            </div>

            {/* Participants list */}
            <div className="flex-1 overflow-y-auto">
                {participants.map((participant) => (
                    <div
                        key={participant.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                    >
                        <Image
                            src={participant.imageUrl}
                            alt={participant.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="text-gray-900 truncate">
                                {participant.name}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {participant.isMuted ? (
                                <MicOff className="w-4 h-4 text-red-600" />
                            ) : (
                                <Mic className="w-4 h-4 text-gray-600" />
                            )}
                            <button
                                onClick={() =>
                                    console.log(
                                        `More options for: ${participant.name}`
                                    )
                                }
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                aria-label="More options"
                            >
                                <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
