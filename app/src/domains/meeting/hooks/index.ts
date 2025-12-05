/**
 * Meeting Hooks - Barrel Export
 */

// Runtime hooks (Jitsi integration)
export { useMeeting } from './useMeeting'
export { useLocalTracks } from './useLocalTracks'
export { useRemoteTracks } from './useRemoteTracks'
export { useEventPersistence } from './useEventPersistence'

// SWR data fetching hooks (database)
export {
    useMeetingDetails,
    useMeetingParticipants,
    useMeetingStats,
    useMeetingData,
    type MeetingData,
    type ParticipantData,
    type ParticipantsResponse,
    type MeetingStatsData,
} from './useFetchingMeeting'
