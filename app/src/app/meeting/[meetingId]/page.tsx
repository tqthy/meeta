/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    ControlBar,
    ParticipantGrid,
    ChatPanel,
    SettingsMenu,
    GridLayoutSelector,
    MeetingContainer,
} from '@/components/meeting'

type LayoutType = 'auto' | 'grid' | 'sidebar' | 'spotlight'

// TODO: Replace with actual messages data
const mockMessages: any[] = []

export default function MeetingPage() {
    const params = useParams()
    const router = useRouter()
    const meetingId = params.meetingId as string

    // UI States
    const [showParticipants, setShowParticipants] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showGridLayout, setShowGridLayout] = useState(false)
    const [currentLayout, setCurrentLayout] = useState<LayoutType>('grid')

    // Media state - default values
    const micEnabled = false
    const cameraEnabled = false

    // Placeholder for connection state
    const disconnect = useCallback(async () => {
        router.push('/dashboard/meetings')
    }, [router])

    // Placeholder for participants
    const allParticipants: any[] = []

    // Media control handlers
    const handleToggleMic = useCallback(() => {
        const newState = !micEnabled
        sessionStorage.setItem('micEnabled', String(newState))
    }, [micEnabled])

    const handleToggleCamera = useCallback(() => {
        const newState = !cameraEnabled
        sessionStorage.setItem('cameraEnabled', String(newState))
    }, [cameraEnabled])

    const handleLeave = useCallback(async () => {
        await disconnect()
    }, [disconnect])

    const handleLayoutChange = useCallback((layout: LayoutType) => {
        setCurrentLayout(layout)
    }, [])

    return (
        <div className="flex h-screen bg-gray-900">
            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Video grid */}
                <div className="flex-1 p-4 pb-32">
                    <MeetingContainer
                        participants={allParticipants}
                        currentLayout={currentLayout}
                    />
                </div>

                {/* Control bar */}
                <ControlBar
                    onShowParticipants={() => setShowParticipants(true)}
                    onShowChat={() => setShowChat(true)}
                    onShowSettings={() => setShowSettings(true)}
                    onShowGridLayout={() => setShowGridLayout(true)}
                    isMicOn={micEnabled}
                    isVideoOn={cameraEnabled}
                    onToggleMic={handleToggleMic}
                    onToggleVideo={handleToggleCamera}
                    onLeaveCall={handleLeave}
                    roomName={meetingId}
                />
            </div>

            {/* Side panels */}
            <ParticipantGrid
                isOpen={showParticipants}
                onClose={() => setShowParticipants(false)}
                participants={allParticipants.map((p) => ({
                    id: p.id,
                    name: p.displayName,
                    isMuted: p.isMuted,
                    imageUrl: p.imageUrl || '',
                }))}
            />

            <ChatPanel
                messages={mockMessages}
                isOpen={showChat}
                onClose={() => setShowChat(false)}
            />

            {/* Modals */}
            <SettingsMenu
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />

            <GridLayoutSelector
                isOpen={showGridLayout}
                onClose={() => setShowGridLayout(false)}
                currentLayout={currentLayout}
                onLayoutChange={handleLayoutChange}
            />
        </div>
    )
}
