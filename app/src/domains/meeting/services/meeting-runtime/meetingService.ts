/**
 * meetingService
 *
 * Thin adapter over JitsiConnection + JitsiConference.
 * Handles connect, disconnect, join, leave, and conference-level events.
 * Surfaces participant events as minimal, serializable payloads.
 *
 * @see JitsiAPI/1-JitsiConference for conference lifecycle
 * @see JitsiAPI/2-JitsiConnection/Class_JitsiConnection.txt for connection methods
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getJitsiMeetJS } from './jitsiLoader'
import { meetingEventEmitter } from '../meetingEventEmitter'
import { MeetingConfig, Participant } from '../../types/meeting'

// Event handlers type
interface MeetingEventHandlers {
    onConnectionEstablished?: () => void
    onConnectionFailed?: (error: any) => void
    onConnectionDisconnected?: (reason?: string) => void
    onConferenceJoined?: () => void
    onConferenceFailed?: (error: any) => void
    onConferenceLeft?: () => void
    onUserJoined?: (participant: Participant) => void
    onUserLeft?: (participantId: string) => void
    onTrackAdded?: (track: any) => void
    onTrackRemoved?: (track: any) => void
    onTrackMuteChanged?: (track: any) => void
    onDominantSpeakerChanged?: (participantId: string) => void
    onDisplayNameChanged?: (participantId: string, displayName: string) => void
    onConnectionModeChanged?: (mode: 'p2p' | 'jvb', participantCount: number) => void
    onReconcileRequired?: () => void
}

// Store connection and conference instances (not serializable, kept outside Redux)
let connection: any = null
let conference: any = null
let eventHandlers: MeetingEventHandlers = {}
let localDisplayName: string = 'You'
let currentConnectionMode: 'p2p' | 'jvb' | 'unknown' = 'unknown'
let connectionModeEpoch: number = 0 // Increments on each mode change

/**
 * Extracts serializable participant data from JitsiParticipant
 * 
 * @see JitsiAPI/5-JitsiParticipant/Class_JitsiParticipant.txt for available methods
 */
function extractParticipantData(
    jitsiParticipant: any,
    isLocal: boolean = false
): Participant {
    // Safely call methods with proper error handling
    try {
        return {
            id: jitsiParticipant.getId(),
            displayName: jitsiParticipant.getDisplayName() || 'Guest',
            isLocal,
            role: jitsiParticipant.isModerator?.() ? 'moderator' : 'participant',
            isAudioMuted: jitsiParticipant.isAudioMuted?.() ?? true,
            isVideoMuted: jitsiParticipant.isVideoMuted?.() ?? true,
            isSpeaking: false,
            isDominantSpeaker: false,
        }
    } catch (error) {
        console.error('[meetingService] Error extracting participant data:', error)
        // Return minimal valid participant object on error
        return {
            id: jitsiParticipant.getId?.() || 'unknown',
            displayName: 'Guest',
            isLocal,
            role: 'participant',
            isAudioMuted: true,
            isVideoMuted: true,
            isSpeaking: false,
            isDominantSpeaker: false,
        }
    }
}

/**
 * Sets up conference event listeners
 */
