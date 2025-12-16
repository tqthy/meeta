/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    ControlBar,
    ParticipantGrid,
    ChatPanel,
    SettingsMenu,
    GridLayoutSelector,
    MeetingContainer,
} from '@/components/meeting'
import {
    useMeeting,
    useLocalTracks,
    useRemoteTracks,
    useEventPersistence,
} from '@/domains/meeting/hooks'
import { useMeetingDetails } from '@/domains/meeting/hooks/useFetchingMeeting'
import { trackService } from '@/domains/meeting/services'
import { useSession } from '@/lib/auth-client'

type LayoutType = 'auto' | 'grid' | 'sidebar' | 'spotlight'

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

    // User settings
    const [userName, setUserName] = useState<string>('Guest')
    const [initialMicEnabled, setInitialMicEnabled] = useState(false)
    const [initialCameraEnabled, setInitialCameraEnabled] = useState(false)
    const [hasInitialized, setHasInitialized] = useState(false)

    // Auth session
    const { data: session } = useSession()
    const userId = session?.user?.id

    // Meeting hooks
    const meeting = useMeeting()
    const localTracks = useLocalTracks()
    const remoteTracks = useRemoteTracks()

    // Fetch meeting details to get the actual roomName
    const { meeting: meetingData, isLoading: isMeetingLoading } = useMeetingDetails(meetingId)
    const roomName = meetingData?.roomName || meetingId

    // Event persistence
    const { flushEvents } = useEventPersistence(meetingId, {
        debug: process.env.NODE_ENV === 'development',
        onEventsSent: (count) => {
            console.log(`[MeetingPage] ${count} events persisted`)
        },
        onError: (error) => {
            console.error('[MeetingPage] Event persistence error:', error)
        },
    })

    // Load settings from session storage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUserName = sessionStorage.getItem('userName')
            const storedMicEnabled =
                sessionStorage.getItem('micEnabled') === 'true'
            const storedCameraEnabled =
                sessionStorage.getItem('cameraEnabled') === 'true'

            if (storedUserName) setUserName(storedUserName)
            setInitialMicEnabled(storedMicEnabled)
            setInitialCameraEnabled(storedCameraEnabled)
            setHasInitialized(true)
        }
    }, [])

    // Join meeting when ready
    useEffect(() => {
        if (
            hasInitialized &&
            meetingId &&
            roomName &&
            !isMeetingLoading &&
            userName &&
            !meeting.isConnected &&
            !meeting.isConnecting
        ) {
            console.log('[MeetingPage] 🚀 Joining meeting:', meetingId, 'with roomName:', roomName)
            meeting.joinMeeting(
                meetingId,
                userName,
                roomName, // Use roomName from database
                userId,
                undefined,
                undefined
            )
        }
    }, [
        hasInitialized,
        meetingId,
        roomName,
        isMeetingLoading,
        userName,
        userId,
        meeting,
        meeting.isConnected,
        meeting.isConnecting,
        meeting.joinMeeting,
    ])

    // Enable tracks after joining
    useEffect(() => {
        if (meeting.isJoined) {
            if (initialMicEnabled && !localTracks.isAudioEnabled) {
                localTracks.enableAudio()
            }
            if (initialCameraEnabled && !localTracks.isVideoEnabled) {
                localTracks.enableVideo()
            }
        }
    }, [
        meeting,
        localTracks,
        meeting.isJoined,
        initialMicEnabled,
        initialCameraEnabled,
        localTracks.isAudioEnabled,
        localTracks.isVideoEnabled,
        localTracks.enableAudio,
        localTracks.enableVideo,
    ])

    // IMPROVED CLEANUP: Properly handle component unmount
    useEffect(() => {
        // Cleanup function runs when component unmounts
        return () => {
            console.log(
                '[MeetingPage] 🧹 Component unmounting - leaving meeting'
            )

            // Leave meeting (this should handle all cleanup internally)
            meeting.leaveMeeting().catch((err) => {
                console.error('[MeetingPage] Error leaving meeting:', err)
            })

            // Flush any pending events
            if (userId) {
                flushEvents().catch((err) => {
                    console.error('[MeetingPage] Error flushing events:', err)
                })
            }
        }
    }, [meeting.leaveMeeting, meeting, flushEvents, userId])

    // Handle page close/refresh (optional - for user confirmation)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Only show confirmation if user is in an active meeting
            if (meeting.isJoined) {
                e.preventDefault()
                e.returnValue = '' // Modern browsers show generic message
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () =>
            window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [meeting.isJoined])

    // Media control handlers
    const handleToggleMic = useCallback(async () => {
        if (localTracks.isAudioEnabled) {
            await localTracks.disableAudio()
        } else {
            await localTracks.enableAudio()
        }
    }, [localTracks])

    const handleToggleCamera = useCallback(async () => {
        if (localTracks.isVideoEnabled) {
            await localTracks.disableVideo()
        } else {
            await localTracks.enableVideo()
        }
    }, [localTracks])

    const handleLeave = useCallback(async () => {
        console.log('[MeetingPage] 🚪 Leave button clicked')

        try {
            // Flush events before leaving
            if (userId) {
                await flushEvents()
            }

            // Leave meeting
            await meeting.leaveMeeting()

            // Navigate away
            router.push('/dashboard')
        } catch (error) {
            console.error('[MeetingPage] Error during leave:', error)
            // Navigate anyway to avoid stuck state
            router.push('/dashboard')
        }
    }, [meeting, router, flushEvents, userId])

    const handleLayoutChange = useCallback((layout: LayoutType) => {
        setCurrentLayout(layout)
    }, [])

    // Build participants list
    const allParticipants = useMemo(() => {
        const participantList: any[] = []

        console.log('[MeetingPage] 🔄 Building participants list:', {
            totalParticipants: meeting.participantList.length,
            tracksByParticipant: Object.keys(remoteTracks.tracksByParticipant)
                .length,
        })

        for (const participant of meeting.participantList) {
            let videoTrackObj: any = null
            let audioTrackObj: any = null

            if (participant.isLocal) {
                videoTrackObj = localTracks.getVideoTrack()
            } else {
                const remoteParticipantTracks =
                    remoteTracks.tracksByParticipant[participant.id]

                if (remoteParticipantTracks) {
                    if (remoteParticipantTracks.video) {
                        videoTrackObj = trackService.getRemoteTrack(
                            remoteParticipantTracks.video.id
                        )
                    }
                    if (remoteParticipantTracks.audio) {
                        audioTrackObj = trackService.getRemoteTrack(
                            remoteParticipantTracks.audio.id
                        )
                    }
                }
            }

            participantList.push({
                id: participant.id,
                displayName: participant.displayName,
                isLocal: participant.isLocal,
                isAudioMuted: participant.isLocal
                    ? !localTracks.isAudioEnabled
                    : participant.isAudioMuted,
                isVideoMuted: participant.isLocal
                    ? !localTracks.isVideoEnabled
                    : participant.isVideoMuted,
                isDominantSpeaker: participant.isDominantSpeaker,
                videoTrack: videoTrackObj,
                audioTrack: audioTrackObj,
                imageUrl: participant.imageUrl,
            })
        }

        // Sort: local participant first
        return participantList.sort((a, b) => {
            if (a.isLocal) return -1
            if (b.isLocal) return 1
            return 0
        })
    }, [meeting.participantList, localTracks, remoteTracks.tracksByParticipant])

    const isLoading =
        meeting.isConnecting ||
        meeting.connectionStatus === 'connecting' ||
        meeting.conferenceStatus === 'joining'

    return (
        <div className="flex h-screen bg-gray-900">
            <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4 pb-32">
                    <MeetingContainer
                        participants={allParticipants}
                        currentLayout={currentLayout}
                        isLoading={isLoading}
                        dominantSpeakerId={meeting.dominantSpeakerId}
                    />
                </div>

                {meeting.error && (
                    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                        {meeting.error.message}
                    </div>
                )}

                <ControlBar
                    onShowParticipants={() => setShowParticipants(true)}
                    onShowChat={() => setShowChat(true)}
                    onShowSettings={() => setShowSettings(true)}
                    onShowGridLayout={() => setShowGridLayout(true)}
                    isMicOn={localTracks.isAudioEnabled}
                    isVideoOn={localTracks.isVideoEnabled}
                    onToggleMic={handleToggleMic}
                    onToggleVideo={handleToggleCamera}
                    onLeaveCall={handleLeave}
                    roomName={meetingId}
                />
            </div>

            <ParticipantGrid
                isOpen={showParticipants}
                onClose={() => setShowParticipants(false)}
                participants={allParticipants.map((p) => ({
                    id: p.id,
                    name: p.displayName,
                    isMuted: p.isAudioMuted,
                    imageUrl: p.imageUrl || '',
                }))}
            />

            <ChatPanel
                messages={mockMessages}
                isOpen={showChat}
                onClose={() => setShowChat(false)}
            />

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
