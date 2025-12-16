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
    AudioMuteChangedPayload,
    VideoMuteChangedPayload,
    ScreenShareStatusChangedPayload,
    DominantSpeakerChangedPayload,
    DisplayNameChangedPayload,
    RaiseHandUpdated,
    RecordingStatusChangedPayload,
    TranscribingStatusChangedPayload,
    TranscriptionChunkReceivedPayload,
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

    // ========================================================================
    // Media/Audio-Video Events
    // ========================================================================

    /**
     * Emit when audio mute status changes
     */
    emitAudioMuteChanged(meetingId: string, participantId: string, muted: boolean): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'audio.mute.changed',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                participantId,
                muted,
                timestamp: new Date().toISOString(),
            } as AudioMuteChangedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when video mute status changes
     */
    emitVideoMuteChanged(meetingId: string, participantId: string, muted: boolean): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'video.mute.changed',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                participantId,
                muted,
                timestamp: new Date().toISOString(),
            } as VideoMuteChangedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when screen sharing starts
     */
    emitScreenShareStarted(
        meetingId: string,
        participantId: string,
        sourceType?: string
    ): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'screen.share.started',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                participantId,
                on: true,
                sourceType,
                timestamp: new Date().toISOString(),
            } as ScreenShareStatusChangedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when screen sharing stops
     */
    emitScreenShareStopped(meetingId: string, participantId: string): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'screen.share.stopped',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                participantId,
                on: false,
                timestamp: new Date().toISOString(),
            } as ScreenShareStatusChangedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when dominant speaker changes
     */
    emitDominantSpeakerChanged(meetingId: string, participantId: string): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'dominant.speaker.changed',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                participantId,
                timestamp: new Date().toISOString(),
            } as DominantSpeakerChangedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when display name changes
     */
    emitDisplayNameChanged(
        meetingId: string,
        participantId: string,
        displayName: string
    ): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'display.name.changed',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                participantId,
                displayName,
                timestamp: new Date().toISOString(),
            } as DisplayNameChangedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when hand is raised or lowered
     */
    emitRaiseHandUpdated(
        meetingId: string,
        participantId: string,
        handRaised: number
    ): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'raise.hand.updated',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                participantId,
                handRaised,
                timestamp: new Date().toISOString(),
            } as RaiseHandUpdated,
        }
        this.emit(event)
    }

    /**
     * Emit when recording status changes
     */
    emitRecordingStatusChanged(
        meetingId: string,
        on: boolean,
        mode: string,
        transcription: boolean,
        error?: string
    ): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'recording.status.changed',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                on,
                mode,
                transcription,
                ...(error && { error }),
                timestamp: new Date().toISOString(),
            } as RecordingStatusChangedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when transcription status changes
     */
    emitTranscribingStatusChanged(meetingId: string, on: boolean): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'transcription.status.changed',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                on,
                timestamp: new Date().toISOString(),
            } as TranscribingStatusChangedPayload,
        }
        this.emit(event)
    }

    /**
     * Emit when a transcription chunk is received
     */
    emitTranscriptionChunkReceived(
        meetingId: string,
        language: string,
        messageID: string,
        participant: { id: string; displayName: string; userId?: string },
        final: string,
        stable: string,
        unstable: string
    ): void {
        const event: SerializableEvent = {
            eventId: this.generateEventId(),
            type: 'transcription.chunk.received',
            timestamp: Date.now(),
            meetingId,
            payload: {
                meetingId,
                language,
                messageID,
                participant,
                final,
                stable,
                unstable,
                timestamp: new Date().toISOString(),
            } as TranscriptionChunkReceivedPayload,
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
