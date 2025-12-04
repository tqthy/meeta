'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJitsiConnection } from '@/hooks/useJitsiConnection'
import { useParticipantsManager } from '@/hooks/useParticipantsManager'
import { useAppSelector, useAppDispatch } from '@/store'
import { setMicEnabled, setCameraEnabled } from '@/store/slices/mediaSlice'
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
    const dispatch = useAppDispatch()
    const roomName = params.id as string

    // UI States
    const [userName, setUserName] = useState('')
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const [room, setRoom] = useState<any | null>(null)
    const [showParticipants, setShowParticipants] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showGridLayout, setShowGridLayout] = useState(false)
    const [currentLayout, setCurrentLayout] = useState<LayoutType>('grid')
    const [messagesList] = useState(messages)

    // Media state from Redux
    const { localTracks, micEnabled, cameraEnabled } = useAppSelector(
        (state) => state.media
    )

    const [cameraActive, setCameraActive] = useState<boolean>(cameraEnabled)

    // Initialize user preferences
    useEffect(() => {
        const storedUserName = sessionStorage.getItem('userName') || 'Guest'
        const storedCameraEnabled =
            sessionStorage.getItem('cameraEnabled') === 'true'
        const storedMicEnabled = sessionStorage.getItem('micEnabled') === 'true'

        setUserName(storedUserName)
        dispatch(setCameraEnabled(storedCameraEnabled))
        dispatch(setMicEnabled(storedMicEnabled))
    }, [dispatch])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            sessionStorage.removeItem('cameraPermission')
            sessionStorage.removeItem('micPermission')
        }
    }, [])

    // Jitsi connection
    const { isConnected, isJoined, disconnect } = useJitsiConnection({
        roomName: roomName || '',
        userName,
        cameraEnabled,
        micEnabled,
        onConferenceJoined: useCallback((roomObj: any) => {
            console.log('[Room] Joined conference')
            setRoom(roomObj)
        }, []),
        onConferenceLeft: useCallback(() => {
            console.log('[Room] Left conference')
            router.push('/dashboard/meetings')
        }, [router]),
        onConferenceFailed: useCallback(
            (error: Error) => {
                console.error('[Room] Conference failed:', error)
                alert('Failed to join meeting: ' + error.message)
                router.push('/dashboard/meetings')
            },
            [router]
        ),
    })

    // Participants management
    const { allParticipants } = useParticipantsManager({
        room,
        userName,
        localTracks,
    })

    // Media control handlers
    const handleToggleMic = useCallback(() => {
        const newState = !micEnabled
        dispatch(setMicEnabled(newState))
        sessionStorage.setItem('micEnabled', String(newState))
    }, [micEnabled, dispatch])

    const handleToggleCamera = useCallback(() => {
        const newState = !cameraEnabled
        dispatch(setCameraEnabled(newState))
        sessionStorage.setItem('cameraEnabled', String(newState))
        setCameraActive(newState)
    }, [cameraEnabled, dispatch])

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
                            audioTrack={mainParticipant.audioTrack}
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
                                    audioTrack={participant.audioTrack}
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
                            audioTrack={mainParticipant.audioTrack}
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
                                        audioTrack={participant.audioTrack}
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
                        audioTrack={participant.audioTrack}
                    />
                ))}
            </div>
        )
    }, [allParticipants, currentLayout])

    // Loading state
    if (!isJoined) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-center">
                    <div className="text-white mb-4">
                        <p className="text-2xl font-bold mb-2">
                            {isConnected
                                ? 'Joining meeting...'
                                : 'Connecting...'}
                        </p>
                        <p className="text-gray-400">
                            Please wait while we set up your conference
                        </p>
                    </div>
                </div>
            </div>
        )
    }

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
