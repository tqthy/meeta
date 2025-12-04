import React from 'react'
import Image from 'next/image'
import { VideoOff } from 'lucide-react'

interface VideoPlaceholderProps {
    name: string
    imageUrl?: string
    isVisible: boolean
}

export function VideoPlaceholder({
    name,
    imageUrl,
    isVisible,
}: VideoPlaceholderProps) {
    if (!isVisible) {
        return null
    }

    return (
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            {imageUrl ? (
                <Image
                    src={imageUrl}
                    alt={name}
                    fill
                    className="object-cover"
                />
            ) : (
                <div className="text-center">
                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-3xl font-bold text-white">
                            {name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                        <VideoOff className="w-5 h-5" />
                        <span className="text-sm">Camera off</span>
                    </div>
                </div>
            )}
        </div>
    )
}
