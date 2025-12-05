/**
 * Meeting Service Integration with Event Persistence
 *
 * Wraps meetingService to emit events for persistence via meeting-database.
 *
 * Usage:
 * ```tsx
 * import { integratedMeetingService } from '@/domains/meeting/services/meeting-runtime/meetingServiceIntegration'
 *
 * // In component or hook:
 * await integratedMeetingService.connect(config, meetingId, userId, title, description)
 * await integratedMeetingService.joinConference(roomName, displayName)
 * // Events automatically emitted to meetingEventEmitter
 * ```
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { meetingService } from './meetingService'
import { meetingEventEmitter } from '../meetingEventEmitter'
import type { MeetingConfig } from '../../types/meeting'

type ParticipantRole = 'HOST' | 'CO_HOST' | 'PARTICIPANT'

// Track meeting metadata for event emission
let currentMeetingId: string | null = null
let currentUserId: string | null = null

/**
 * Wrapper around meetingService that emits events for persistence
 */
export const integratedMeetingService = {
    /**
     * Connect to Jitsi server and emit meeting.started event
     */
    async connect(
        config: MeetingConfig,
        meetingId: string,
        userId: string,
        title?: string,
        description?: string
    ): Promise<void> {
        const startTime = Date.now()
        currentMeetingId = meetingId
        currentUserId = userId

        try {
            await meetingService.connect(config)

            // Emit meeting started event
            meetingEventEmitter.emitMeetingStarted({
                meetingId,
                roomName: config.roomName,
                hostUserId: userId,
                title: title || config.roomName,
                description,
            })

            console.log(
                `[integratedMeetingService] Connected to meeting ${meetingId} in ${Date.now() - startTime}ms`
            )
        } catch (error) {
            currentMeetingId = null
            currentUserId = null
            console.error(
                `[integratedMeetingService] Connection failed after ${Date.now() - startTime}ms:`,
                error
            )
            throw error
        }
    },

    /**
     * Disconnect and emit meeting.ended event
     */
    async disconnect(): Promise<void> {
        try {
            const finalMeetingId = currentMeetingId

            await meetingService.disconnect()

            // Emit meeting ended event if we had a meeting ID
            if (finalMeetingId) {
                meetingEventEmitter.emitMeetingEnded(finalMeetingId)
            }

            currentMeetingId = null
            currentUserId = null
            console.log('[integratedMeetingService] Disconnected')
        } catch (error) {
            console.error('[integratedMeetingService] Disconnect error:', error)
            throw error
        }
    },

    /**
     * Join conference with event emission
     */
    async joinConference(roomName: string, displayName: string): Promise<void> {
        try {
            await meetingService.joinConference(roomName, displayName)

            // Emit participant joined event for the local user
            const localParticipant = meetingService.getLocalParticipant()
            if (localParticipant && currentMeetingId) {
                meetingEventEmitter.emitParticipantJoined({
                    meetingId: currentMeetingId,
                    participantId: localParticipant.id,
                    userId: currentUserId || undefined,
                    displayName: localParticipant.displayName,
                    role: (localParticipant.role === 'moderator' ? 'HOST' : 'PARTICIPANT') as ParticipantRole,
                })
            }

            // Setup event forwarding for this conference
            const conference = meetingService.getConference()
            if (conference && currentMeetingId) {
                setupConferenceEventForwarding(conference, currentMeetingId, currentUserId || undefined)
            }

            console.log(`[integratedMeetingService] Joined conference ${roomName}`)
        } catch (error) {
            console.error('[integratedMeetingService] Join conference error:', error)
            throw error
        }
    },

    /**
     * Leave conference with event emission
     */
    async leaveConference(): Promise<void> {
        try {
            const localParticipant = meetingService.getLocalParticipant()

            await meetingService.leaveConference()

            // Emit participant left event for local user
            if (currentMeetingId && localParticipant) {
                meetingEventEmitter.emitParticipantLeft(
                    currentMeetingId,
                    localParticipant.id,
                    currentUserId || undefined
                )
            }

            console.log('[integratedMeetingService] Left conference')
        } catch (error) {
            console.error('[integratedMeetingService] Leave conference error:', error)
            throw error
        }
    },

    /**
     * Add track with event emission
     */
    async addTrack(track: any): Promise<any> {
        try {
            const localParticipant = meetingService.getLocalParticipant()

            const result = await meetingService.addTrack(track)

            // Emit track added event
            if (currentMeetingId && localParticipant && track.getType?.()) {
                meetingEventEmitter.emitTrackAdded({
                    meetingId: currentMeetingId,
                    participantId: localParticipant.id,
                    trackId: track.getId?.() || `track-${Date.now()}`,
                    kind: track.getType() as 'audio' | 'video',
                })
            }

            console.log('[integratedMeetingService] Track added:', track.getType?.())
            return result
        } catch (error) {
            console.error('[integratedMeetingService] Add track error:', error)
            throw error
        }
    },

    /**
     * Remove track with event emission
     */
    async removeTrack(track: any): Promise<void> {
        try {
            const localParticipant = meetingService.getLocalParticipant()

            await meetingService.removeTrack(track)

            // Emit track removed event
            if (currentMeetingId && localParticipant) {
                meetingEventEmitter.emitTrackRemoved(
                    currentMeetingId,
                    localParticipant.id,
                    track.getId?.() || `track-${Date.now()}`
                )
            }

            console.log('[integratedMeetingService] Track removed')
        } catch (error) {
            console.error('[integratedMeetingService] Remove track error:', error)
            throw error
        }
    },

    /**
     * Pass-through methods that don't require event emission
     */
    getLocalParticipant: () => meetingService.getLocalParticipant(),
    getConference: () => meetingService.getConference(),
    getConnection: () => meetingService.getConnection(),
    replaceTrack: (track: any, newTrack: any) =>
        meetingService.replaceTrack(track, newTrack),
    setEventHandlers: (handlers: any) => meetingService.setEventHandlers(handlers),
    clearEventHandlers: () => meetingService.clearEventHandlers(),
    extractParticipantData: (participant: any, isLocal?: boolean) =>
        meetingService.extractParticipantData(participant, isLocal),
}

