/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ControlBar } from './components/control-panel'
import { ParticipantsPanel } from './components/participant-panel'
import { ChatPanel } from './components/chat-panel'
import { SettingsMenu } from './components/settings-menu'
import { GridLayoutSelector } from './components/grid-layout-selector'
import { VideoTile } from './components/video-tile'
import { messages } from './mockData'

type LayoutType = 'auto' | 'grid' | 'sidebar' | 'spotlight'

export default function RoomPage() {
    const params = useParams()
    const router = useRouter()
    const roomName = params.id as string

    // UI States
    const [showParticipants, setShowParticipants] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showGridLayout, setShowGridLayout] = useState(false)
    const [currentLayout, setCurrentLayout] = useState<LayoutType>('grid')
    const [messagesList] = useState(messages)

    // Media state - default values
    const micEnabled = false
    const cameraEnabled = false
    const [cameraActive, setCameraActive] = useState<boolean>(cameraEnabled)

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
        setCameraActive(newState)
    }, [cameraEnabled])

    const handleLeave = useCallback(async () => {
        await disconnect()
    }, [disconnect])

    const handleLayoutChange = useCallback((layout: LayoutType) => {
        setCurrentLayout(layout)
    }, [])

    // Render video grid based on layout
    const renderVideoGrid = useCallback(() => {
        if (allParticipants.length === 0) {
            return (
                <div className="flex items-center justify-center h-full text-gray-400">
                    <p>Waiting for participants...</p>
                </div>
            )
        }

        // Spotlight layout
        if (currentLayout === 'spotlight') {
            const mainParticipant = allParticipants[0]
            const sidebarParticipants = allParticipants.slice(1)

            return (
                <div className="w-full h-full flex flex-col">
                    <div className="flex-1 mb-4">
                        <VideoTile
                            name={mainParticipant.displayName}
                            isMuted={mainParticipant.isMuted}
                            isLocalParticipant={
                                mainParticipant.isLocalParticipant
                            }
                            videoTrack={mainParticipant.videoTrack}
                        />
                    </div>
                    {sidebarParticipants.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 h-24">
                            {sidebarParticipants.map((participant) => (
                                <VideoTile
                                    key={participant.id}
                                    name={participant.displayName}
                                    isMuted={participant.isMuted}
                                    isLocalParticipant={
                                        participant.isLocalParticipant
                                    }
                                    videoTrack={participant.videoTrack}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )
        }

        // Sidebar layout
        if (currentLayout === 'sidebar') {
            const mainParticipant = allParticipants[0]
            const sidebarParticipants = allParticipants.slice(1)

            return (
                <div className="flex gap-4 h-full">
                    <div className="flex-1">
                        <VideoTile
                            name={mainParticipant.displayName}
                            isMuted={mainParticipant.isMuted}
                            isLocalParticipant={
                                mainParticipant.isLocalParticipant
                            }
                            videoTrack={mainParticipant.videoTrack}
                        />
                    </div>
                    {sidebarParticipants.length > 0 && (
                        <div className="w-64 flex flex-col gap-2 overflow-y-auto">
                            {sidebarParticipants.map((participant) => (
                                <div key={participant.id} className="h-40">
                                    <VideoTile
                                        name={participant.displayName}
                                        isMuted={participant.isMuted}
                                        isLocalParticipant={
                                            participant.isLocalParticipant
                                        }
                                        videoTrack={participant.videoTrack}
                                    />
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
                {allParticipants.map((participant) => (
                    <VideoTile
                        key={participant.id}
                        name={participant.displayName}
                        isMuted={participant.isMuted}
                        isLocalParticipant={participant.isLocalParticipant}
                        videoTrack={participant.videoTrack}
                    />
                ))}
            </div>
        )
    }, [allParticipants, currentLayout, cameraActive])

    return (
        <div className="flex h-screen bg-gray-900">
            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Video grid */}
                <div className="flex-1 p-4 pb-32">{renderVideoGrid()}</div>

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
                    roomName={roomName}
                />
            </div>

            {/* Side panels */}
            <ParticipantsPanel
                isOpen={showParticipants}
                onClose={() => setShowParticipants(false)}
                participants={allParticipants.map((p) => ({
                    id: p.id,
                    name: p.displayName,
                    isMuted: p.isMuted,
                    imageUrl: '',
                }))}
            />

            <ChatPanel
                messages={messagesList}
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
