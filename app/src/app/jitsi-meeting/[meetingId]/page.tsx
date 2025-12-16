'use client'

import React, { useEffect, useState, useRef } from 'react'
import { JitsiMeeting } from '@jitsi/react-sdk'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { useEventPersistence } from '@/domains/meeting/hooks/useEventPersistence'
import { meetingEventEmitter } from '@/domains/meeting/services/meetingEventEmitter'
import type {
    JitsiExternalAPI,
    VideoConferenceJoinedEvent,
    VideoConferenceLeftEvent,
    ParticipantJoinedEvent,
    ParticipantLeftEvent,
    DisplayNameChangeEvent,
    ParticipantRoleChangedEvent,
    AudioMuteStatusChangedEvent,
    VideoMuteStatusChangedEvent,
    ScreenSharingStatusChangedEvent,
    ErrorOccurredEvent,
    DominantSpeakerChangedEvent,
    RaiseHandUpdatedEvent,
    ChatUpdatedEvent,
    IncomingMessageEvent,
} from '@/types/jitsi-react-sdk'

export default function JitsiMeetingPage() {
    const domain = 'localhost:8443' //'meet.jitsi'
    const params = useParams()
    const router = useRouter()
    const meetingId = (params as { meetingId?: string })?.meetingId || ''
    const { data: session } = useSession()

    const [displayName] = useState(
        () =>
            session?.user?.name ||
            `Guest-${Math.random().toString(36).slice(2, 8)}`
    )

    // Only render Jitsi after client-side mount to prevent hydration mismatch
    const [isMounted, setIsMounted] = useState(false)

    // Reference to track if meeting has started
    const meetingStartedRef = useRef(false)
    const localParticipantIdRef = useRef<string | null>(null)

    // Enable event persistence
    useEventPersistence(meetingId, {
        debug: true, // Enable debug logging
        onEventsSent: (count) => {
            console.log(
                `[JitsiMeetingPage] ${count} events persisted to database`
            )
        },
        onError: (error) => {
            console.error('[JitsiMeetingPage] Event persistence error:', error)
        },
    })

    useEffect(() => {
        if (!meetingId) {
            // If no meeting id present, redirect to create page
            router.replace('/dashboard')
        }
    }, [meetingId, router])

    useEffect(() => {
        setIsMounted(true)
    }, [])

    /**
     * Setup event listeners for Jitsi API events and emit to database
     */
    const setupEventListeners = (api: JitsiExternalAPI) => {
        // Helper to get current timestamp in ISO format
        const getISOTimestamp = () => new Date().toISOString()

        // ====================================================================
        // Meeting Events
        // ====================================================================

        // videoConferenceJoined - Meeting started
        api.addListener(
            'videoConferenceJoined',
            (event: VideoConferenceJoinedEvent) => {
                console.log('[Jitsi Event] videoConferenceJoined:', event)

                // Store local participant ID
                localParticipantIdRef.current = event.id

                // Emit meeting started event (only once)
                if (!meetingStartedRef.current) {
                    meetingStartedRef.current = true
                    meetingEventEmitter.emitMeetingStarted({
                        meetingId,
                        roomName: event.roomName || meetingId,
                        hostUserId: session?.user?.id || event.id, // Use authenticated userId or fallback to participant ID
                        title: `Meeting ${meetingId}`,
                        startedAt: getISOTimestamp(),
                    })
                }

                // Emit local participant joined
                meetingEventEmitter.emitParticipantJoined({
                    meetingId,
                    participantId: event.id,
                    userId: session?.user?.id, // Pass authenticated userId
                    displayName: event.displayName || displayName,
                    email:
                        session?.user?.email ||
                        `${displayName.replace(/\s+/g, '').toLowerCase()}@example.com`,
                    role: 'HOST', // Local participant is host
                    joinedAt: getISOTimestamp(),
                })
            }
        )

        // videoConferenceLeft - Meeting ended
        api.addListener(
            'videoConferenceLeft',
            (event: VideoConferenceLeftEvent) => {
                console.log('[Jitsi Event] videoConferenceLeft:', event)

                // Emit local participant left
                if (localParticipantIdRef.current) {
                    meetingEventEmitter.emitParticipantLeft(
                        meetingId,
                        localParticipantIdRef.current
                    )
                }

                // Emit transcribingStatusChanged(false) to complete transcript
                // This ensures transcript status changes from PROCESSING to COMPLETED
                meetingEventEmitter.emitTranscribingStatusChanged(meetingId, false)

                // Emit meeting ended
                meetingEventEmitter.emitMeetingEnded(meetingId)
            }
        )

        // readyToClose - Final cleanup
        api.addListener('readyToClose', () => {
            console.log('[Jitsi Event] readyToClose')
            // Navigate to dashboard after meeting closes
            router.push('/dashboard')
        })

        // ====================================================================
        // Participant Events
        // ====================================================================

        // participantJoined - Remote participant joined
        // Note: This event fires for ALL participants, including local user
        // We skip local user since we already emit their join in videoConferenceJoined
        api.addListener(
            'participantJoined',
            (event: ParticipantJoinedEvent) => {
                console.log('[Jitsi Event] participantJoined:', event)
                
                // Skip local participant to avoid duplication
                if (event.id === localParticipantIdRef.current) {
                    console.log('[Jitsi Event] Skipping local participant join (already emitted)')
                    return
                }

                meetingEventEmitter.emitParticipantJoined({
                    meetingId,
                    participantId: event.id,
                    userId: undefined, // Remote participants userId not available in iframe
                    displayName: event.displayName || 'Guest',
                    role: 'PARTICIPANT',
                    joinedAt: getISOTimestamp(),
                })
            }
        )

        // participantLeft - Remote participant left
        api.addListener('participantLeft', (event: ParticipantLeftEvent) => {
            console.log('[Jitsi Event] participantLeft:', event)
            meetingEventEmitter.emitParticipantLeft(meetingId, event.id)
        })

        // displayNameChange - Participant updated display name
        api.addListener(
            'displayNameChange',
            (event: DisplayNameChangeEvent) => {
                console.log('[Jitsi Event] displayNameChange:', event)
                meetingEventEmitter.emitParticipantUpdated({
                    meetingId,
                    participantId: event.id,
                    displayName: event.displayname,
                })
            }
        )

        // participantRoleChanged - Participant role changed
        api.addListener(
            'participantRoleChanged',
            (event: ParticipantRoleChangedEvent) => {
                console.log('[Jitsi Event] participantRoleChanged:', event)
                // Note: emitParticipantUpdated doesn't support role updates
                // Role changes should be handled through participant records directly
                meetingEventEmitter.emitParticipantUpdated({
                    meetingId,
                    participantId: event.id,
                })
            }
        )

        // ====================================================================
        // Track Events
        // ====================================================================

        // audioMuteStatusChanged - Audio track status
        api.addListener(
            'audioMuteStatusChanged',
            (event: AudioMuteStatusChangedEvent) => {
                console.log('[Jitsi Event] audioMuteStatusChanged:', event)
                // Note: Jitsi doesn't provide track add/remove events directly
                // These are handled internally by the Jitsi UI
            }
        )

        // videoMuteStatusChanged - Video track status
        api.addListener(
            'videoMuteStatusChanged',
            (event: VideoMuteStatusChangedEvent) => {
                console.log('[Jitsi Event] videoMuteStatusChanged:', event)
                // Note: Jitsi doesn't provide track add/remove events directly
            }
        )

        // screenSharingStatusChanged - Screen sharing track
        api.addListener(
            'screenSharingStatusChanged',
            (event: ScreenSharingStatusChangedEvent) => {
                console.log('[Jitsi Event] screenSharingStatusChanged:', event)

                if (localParticipantIdRef.current) {
                    const trackId = `screen-${localParticipantIdRef.current}`
                    if (event.on) {
                        // Screen sharing started
                        meetingEventEmitter.emitTrackAdded({
                            meetingId,
                            participantId: localParticipantIdRef.current,
                            trackId,
                            kind: 'video',
                            createdAt: getISOTimestamp(),
                        })
                    } else {
                        // Screen sharing stopped
                        meetingEventEmitter.emitTrackRemoved(
                            meetingId,
                            localParticipantIdRef.current,
                            trackId
                        )
                    }
                }
            }
        )

        // ====================================================================
        // Additional Events (for logging/debugging)
        // ====================================================================

        // errorOccurred
        api.addListener('errorOccurred', (event: ErrorOccurredEvent) => {
            console.error('[Jitsi Event] errorOccurred:', event)
        })

        // dominantSpeakerChanged
        api.addListener(
            'dominantSpeakerChanged',
            (event: DominantSpeakerChangedEvent) => {
                console.log('[Jitsi Event] dominantSpeakerChanged:', event)
            }
        )

        // raiseHandUpdated
        api.addListener('raiseHandUpdated', (event: RaiseHandUpdatedEvent) => {
            console.log('[Jitsi Event] raiseHandUpdated:', event)
        })

        // chatUpdated
        api.addListener('chatUpdated', (event: ChatUpdatedEvent) => {
            console.log('[Jitsi Event] chatUpdated:', event)
        })

        // incomingMessage
        api.addListener('incomingMessage', (event: IncomingMessageEvent) => {
            console.log('[Jitsi Event] incomingMessage:', event)
        })

        // ====================================================================
        // Transcription Events (for transcript persistence)
        // ====================================================================

        // transcribingStatusChanged - Transcription started/stopped
        api.addListener(
            'transcribingStatusChanged',
            (event: { on: boolean }) => {
                console.log('[Jitsi Event] transcribingStatusChanged:', event)
                meetingEventEmitter.emitTranscribingStatusChanged(
                    meetingId,
                    event.on
                )
            }
        )

        // transcriptionChunkReceived - New transcription chunk
        api.addListener(
            'transcriptionChunkReceived',
            (rawEvent: {
                data?: {
                    language?: string
                    messageID?: string
                    participant?: { id?: string; name?: string } | null
                    final?: string
                    stable?: string
                    unstable?: string
                }
                // Also handle direct properties for API compatibility
                language?: string
                messageID?: string
                participant?: { id?: string; name?: string } | null
                final?: string
                stable?: string
                unstable?: string
            }) => {
                console.log('[Jitsi Event] transcriptionChunkReceived:', rawEvent)

                // Jitsi wraps the event data in a 'data' property - unwrap it
                const event = rawEvent.data || rawEvent

                // Guard: validate participant exists
                const participant = event.participant ?? null
                if (!participant?.id) {
                    console.warn(
                        '[Jitsi] Transcript chunk without participant, using SYSTEM'
                    )
                }

                // Only emit if there's meaningful text
                const text = event.final || event.stable
                if (!text?.trim()) return

                // Determine userId: only local participant has authenticated userId
                // For remote participants, userId is unknown (they may or may not be logged in)
                const isLocalParticipant = participant?.id === localParticipantIdRef.current
                const speakerUserId = isLocalParticipant ? session?.user?.id : undefined

                meetingEventEmitter.emitTranscriptionChunkReceived(
                    meetingId,
                    event.language || 'vi-VN',
                    event.messageID || `msg-${Date.now()}`,
                    {
                        id: participant?.id || 'SYSTEM',
                        displayName: participant?.name || 'System',
                        userId: speakerUserId, // Only set for authenticated local participant
                    },
                    event.final || '',
                    event.stable || '',
                    event.unstable || ''
                )
            }
        )

        // recordingStatusChanged - Recording started/stopped
        api.addListener(
            'recordingStatusChanged',
            (event: {
                on: boolean
                mode: string
                error?: string
                transcription: boolean
            }) => {
                console.log('[Jitsi Event] recordingStatusChanged:', event)
                meetingEventEmitter.emitRecordingStatusChanged(
                    meetingId,
                    event.on,
                    event.mode,
                    event.transcription,
                    event.error
                )
            }
        )
    }

    if (!isMounted) {
        return (
            <div
                style={{ height: '100vh', width: '100%' }}
                className="text-black flex items-center justify-center"
            >
                <p>Loading meeting...</p>
            </div>
        )
    }

    return (
        <div style={{ height: '100vh', width: '100%' }} className="text-black">
            <JitsiMeeting
                domain={domain}
                roomName={meetingId}
                configOverwrite={{
                    startWithAudioMuted: false,
                    disableModeratorIndicator: false,
                    startScreenSharing: false,
                    enableEmailInStats: false,
                }}
                interfaceConfigOverwrite={{
                    DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
                }}
                userInfo={{
                    email: `${displayName.replace(/\s+/g, '').toLowerCase()}@example.com`,
                    displayName: displayName,
                }}
                onApiReady={(externalApi) => {
                    console.log('Jitsi Meet API ready')
                    // Setup all event listeners for database persistence
                    setupEventListeners(
                        externalApi as unknown as JitsiExternalAPI
                    )
                }}
                getIFrameRef={(iframeRef) => {
                    if (iframeRef) {
                        iframeRef.style.height = '100vh'
                        iframeRef.style.width = '100%'
                    }
                }}
            />
        </div>
    )
}
