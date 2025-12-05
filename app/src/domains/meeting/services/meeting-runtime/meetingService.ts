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
}

// Store connection and conference instances (not serializable, kept outside Redux)
let connection: any = null
let conference: any = null
let eventHandlers: MeetingEventHandlers = {}
let localDisplayName: string = 'You'

/**
 * Extracts serializable participant data from JitsiParticipant
 */
function extractParticipantData(
    jitsiParticipant: any,
    isLocal: boolean = false
): Participant {
    return {
        id: jitsiParticipant.getId(),
        displayName: jitsiParticipant.getDisplayName() || 'Guest',
        isLocal,
        role: jitsiParticipant.isModerator() ? 'moderator' : 'participant',
        isAudioMuted: jitsiParticipant.isAudioMuted?.() ?? true,
        isVideoMuted: jitsiParticipant.isVideoMuted?.() ?? true,
        isSpeaking: false,
        isDominantSpeaker: false,
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
 */
async function joinConference(
    roomName: string,
    displayName: string
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
 */
async function addTrack(track: any): Promise<void> {
    if (conference) {
        const trackType = track.getType?.()
        const localTracks = conference.getLocalTracks() || []
        const existingTrack = localTracks.find(
            (t: any) => t.getType?.() === trackType
        )

        if (existingTrack) {
            // Replace the existing track instead of adding a new one
            await conference.replaceTrack(existingTrack, track)
        } else {
            await conference.addTrack(track)
        }
    }
}

/**
 * Removes a local track from the conference
 */
async function removeTrack(track: any): Promise<void> {
    if (conference) {
        await conference.removeTrack(track)
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
}
