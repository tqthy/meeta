/**
 * meeting-database Types
 *
 * DTOs and event types for the persistence domain.
 * These types define the shape of serializable events from meeting-runtime
 * and the DTOs used for Prisma mapping.
 *
 * NOTE: This file must NOT import from Prisma to remain client-safe.
 * Types are duplicated here to avoid bundling Prisma in client code.
 */

// ============================================================================
// Prisma-compatible types (duplicated for client safety)
// ============================================================================

export type MeetingStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED'
export type ParticipantRole = 'HOST' | 'CO_HOST' | 'PARTICIPANT'

// ============================================================================
// Base Event Types
// ============================================================================

/**
 * Base serializable event from meeting-runtime
 */
export interface SerializableEvent<T extends string = string, P = unknown> {
    eventId: string
    type: T
    payload: P
    timestamp: number // Unix timestamp in milliseconds
    meetingId?: string
}

// ============================================================================
// Meeting Event Payloads
// ============================================================================

export interface MeetingStartedPayload {
    meetingId: string
    roomName: string
    hostUserId: string
    title?: string
    description?: string
    startedAt: string // ISO date string
}

export interface MeetingEndedPayload {
    meetingId: string
    endedAt: string // ISO date string
    duration?: number // Duration in seconds
}

export interface MeetingScheduledPayload {
    meetingId: string
    roomName: string
    hostUserId: string
    title: string
    description?: string
    scheduledAt: string // ISO date string
}

export interface MeetingCancelledPayload {
    meetingId: string
    cancelledAt: string // ISO date string
    reason?: string
}

// ============================================================================
// Participant Event Payloads
// ============================================================================

export interface ParticipantJoinedPayload {
    meetingId: string
    participantId: string
    userId?: string // Nullable for anonymous/guest participants
    displayName: string
    email?: string
    role?: ParticipantRole
    joinedAt: string // ISO date string
}

export interface ParticipantLeftPayload {
    meetingId: string
    participantId: string
    userId?: string
    leftAt: string // ISO date string
}

export interface ParticipantUpdatedPayload {
    meetingId: string
    participantId: string
    displayName?: string
    role?: ParticipantRole
    speakerId?: number // Deepgram speaker ID for diarization
}

// ============================================================================
// Track Event Payloads
// ============================================================================

export interface TrackAddedPayload {
    meetingId: string
    participantId: string
    trackId: string
    kind: 'audio' | 'video'
    createdAt: string // ISO date string
}

export interface TrackRemovedPayload {
    meetingId: string
    participantId: string
    trackId: string
    removedAt: string // ISO date string
}

// ============================================================================
// Media/Audio-Video Event Payloads
// ============================================================================

export interface AudioMuteChangedPayload {
    meetingId: string
    participantId: string
    muted: boolean
    timestamp: string
}

export interface VideoMuteChangedPayload {
    meetingId: string
    participantId: string
    muted: boolean
    timestamp: string
}

export interface ScreenShareStatusChangedPayload {
    meetingId: string
    participantId: string
    on: boolean
    sourceType?: string // 'window' | 'screen' | 'proxy' | 'device' | undefined
    timestamp: string
}

export interface DominantSpeakerChangedPayload {
    meetingId: string
    participantId: string
    timestamp: string
}

export interface DisplayNameChangedPayload {
    meetingId: string
    participantId: string
    displayName: string
    timestamp: string
}

export interface RaiseHandUpdated {
    meetingId: string
    participantId: string
    handRaised: number // 0 when lowered, or timestamp when raised
    timestamp: string
}

export interface RecordingStatusChangedPayload {
    meetingId: string
    on: boolean
    mode: string // 'local' | 'stream' | 'file'
    error?: string
    transcription: boolean
    timestamp: string
}

export interface TranscribingStatusChangedPayload {
    meetingId: string
    on: boolean
    timestamp: string
}

export interface TranscriptionChunkReceivedPayload {
    meetingId: string
    language: string
    messageID: string
    participant: {
        id: string
        displayName: string
    }
    final: string
    stable: string
    unstable: string
    timestamp: string
}

// ============================================================================
// Event Type Unions
// ============================================================================

export type MeetingEvent =
    | SerializableEvent<'meeting.started', MeetingStartedPayload>
    | SerializableEvent<'meeting.ended', MeetingEndedPayload>
    | SerializableEvent<'meeting.scheduled', MeetingScheduledPayload>
    | SerializableEvent<'meeting.cancelled', MeetingCancelledPayload>

