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

export type MeetingDatabaseEvent = MeetingEvent | ParticipantEvent | TrackEvent

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
