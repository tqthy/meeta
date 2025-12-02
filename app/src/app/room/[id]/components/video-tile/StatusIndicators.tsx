import React from 'react'
import { Mic, MicOff, VideoOff } from 'lucide-react'

interface StatusIndicatorsProps {
    isVideoMuted: boolean
    isAudioMuted: boolean
}

export function StatusIndicators({
    isVideoMuted,
    isAudioMuted,
}: StatusIndicatorsProps) {
    return (
        <div className="absolute bottom-2 right-2 flex gap-1">
            {isVideoMuted && (
                <div
                    className="p-1.5 bg-gray-700/90 rounded-full"
                    title="Camera off"
                >
                    <VideoOff className="w-4 h-4 text-white" />
                </div>
            )}

            {isAudioMuted ? (
                <div
                    className="p-1.5 bg-red-600/90 rounded-full"
                    title="Microphone off"
                >
                    <MicOff className="w-4 h-4 text-white" />
                </div>
            ) : (
                <div
                    className="p-1.5 bg-green-600/90 rounded-full"
                    title="Microphone on"
                >
                    <Mic className="w-4 h-4 text-white" />
                </div>
            )}
        </div>
    )
}