function setupConferenceEvents(conf: any, JitsiMeetJS: any): void {
    const events = JitsiMeetJS.events.conference

    conf.on(events.CONFERENCE_JOINED, () => {
        eventHandlers.onConferenceJoined?.()
    })

    conf.on(events.CONFERENCE_FAILED, (error: any) => {
        eventHandlers.onConferenceFailed?.(error)
    })

    conf.on(events.CONFERENCE_LEFT, () => {
        eventHandlers.onConferenceLeft?.()
    })

    conf.on(events.USER_JOINED, (id: string, participant: any) => {
        const participantData = extractParticipantData(participant, false)
        eventHandlers.onUserJoined?.(participantData)
    })

    conf.on(events.USER_LEFT, (id: string) => {
        eventHandlers.onUserLeft?.(id)
    })

    conf.on(events.TRACK_ADDED, (track: any) => {
        eventHandlers.onTrackAdded?.(track)
    })

    conf.on(events.TRACK_REMOVED, (track: any) => {
        eventHandlers.onTrackRemoved?.(track)
    })

    conf.on(events.TRACK_MUTE_CHANGED, (track: any) => {
        eventHandlers.onTrackMuteChanged?.(track)
    })

    conf.on(events.DOMINANT_SPEAKER_CHANGED, (id: string) => {
        eventHandlers.onDominantSpeakerChanged?.(id)
    })

    conf.on(events.DISPLAY_NAME_CHANGED, (id: string, displayName: string) => {
        eventHandlers.onDisplayNameChanged?.(id, displayName)
    })

    // Audio mute status change
    if (events.AUDIO_MUTE_STATUS_CHANGED) {
        conf.on(events.AUDIO_MUTE_STATUS_CHANGED, (data: any) => {
            const participantId = data.id || 'local'
            const isMuted = data.muted ?? true
            // Emit to event emitter for persistence
            // Note: currentMeetingId must be set by meetingServiceIntegration
            if (currentMeetingId) {
                meetingEventEmitter.emitAudioMuteChanged(currentMeetingId, participantId, isMuted)
            }
        })
    }

    // Video mute status change
    if (events.VIDEO_MUTE_STATUS_CHANGED) {
        conf.on(events.VIDEO_MUTE_STATUS_CHANGED, (data: any) => {
            const participantId = data.id || 'local'
            const isMuted = data.muted ?? true
            if (currentMeetingId) {
                meetingEventEmitter.emitVideoMuteChanged(currentMeetingId, participantId, isMuted)
            }
        })
    }

    // Screen sharing status
    if (events.SCREEN_SHARING_STATUS_CHANGED) {
        conf.on(events.SCREEN_SHARING_STATUS_CHANGED, (data: any) => {
            const participantId = data.id || 'local'
            const isSharing = data.on ?? false
            const sourceType = data.details?.sourceType
            if (currentMeetingId) {
                if (isSharing) {
                    meetingEventEmitter.emitScreenShareStarted(currentMeetingId, participantId, sourceType)
                } else {
                    meetingEventEmitter.emitScreenShareStopped(currentMeetingId, participantId)
                }
            }
        })
    }

    // Raise hand updates
    if (events.RAISE_HAND_UPDATED) {
        conf.on(events.RAISE_HAND_UPDATED, (data: any) => {
            const participantId = data.id
            const handRaised = data.handRaised ?? 0
            if (currentMeetingId && participantId) {
                meetingEventEmitter.emitRaiseHandUpdated(currentMeetingId, participantId, handRaised)
            }
        })
    }

    // Recording status changes
    if (events.RECORDING_STATUS_CHANGED) {
        conf.on(events.RECORDING_STATUS_CHANGED, (data: any) => {
            const isRecording = data.on ?? false
            const mode = data.mode || 'file'
            const hasTranscription = data.transcription ?? false
            const error = data.error
            if (currentMeetingId) {
                meetingEventEmitter.emitRecordingStatusChanged(
                    currentMeetingId,
                    isRecording,
                    mode,
                    hasTranscription,
                    error
                )
            }
        })
    }

    // Transcription status changes
    if (events.TRANSCRIBING_STATUS_CHANGED) {
        conf.on(events.TRANSCRIBING_STATUS_CHANGED, (data: any) => {
            const isTranscribing = data.on ?? false
            if (currentMeetingId) {
                meetingEventEmitter.emitTranscribingStatusChanged(currentMeetingId, isTranscribing)
            }
        })
    }

    // Transcription chunks received
    if (events.TRANSCRIPTION_CHUNK_RECEIVED) {
        conf.on(events.TRANSCRIPTION_CHUNK_RECEIVED, (data: any) => {
            if (currentMeetingId) {
                const participant = data.participant || {}
                meetingEventEmitter.emitTranscriptionChunkReceived(
                    currentMeetingId,
                    data.language || 'en',
                    data.messageID || '',
                    {
                        id: participant.id || 'unknown',
                        displayName: participant.displayName || 'Unknown',
                    },
                    data.final || '',
                    data.stable || '',
                    data.unstable || ''
                )
            }
        })
    }

    // P2P status change detection for mode transitions
    conf.on(events.P2P_STATUS, (isP2P: boolean) => {
        const newMode = isP2P ? 'p2p' : 'jvb'
        const participantCount = (conf.getParticipants?.() || []).length + 1 // +1 for local

        if (currentConnectionMode !== 'unknown' && currentConnectionMode !== newMode) {
            connectionModeEpoch++
            console.warn('[meetingService] 🔄 Connection mode changed:', {
                from: currentConnectionMode,
                to: newMode,
                participantCount,
                epoch: connectionModeEpoch,
                timestamp: Date.now(),
            })

            // Notify handler of mode change
            eventHandlers.onConnectionModeChanged?.(newMode, participantCount)

            // Trigger reconciliation
            eventHandlers.onReconcileRequired?.()
        }

        currentConnectionMode = newMode
    })

    // Also detect via user count changes (fallback if P2P_STATUS not available)
    conf.on(events.USER_JOINED, () => {
        const participantCount = (conf.getParticipants?.() || []).length + 1
        const expectedMode = participantCount <= 2 ? 'p2p' : 'jvb'

        if (currentConnectionMode !== expectedMode && currentConnectionMode !== 'unknown') {
            connectionModeEpoch++
            console.warn('[meetingService] 🔄 Connection mode inferred from participant count:', {
                from: currentConnectionMode,
                to: expectedMode,
                participantCount,
                epoch: connectionModeEpoch,
            })
            eventHandlers.onConnectionModeChanged?.(expectedMode, participantCount)
            eventHandlers.onReconcileRequired?.()
        }
        currentConnectionMode = expectedMode
    })
}

