/**
 * meeting-database - Barrel Export
 *
 * Persistence domain that subscribes to meeting-runtime events
 * and maps them into Prisma DTOs to persist meetings, participants, and logs.
 */

// Types and DTOs
export type {
    SerializableEvent,
    MeetingStartedPayload,
    MeetingEndedPayload,
    MeetingScheduledPayload,
    MeetingCancelledPayload,
    ParticipantJoinedPayload,
    ParticipantLeftPayload,
    ParticipantUpdatedPayload,
    TrackAddedPayload,
    TrackRemovedPayload,
    MeetingEvent,
    ParticipantEvent,
    TrackEvent,
    MeetingDatabaseEvent,
    CreateMeetingDTO,
    UpdateMeetingDTO,
    UpsertParticipantDTO,
    UpdateParticipantDTO,
    EventLogDTO,
    EventProcessingResult,
} from './types'

export {
    isMeetingEvent,
    isParticipantEvent,
    isTrackEvent,
    validateRequiredFields,
} from './types'

// Services
export { meetingRecordService } from './meetingRecordService'
export { participantRecordService } from './participantRecordService'
export { meetingLogService } from './meetingLogService'
export { historyService } from './historyService'
export { transcriptRecordService, isTranscriptionEvent } from './transcriptRecordService'
