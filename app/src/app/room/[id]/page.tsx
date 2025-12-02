'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJitsiConnection } from '@/hooks/useJitsiConnection'
import { useParticipantsManager } from '@/hooks/useParticipantsManager'
import { useAppSelector } from '@/store'
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

    const [userName, setUserName] = useState('')
    const [cameraEnabled, setCameraEnabled] = useState(true)
    const [micEnabled, setMicEnabled] = useState(true)
    const [showParticipants, setShowParticipants] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showGridLayout, setShowGridLayout] = useState(false)
    const [currentLayout, setCurrentLayout] = useState<LayoutType>('grid')
    const [messagesList] = useState(messages)
    const [room, setRoom] = useState<any | null>(null)
    const mediaStreamRef = useRef<MediaStream | null>(null)

    // Cleanup media streams khi component bị unmount (người dùng rời khỏi phòng)
    useEffect(() => {
        const currentMediaStream = mediaStreamRef.current

        return () => {
            console.log('[RoomPage] Cleaning up media streams on unmount')
            // Ngắt kết nối tất cả media streams
            if (currentMediaStream) {
                currentMediaStream.getTracks().forEach((track) => {
                    track.stop()
                    console.log('[RoomPage] Stopped track:', track.kind)
                })
            }
            // Xóa quyền truy cập từ sessionStorage
            sessionStorage.removeItem('cameraPermission')
            sessionStorage.removeItem('micPermission')
            sessionStorage.removeItem('cameraEnabled')
            sessionStorage.removeItem('micEnabled')
        }
    }, [])

    useEffect(() => {
        const storedUserName = sessionStorage.getItem('userName') || 'Guest'
        const storedCameraEnabled =
            sessionStorage.getItem('cameraEnabled') === 'true'
        const storedMicEnabled = sessionStorage.getItem('micEnabled') === 'true'

        setUserName(storedUserName)
        setCameraEnabled(storedCameraEnabled)
        setMicEnabled(storedMicEnabled)

        console.log(
            '[RoomPage] Loaded preferences - Camera:',
            storedCameraEnabled,
            'Mic:',
            storedMicEnabled
        )
    }, [])

    const { isConnected, isJoined, disconnect } = useJitsiConnection({
        roomName: roomName || '',
        userName,
        cameraEnabled,
        micEnabled,
        onConferenceJoined: (roomObj) => {
            console.log('[Room] Joined conference:', roomObj)
            setRoom(roomObj)
        },
        onConferenceLeft: () => {
            console.log('[Room] Left conference')
            router.push('/dashboard/meetings')
        },
        onConferenceFailed: (error) => {
            console.error('[Room] Conference failed:', error)
            alert('Failed to join meeting: ' + error.message)
            router.push('/dashboard/meetings')
        },
    })

    // Get local tracks and media state from Redux
    const { localTracks, micEnabled: redisMicEnabled, cameraEnabled: redisCameraEnabled } = useAppSelector((state) => state.media)

    // Use participants manager hook
    const { allParticipants } = useParticipantsManager({
        room,
        userName,
        localTracks,
    })

    // Sync Redux state to component state when Redux changes
    useEffect(() => {
        if (redisMicEnabled !== micEnabled) {
            setMicEnabled(redisMicEnabled)
            sessionStorage.setItem('micEnabled', String(redisMicEnabled))
        }
    }, [redisMicEnabled, micEnabled])

    useEffect(() => {
        if (redisCameraEnabled !== cameraEnabled) {
            setCameraEnabled(redisCameraEnabled)
            sessionStorage.setItem('cameraEnabled', String(redisCameraEnabled))
        }
    }, [redisCameraEnabled, cameraEnabled])

    const handleToggleMic = () => {
        const newMicState = !micEnabled
        setMicEnabled(newMicState)
        sessionStorage.setItem('micEnabled', String(newMicState))
        console.log('[Room] Mic toggled to:', newMicState)
    }

    const handleToggleCamera = () => {
        const newCameraState = !cameraEnabled
        setCameraEnabled(newCameraState)
        sessionStorage.setItem('cameraEnabled', String(newCameraState))
        console.log('[Room] Camera toggled to:', newCameraState)
    }

    const handleLeave = async () => {
        await disconnect()
    }

    const handleLayoutChange = (layout: LayoutType) => {
        setCurrentLayout(layout)
    }

    const renderVideoGrid = () => {
        const gridClasses = {
            auto: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
            grid: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
            sidebar: 'grid-cols-1',
            spotlight: 'grid-cols-1',
        }

        if (currentLayout === 'spotlight' && allParticipants.length > 0) {
            return (
                <div className="w-full h-full flex flex-col">
                    {/* Main spotlight video */}
                    <div className="flex-1 mb-4">
                        <VideoTile
                            name={allParticipants[0].displayName}
                            isMuted={allParticipants[0].isMuted}
                            isActive={true}
                            isLocalParticipant={
                                allParticipants[0].isLocalParticipant
                            }
                            videoTrack={allParticipants[0].videoTrack}
                            audioTrack={allParticipants[0].audioTrack}
                        />
                    </div>
                    {/* Sidebar with other participants */}
                    <div className="grid grid-cols-4 gap-2 h-24">
                        {allParticipants.slice(1).map((participant) => (
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
                </div>
            )
        }

        if (currentLayout === 'sidebar' && allParticipants.length > 0) {
            return (
                <div className="flex gap-4 h-full">
                    {/* Main video */}
                    <div className="flex-1">
                        <VideoTile
                            name={allParticipants[0].displayName}
                            isMuted={allParticipants[0].isMuted}
                            isActive={true}
                            isLocalParticipant={
                                allParticipants[0].isLocalParticipant
                            }
                            videoTrack={allParticipants[0].videoTrack}
                            audioTrack={allParticipants[0].audioTrack}
                        />
                    </div>
                    {/* Sidebar */}
                    <div className="w-64 flex flex-col gap-2 overflow-y-auto">
                        {allParticipants.slice(1).map((participant) => (
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
                </div>
            )
        }

        return (
            <div className={`grid ${gridClasses[currentLayout]} gap-2 h-full`}>
                {allParticipants.map((participant) => (
                    <VideoTile
                        key={participant.id}
                        name={participant.displayName}
                        isMuted={participant.isMuted}
                        isActive={participant.isLocalParticipant}
                        isLocalParticipant={participant.isLocalParticipant}
                        videoTrack={participant.videoTrack}
                        audioTrack={participant.audioTrack}
                    />
                ))}
            </div>
        )
    }

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
            {/* Main content area */}
            <div className="flex-1 flex flex-col">
                {/* Video grid area */}
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

            {/* Overlay modals */}
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