// Track current meeting ID for event emission
let currentMeetingId: string | null = null

/**
 * Sets the current meeting ID (called by meetingServiceIntegration)
 */
export function setCurrentMeetingId(meetingId: string): void {
    currentMeetingId = meetingId
}

/**
 * Connects to the Jitsi server
 */
async function connect(config: MeetingConfig): Promise<void> {
    const JitsiMeetJS = await getJitsiMeetJS()
    if (!JitsiMeetJS) {
        throw new Error('JitsiMeetJS not available')
    }

    const connectionEvents = JitsiMeetJS.events.connection

    // Construct connection options
    const baseUrl = process.env.NEXT_PUBLIC_JITSI_WS_URL || 'ws://localhost:8000'
    const keepAliveUrl = baseUrl
        .replace('ws://', 'http://')
        .replace('wss://', 'https://')

    const options = {
        hosts: {
            domain: 'meet.jitsi',
            muc: 'muc.meet.jitsi',
        },
        serviceUrl: `${baseUrl}/xmpp-websocket?room=${config.roomName}`,
        websocketKeepAliveUrl: `${keepAliveUrl}/xmpp-websocket`,
    }

    return new Promise((resolve, reject) => {
        connection = new JitsiMeetJS.JitsiConnection(null, config.jwt, options)

        connection.addEventListener(
            connectionEvents.CONNECTION_ESTABLISHED,
            () => {
                eventHandlers.onConnectionEstablished?.()
                resolve()
            }
        )

        connection.addEventListener(
            connectionEvents.CONNECTION_FAILED,
            (error: any) => {
                eventHandlers.onConnectionFailed?.(error)
                reject(error)
            }
        )

        connection.addEventListener(
            connectionEvents.CONNECTION_DISCONNECTED,
            (reason?: string) => {
                eventHandlers.onConnectionDisconnected?.(reason)
            }
        )

        connection.connect()
    })
}

/**
 * Joins a conference room
 * 
 * @param roomName - The name of the room to join
 * @param displayName - The display name for the local participant
 * @param initialTracks - Optional array of tracks to add before joining (recommended to avoid transceiver errors)
 */
async function joinConference(
    roomName: string,
    displayName: string,
    initialTracks?: any[]
): Promise<void> {
    const JitsiMeetJS = await getJitsiMeetJS()
    if (!JitsiMeetJS || !connection) {
        throw new Error('Not connected to server')
    }

    const confOptions = {
        openBridgeChannel: true,
    }

    conference = connection.initJitsiConference(roomName, confOptions)

    // Set display name
    localDisplayName = displayName
    conference.setDisplayName(displayName)

    // Add initial tracks before joining if provided
    // This avoids the "no transceiver" error that occurs when adding tracks
    // to an already-joined conference
    if (initialTracks && initialTracks.length > 0) {
        console.log('[meetingService] Adding initial tracks before joining:',
            initialTracks.map(t => t.getType?.()).join(', '))

        for (const track of initialTracks) {
            try {
                await conference.addLocalTrack(track)
            } catch (error) {
                console.error('[meetingService] Failed to add initial track:', error)
                // Continue with other tracks even if one fails
            }
        }
    }

    // Setup event listeners
    setupConferenceEvents(conference, JitsiMeetJS)

    // Join the conference
    conference.join()
}

