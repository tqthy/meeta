import React from 'react'
import { Mic, MicOff } from 'lucide-react'
import Image from 'next/image'

interface VideoTileProps {
    name: string
    imageUrl: string
    isMuted?: boolean
    isActive?: boolean
}

export function VideoTile({
    name,
    imageUrl,
    isMuted = false,
    isActive = false,
}: VideoTileProps) {
    return (
        <div
            className={`relative rounded-lg overflow-hidden bg-gray-900 aspect-video group ${isActive ? 'ring-2 ring-blue-500' : ''}`}
        >
            {/* Video/Image */}
            <Image
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
            />

            {/* Gradient overlay for better text visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

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
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
    )
}
