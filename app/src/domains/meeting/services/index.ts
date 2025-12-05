/**
 * Meeting Services - Barrel Export (Client-safe)
 *
 * NOTE: Database services are NOT exported here to prevent client-side bundling.
 * For server-side database operations, import directly from './meeting-database'
 */

// Runtime services (client-side)
export { meetingService } from './meeting-runtime/meetingService'
export { integratedMeetingService } from './meeting-runtime/meetingServiceIntegration'
export { trackService } from './meeting-runtime/trackService'
export { deviceService } from './meeting-runtime/deviceService'
export { getJitsiMeetJS, isJitsiLoaded, getJitsiMeetJSSync } from './meeting-runtime/jitsiLoader'

// Event emission (client-side)
export { meetingEventEmitter } from './meetingEventEmitter'

// Types only (no runtime code) - safe for client
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
} from './meeting-database/types'