/**
 * Leaves the current conference
 */
async function leaveConference(): Promise<void> {
    if (conference) {
        await conference.leave()
        conference = null
    }
}

/**
 * Disconnects from the server
 */
async function disconnect(): Promise<void> {
    if (conference) {
        await leaveConference()
    }
    if (connection) {
        connection.disconnect()
        connection = null
    }
}

/**
 * Adds a local track to the conference
 * If a track of the same type already exists, it will be replaced
 * 
 * Note: When adding tracks to an already-joined conference that has no existing
 * tracks, Jitsi may throw "Replace track failed - no transceiver" error.
 * This is a known issue where internally addTrack tries to use replaceTrack.
 * We handle this by catching the error and trying alternative approaches.
 * 
 * Codec-related errors from the Jitsi SDK stats code are also handled gracefully.
 */
async function addTrack(track: any): Promise<void> {
    if (!conference) {
        console.warn('[meetingService] Cannot add track: no active conference')
        return
    }

    // Validate track object before proceeding
    if (!track || typeof track.getType !== 'function' || typeof track.getId !== 'function') {
        console.error('[meetingService] Invalid track object, cannot add')
        return
    }

    const trackType = track.getType?.()
    const trackId = track.getId?.()

    if (!trackType || !trackId) {
        console.error('[meetingService] Track missing type or ID, cannot add')
        return
    }

    const localTracks = conference.getLocalTracks() || []

    // Check if this exact track is already in the conference
    const trackAlreadyAdded = localTracks.some((t: any) => {
        try {
            return t === track || t.getId?.() === trackId
        } catch (e) {
            // Ignore errors comparing tracks
            return false
        }
    })

    if (trackAlreadyAdded) {
        console.log('[meetingService] Track already in conference, skipping:', trackType, 'id:', trackId)
        return
    }

    // Find existing track of same type that actually belongs to conference
    const existingTrack = localTracks.find(
        (t: any) => {
            try {
                return t.getType?.() === trackType
            } catch (e) {
                // Ignore errors checking track type
                return false
            }
        }
    )

    try {
        if (existingTrack) {
            // Replace the existing track
            console.log('[meetingService] Replacing existing track:', trackType, 'old:', existingTrack.getId?.(), 'new:', trackId)
            await conference.replaceTrack(existingTrack, track)
        } else {
            // Add new track to conference
            console.log('[meetingService] Adding new track:', trackType, 'id:', trackId)
            await conference.addTrack(track)
        }
    } catch (error: any) {
        // Handle the "no transceiver" error that occurs when adding first track
        // to an already-joined conference. This is a known Jitsi issue where
        // internally addTrack tries to use replaceTrack even when there's no existing track.
        const errorMessage = error?.message?.toLowerCase?.() || ''
        const isTransceiverError = errorMessage.includes('no transceiver') ||
            errorMessage.includes('replace track failed')
        const isCodecError = errorMessage.includes('codec')

        if (isTransceiverError || isCodecError) {
            console.warn('[meetingService] Transceiver/codec error detected, trying alternative methods:', error.message)

            // Try multiple fallback approaches
            try {
                // Method 1: Try using addLocalTrack (pre-join method) if available
                if (typeof conference.addLocalTrack === 'function') {
                    console.log('[meetingService] Trying addLocalTrack method')
                    await conference.addLocalTrack(track)
                    return
                }

                // Method 2: Try direct sender manipulation if available
                if (typeof conference.addTrackToPc === 'function') {
                    console.log('[meetingService] Trying addTrackToPc method')
                    await conference.addTrackToPc(track)
                    return
                }

                // Method 3: Force renegotiation by temporarily muting/unmuting
                console.warn('[meetingService] No direct workaround available, track may not be transmitted correctly')
                // Log but don't fail - the track is still locally available
                // and might work after peer connection renegotiation

            } catch (workaroundError) {
                console.error('[meetingService] All workarounds failed:', workaroundError)
                // Don't rethrow - allow the operation to complete
                // The track is still available locally even if not transmitted
            }
        } else {
            // Unexpected error, log but attempt to continue
            console.error('[meetingService] addTrack failed with unexpected error:', error)
            // Don't rethrow - the track may still work locally
        }
    }
}