export type ParticipantEvent =
    | SerializableEvent<'participant.joined', ParticipantJoinedPayload>
    | SerializableEvent<'participant.left', ParticipantLeftPayload>
    | SerializableEvent<'participant.updated', ParticipantUpdatedPayload>

export type TrackEvent =
    | SerializableEvent<'track.added', TrackAddedPayload>
    | SerializableEvent<'track.removed', TrackRemovedPayload>

export type MediaEvent =
    | SerializableEvent<'audio.mute.changed', AudioMuteChangedPayload>
    | SerializableEvent<'video.mute.changed', VideoMuteChangedPayload>
    | SerializableEvent<'screen.share.started', ScreenShareStatusChangedPayload>
    | SerializableEvent<'screen.share.stopped', ScreenShareStatusChangedPayload>
    | SerializableEvent<'dominant.speaker.changed', DominantSpeakerChangedPayload>
    | SerializableEvent<'display.name.changed', DisplayNameChangedPayload>
    | SerializableEvent<'raise.hand.updated', RaiseHandUpdated>
    | SerializableEvent<'recording.status.changed', RecordingStatusChangedPayload>
    | SerializableEvent<'transcription.status.changed', TranscribingStatusChangedPayload>
    | SerializableEvent<'transcription.chunk.received', TranscriptionChunkReceivedPayload>

export type MeetingDatabaseEvent = MeetingEvent | ParticipantEvent | TrackEvent | MediaEvent

// ============================================================================
// DTOs for Prisma Mapping
// ============================================================================

/**
 * DTO for creating a new meeting
 */
export interface CreateMeetingDTO {
    id: string
    roomName: string
    title: string
    description?: string
    hostId: string
    scheduledAt?: Date
    startedAt?: Date
    status: MeetingStatus
}

/**
 * DTO for updating a meeting
 */
export interface UpdateMeetingDTO {
    title?: string
    description?: string
    startedAt?: Date
    endedAt?: Date
    duration?: number
    status?: MeetingStatus
}

/**
 * DTO for creating/upserting a participant
 */
export interface UpsertParticipantDTO {
    id: string
    meetingId: string
    userId?: string
    displayName: string
    email?: string
    role: ParticipantRole
    joinedAt: Date
    leftAt?: Date
    speakerId?: number
}

/**
 * DTO for updating a participant
 */
export interface UpdateParticipantDTO {
    displayName?: string
    role?: ParticipantRole
    leftAt?: Date
    speakerId?: number
}

// ============================================================================
// Event Log Types
// ============================================================================

/**
 * DTO for storing raw event logs
 */
export interface EventLogDTO {
    eventId: string
    meetingId: string
    eventType: string
    payload: Record<string, unknown>
    timestamp: Date
    processedAt?: Date
    status: 'pending' | 'processed' | 'failed'
    error?: string
}

/**
 * Result of event processing
 */
export interface EventProcessingResult {
    success: boolean
    eventId: string
    eventType: string
    error?: string
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Type guard for MeetingEvent
 */
export function isMeetingEvent(event: SerializableEvent): event is MeetingEvent {
    return event.type.startsWith('meeting.')
}

/**
 * Type guard for ParticipantEvent
 */
export function isParticipantEvent(event: SerializableEvent): event is ParticipantEvent {
    return event.type.startsWith('participant.')
}

/**
 * Type guard for TrackEvent
 */
export function isTrackEvent(event: SerializableEvent): event is TrackEvent {
    return event.type.startsWith('track.')
}

/**
 * Type guard for MediaEvent
 */
export function isMediaEvent(event: SerializableEvent): event is MediaEvent {
    return (
        event.type.startsWith('audio.') ||
        event.type.startsWith('video.') ||
        event.type.startsWith('screen.') ||
        event.type.startsWith('dominant.') ||
        event.type.startsWith('display.') ||
        event.type.startsWith('raise.') ||
        event.type.startsWith('recording.') ||
        event.type.startsWith('transcription.')
    )
}

/**
 * Validate required fields exist in payload
 */
export function validateRequiredFields<T extends object>(
    payload: T,
    requiredFields: (keyof T)[]
): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = []

    for (const field of requiredFields) {
        if (payload[field] === undefined || payload[field] === null) {
            missingFields.push(String(field))
        }
    }

    return {
        valid: missingFields.length === 0,
        missingFields,
    }
}
