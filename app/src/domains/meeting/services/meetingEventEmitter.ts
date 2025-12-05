/**
 * Meeting Event Emitter
 *
 * Bridge between meeting-runtime (client) and meeting-database (server).
 * Emits serializable events that can be sent to the backend for persistence.
 *
 * Usage:
 * - Client captures events from meetingService
 * - meetingEventEmitter broadcasts them as SerializableEvent
 * - Backend receives and processes via API route
 */

import type {
    SerializableEvent,
    MeetingStartedPayload,
    MeetingEndedPayload,
    ParticipantJoinedPayload,
    ParticipantLeftPayload,
    TrackAddedPayload,
    TrackRemovedPayload,
} from './meeting-database/types'

type EventListener = (event: SerializableEvent) => void

/**
 * Simple event emitter for meeting events
 */
class MeetingEventEmitter {
    private listeners: EventListener[] = []
    private eventQueue: SerializableEvent[] = []
    private isProcessing = false

    /**
     * Subscribe to all meeting events
     */
    subscribe(listener: EventListener): () => void {
        this.listeners.push(listener)
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener)
        }
    }

    /**
     * Emit a meeting event
     */
    private emit(event: SerializableEvent): void {
        this.eventQueue.push(event)
        this.processQueue()
    }

    /**
     * Process event queue sequentially
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.eventQueue.length === 0) {
            return
        }

        this.isProcessing = true

        try {
            while (this.eventQueue.length > 0) {
                const event = this.eventQueue.shift()!
                // Notify all listeners sequentially
                for (const listener of this.listeners) {
                    try {
                        listener(event)
                    } catch (error) {
                        console.error('[MeetingEventEmitter] Listener error:', error)
                    }
                }
            }
        } finally {
            this.isProcessing = false
        }
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(): string {
        return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    // ========================================================================
    // Meeting Events
    // ========================================================================

    /**
     * Emit when a meeting starts
     */
    emitMeetingStarted(payload: Omit<MeetingStartedPayload, 'startedAt'> & { startedAt?: string }): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'meeting.started',
            timestamp: Date.now(),
            meetingId: payload.meetingId,
            payload: {
                ...payload,
                startedAt: payload.startedAt || new Date().toISOString(),
            } as MeetingStartedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when a meeting ends
     */
    emitMeetingEnded(meetingId: string, duration?: number): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'meeting.ended',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                endedAt: new Date().toISOString(),
                ...(duration && { duration }),
            } as MeetingEndedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when a meeting is scheduled
     */
    emitMeetingScheduled(payload: Omit<MeetingStartedPayload, 'startedAt'> & { scheduledAt: string }): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'meeting.scheduled',
            timestamp: Date.now(),
            meetingId: payload.meetingId,
            payload,
        }
        this.emit(event)
    }

    /**
     * Emit when a meeting is cancelled
     */
    emitMeetingCancelled(meetingId: string): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'meeting.cancelled',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                cancelledAt: new Date().toISOString(),
            },
        }
        this.emit(event)
    }

    // ========================================================================
    // Participant Events
    // ========================================================================

    /**
     * Emit when a participant joins
     */
    emitParticipantJoined(payload: Omit<ParticipantJoinedPayload, 'joinedAt'> & { joinedAt?: string }): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'participant.joined',
            timestamp: Date.now(),
            meetingId: payload.meetingId,
            payload: {
                ...payload,
                joinedAt: payload.joinedAt || new Date().toISOString(),
            } as ParticipantJoinedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when a participant leaves
     */
    emitParticipantLeft(meetingId: string, participantId: string, userId?: string): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'participant.left',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                participantId,
                userId,
                leftAt: new Date().toISOString(),
            } as ParticipantLeftPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when a participant's info is updated
     */
    emitParticipantUpdated(payload: {
        meetingId: string
        participantId: string
        displayName?: string
        speakerId?: number
    }): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'participant.updated',
            timestamp: Date.now(),
            meetingId: payload.meetingId,
            payload,
        }
        this.emit(event)
    }

    // ========================================================================
    // Track Events
    // ========================================================================

    /**
     * Emit when a track is added
     */
    emitTrackAdded(payload: Omit<TrackAddedPayload, 'createdAt'> & { createdAt?: string }): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'track.added',
            timestamp: Date.now(),
            meetingId: payload.meetingId,
            payload: {
                ...payload,
                createdAt: payload.createdAt || new Date().toISOString(),
            } as TrackAddedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when a track is removed
     */
    emitTrackRemoved(meetingId: string, participantId: string, trackId: string): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'track.removed',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                participantId,
                trackId,
                removedAt: new Date().toISOString(),
            } as TrackRemovedPayload,
        }
        this.emit(event)
    }

    /**
     * Get the event queue (for testing)
     */
    getEventQueue(): SerializableEvent[] {
        return [...this.eventQueue]
    }

    /**
     * Clear the event queue (for testing)
     */
    clearEventQueue(): void {
        this.eventQueue = []
    }
}

// Export singleton instance
export const meetingEventEmitter = new MeetingEventEmitter()
