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
import { trackService, meetingEventEmitter } from '@/domains/meeting/services'
import { useSession } from '@/lib/auth-client'

type LayoutType = 'auto' | 'grid' | 'sidebar' | 'spotlight'

// Jitsi server URL - should come from env in production

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

    // Get user settings from session storage
    const [userName, setUserName] = useState<string>('Guest')
    const [initialMicEnabled, setInitialMicEnabled] = useState(false)
    const [initialCameraEnabled, setInitialCameraEnabled] = useState(false)
    const [hasInitialized, setHasInitialized] = useState(false)

    // Auth session - get real user ID
    const { data: session } = useSession()
    const userId = session?.user?.id

    // Meeting hooks
    const meeting = useMeeting()
    const localTracks = useLocalTracks()
    const remoteTracks = useRemoteTracks()

    // Event persistence - sends meeting events to backend for storage
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

    // Destructure meeting properties for stable dependencies
    const {
        isConnected: meetingIsConnected,
        isConnecting: meetingIsConnecting,
        joinMeeting,
        isJoined: meetingIsJoined,
    } = meeting

    // Join meeting when component mounts
    useEffect(() => {
        if (
            hasInitialized &&
            meetingId &&
            userName &&
            !meetingIsConnected &&
            !meetingIsConnecting
        ) {
            joinMeeting(meetingId, userName)
        }
    }, [
        hasInitialized,
        meetingId,
        userName,
        meetingIsConnected,
        meetingIsConnecting,
        joinMeeting,
    ])

    // Emit meeting.started event when successfully joined (only if authenticated)
    useEffect(() => {
        if (meetingIsJoined && meetingId && userName && userId) {
            meetingEventEmitter.emitMeetingStarted({
                meetingId,
                roomName: meetingId,
                hostUserId: userId,
                startedAt: new Date().toISOString(),
            })

            meetingEventEmitter.emitParticipantJoined({
                participantId: `${meetingId}-${userId}`,
                userId: userId,
                meetingId,
                displayName: userName,
                role: 'HOST',
                joinedAt: new Date().toISOString(),
            })
        }
    }, [meetingIsJoined, meetingId, userName, userId])

    // Enable tracks after joining based on initial settings
    useEffect(() => {
        if (meetingIsJoined) {
            if (initialMicEnabled && !localTracks.isAudioEnabled) {
                localTracks.enableAudio()
            }
            if (initialCameraEnabled && !localTracks.isVideoEnabled) {
                localTracks.enableVideo()
            }
        }
    }, [meetingIsJoined, initialMicEnabled, initialCameraEnabled, localTracks])

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
        // Only emit events if user is authenticated
        if (userId) {
            // Emit participant left event
            meetingEventEmitter.emitParticipantLeft(
                meetingId,
                `${meetingId}-${userId}`,
                userId
            )

            // Emit meeting ended event
            meetingEventEmitter.emitMeetingEnded(meetingId)

            // Flush any pending events before leaving
            await flushEvents()
        }

        // Release all tracks first
        await localTracks.releaseAllTracks()

        // Leave the meeting
        await meeting.leaveMeeting()

        // Navigate back
        router.push('/dashboard')
    }, [localTracks, meeting, router, meetingId, flushEvents, userId])

    const handleLayoutChange = useCallback((layout: LayoutType) => {
        setCurrentLayout(layout)
    }, [])

    // Build participants list for UI
    const allParticipants = useMemo(() => {
        const participantList: any[] = []

        // Add all participants from meeting state
        for (const participant of meeting.participantList) {
            let videoTrackObj: any = null
            let audioTrackObj: any = null

            if (participant.isLocal) {
                videoTrackObj = localTracks.getVideoTrack()
                // Local audio is not attached to video element
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

        // Sort: local participant first, then by join order
        return participantList.sort((a, b) => {
            if (a.isLocal) return -1
            if (b.isLocal) return 1
            return 0
        })
    }, [meeting.participantList, localTracks, remoteTracks.tracksByParticipant])

    // Show loading state while connecting
    const isLoading =
        meeting.isConnecting ||
        meeting.connectionStatus === 'connecting' ||
        meeting.conferenceStatus === 'joining'

    return (
        <div className="flex h-screen bg-gray-900">
            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Video grid */}
                <div className="flex-1 p-4 pb-32">
                    <MeetingContainer
                        participants={allParticipants}
                        currentLayout={currentLayout}
                        isLoading={isLoading}
                        dominantSpeakerId={meeting.dominantSpeakerId}
                    />
                </div>

                {/* Error display */}
                {meeting.error && (
                    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                        {meeting.error.message}
                    </div>
                )}

                {/* Control bar */}
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

            {/* Side panels */}
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
