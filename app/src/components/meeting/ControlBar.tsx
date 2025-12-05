import React from 'react'
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Monitor,
    Phone,
    Users,
    MessageSquare,
    Grid3x3,
    Settings,
    Info,
} from 'lucide-react'

interface ControlBarProps {
    onShowParticipants: () => void
    onShowChat: () => void
    onShowSettings: () => void
    onShowGridLayout: () => void
    isMicOn: boolean
    isVideoOn: boolean
    onToggleMic: () => void
    onToggleVideo: () => void
    onLeaveCall: () => void
    roomName?: string
}

export function ControlBar({
    onShowParticipants,
    onShowChat,
    onShowSettings,
    onShowGridLayout,
    isMicOn,
    isVideoOn,
    onToggleMic,
    onToggleVideo,
    onLeaveCall,
    roomName = 'Meeting Room',
}: ControlBarProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800">
            <div className="flex items-center justify-between px-6 py-4">
                {/* Left section - Meeting info */}
                <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-gray-400" />
                    <span className="text-white">{roomName}</span>
                </div>

                {/* Center section - Main controls */}
                <div className="flex items-center gap-2">
                    {/* Microphone */}
                    <button
                        onClick={onToggleMic}
                        className={`p-4 rounded-full transition-colors ${
                            isMicOn
                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                        aria-label={
                            isMicOn ? 'Mute microphone' : 'Unmute microphone'
                        }
                    >
                        {isMicOn ? (
                            <Mic className="w-5 h-5" />
                        ) : (
                            <MicOff className="w-5 h-5" />
                        )}
                    </button>

                    {/* Video */}
                    <button
                        onClick={onToggleVideo}
                        className={`p-4 rounded-full transition-colors ${
                            isVideoOn
                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                        aria-label={
                            isVideoOn ? 'Turn off camera' : 'Turn on camera'
                        }
                    >
                        {isVideoOn ? (
                            <Video className="w-5 h-5" />
                        ) : (
                            <VideoOff className="w-5 h-5" />
                        )}
                    </button>

                    {/* Screen share */}
                    <button
                        className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                        aria-label="Share screen"
                    >
                        <Monitor className="w-5 h-5" />
                    </button>

                    {/* Grid view */}
                    <button
                        onClick={onShowGridLayout}
                        className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                        aria-label="Change layout"
                    >
                        <Grid3x3 className="w-5 h-5" />
                    </button>
                </div>

                {/* Right section - Secondary controls */}
                <div className="flex items-center gap-2">
                    {/* Participants */}
                    <button
                        onClick={onShowParticipants}
                        className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                        aria-label="Show participants"
                    >
                        <Users className="w-5 h-5" />
                    </button>

                    {/* Chat */}
                    <button
                        onClick={onShowChat}
                        className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                        aria-label="Show chat"
                    >
                        <MessageSquare className="w-5 h-5" />
                    </button>

                    {/* Settings */}
                    <button
                        onClick={onShowSettings}
                        className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                        aria-label="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    {/* Leave call */}
                    <button
                        onClick={onLeaveCall}
                        className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                        aria-label="Leave call"
                    >
                        <Phone className="w-5 h-5 rotate-[135deg]" />
                    </button>
                </div>
            </div>
        </div>
    )
}