/**
 * Setup event forwarding for conference events
 * Forwards Jitsi conference events to meetingEventEmitter
 */
function setupConferenceEventForwarding(conference: any, meetingId: string, userId?: string): void {
    if (!conference) {
        return
    }

    // Forward participant joined events
    conference.on?.('user_joined', (id: string, participant: any) => {
        const displayName = participant?.getDisplayName?.() || 'Guest'
        const role = participant?.isModerator?.() ? 'HOST' : 'PARTICIPANT'

        meetingEventEmitter.emitParticipantJoined({
            meetingId,
            participantId: id,
            userId: userId,
            displayName,
            role: role as ParticipantRole,
        })
    })

    // Forward participant left events
    conference.on?.('user_left', (id: string) => {
        meetingEventEmitter.emitParticipantLeft(meetingId, id, userId)
    })

    // Forward display name changed events (update participant info)
    conference.on?.('display_name_changed', (id: string, displayName: string) => {
        meetingEventEmitter.emitParticipantUpdated({
            meetingId,
            participantId: id,
            displayName,
        })
    })

    // Forward track added events
    conference.on?.('track_added', (track: any) => {
        const participantId = track.getParticipantId?.() || 'unknown'
        meetingEventEmitter.emitTrackAdded({
            meetingId,
            participantId,
            trackId: track.getId?.() || `track-${Date.now()}`,
            kind: track.getType?.() as 'audio' | 'video',
        })
    })

    // Forward track removed events
    conference.on?.('track_removed', (track: any) => {
        const participantId = track.getParticipantId?.() || 'unknown'
        meetingEventEmitter.emitTrackRemoved(
            meetingId,
            participantId,
            track.getId?.() || `track-${Date.now()}`
        )
    })

    console.log(`[setupConferenceEventForwarding] Forwarding events for meeting ${meetingId}`)
}