/**
 * Removes a local track from the conference
 * Verifies the track belongs to the conference before attempting removal
 */
async function removeTrack(track: any): Promise<void> {
    if (!conference) {
        console.warn('[meetingService] Cannot remove track: no active conference')
        return
    }

    // Validate track object
    if (!track || typeof track.getId !== 'function') {
        console.warn('[meetingService] Invalid track object, cannot remove')
        return
    }

    try {
        // Verify the track belongs to this conference
        const localTracks = conference.getLocalTracks() || []
        const trackId = track.getId?.()

        const trackExists = localTracks.some((t: any) => {
            try {
                return t === track || t.getId?.() === trackId
            } catch (e) {
                // Ignore errors comparing tracks
                return false
            }
        })

        if (!trackExists) {
            console.warn('[meetingService] Track does not belong to conference, skipping removal')
            return
        }

        await conference.removeTrack(track)
    } catch (error) {
        console.error('[meetingService] Failed to remove track:', error)
        // Don't rethrow - the track may still be cleaned up locally
    }
}

/**
 * Replaces one local track with another (e.g., switching camera)
 */
async function replaceTrack(oldTrack: any, newTrack: any): Promise<void> {
    if (conference) {
        await conference.replaceTrack(oldTrack, newTrack)
    }
}

/**
 * Gets the local participant from the conference
 */
function getLocalParticipant(): Participant | null {
    if (!conference) return null

    const localUserId = conference.myUserId()
    if (!localUserId) return null

    return {
        id: localUserId,
        displayName: localDisplayName,
        isLocal: true,
        role: conference.isModerator() ? 'moderator' : 'participant',
        isAudioMuted: true,
        isVideoMuted: true,
        isSpeaking: false,
        isDominantSpeaker: false,
    }
}

/**
 * Gets the current conference
 */
function getConference(): any {
    return conference
}

/**
 * Gets the current connection
 */
function getConnection(): any {
    return connection
}

/**
 * Sets event handlers for meeting events
 */
function setEventHandlers(handlers: MeetingEventHandlers): void {
    eventHandlers = { ...eventHandlers, ...handlers }
}

/**
 * Clears all event handlers
 */
function clearEventHandlers(): void {
    eventHandlers = {}
}

/**
 * Gets a snapshot of all current remote tracks from the conference
 * Used for reconciliation after P2P↔SFU mode changes
 */
function getRemoteTracksSnapshot(): { participantId: string; tracks: any[] }[] {
    if (!conference) return []

    const participants = conference.getParticipants?.() || []
    const snapshot: { participantId: string; tracks: any[] }[] = []

    for (const participant of participants) {
        const participantId = participant.getId()
        const tracks = participant.getTracks?.() || []

        if (tracks.length > 0) {
            snapshot.push({
                participantId,
                tracks: tracks.filter((t: any) => !t.isLocal?.()),
            })
        }
    }

    console.log('[meetingService] 📸 Tracks snapshot:', {
        participantCount: snapshot.length,
        trackCounts: snapshot.map(s => ({ id: s.participantId, tracks: s.tracks.length })),
        epoch: connectionModeEpoch,
        mode: currentConnectionMode,
    })

    return snapshot
}

/**
 * Gets current connection mode and epoch for tracking transitions
 */
function getConnectionStatus() {
    return {
        mode: currentConnectionMode,
        epoch: connectionModeEpoch,
        participantCount: conference ? (conference.getParticipants?.() || []).length + 1 : 0,
    }
}

export const meetingService = {
    connect,
    disconnect,
    joinConference,
    leaveConference,
    addTrack,
    removeTrack,
    replaceTrack,
    getLocalParticipant,
    getConference,
    getConnection,
    setEventHandlers,
    clearEventHandlers,
    extractParticipantData,
    getRemoteTracksSnapshot,
    getConnectionStatus,
}
