/**
 * Meeting Domain Types
 *
 * Type definitions for meeting-related data structures.
 *
 * @see JitsiAPI/5-JitsiParticipant/Class_JitsiParticipant.txt for participant fields
 */

/**
 * Connection status for the Jitsi connection
 */
export type ConnectionStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'failed'
    | 'interrupted'

/**
 * Conference status for the meeting room
 */
export type ConferenceStatus =
    | 'idle'
    | 'joining'
    | 'joined'
    | 'leaving'
    | 'left'
    | 'failed'

/**
 * Represents a participant in the meeting
 * Serializable payload - no SDK objects
 */
export interface Participant {
    id: string
    displayName: string
    isLocal: boolean
    role: 'moderator' | 'participant' | 'none'
    isAudioMuted: boolean
    isVideoMuted: boolean
    isSpeaking: boolean
    isDominantSpeaker: boolean
    imageUrl?: string
}

/**
 * Meeting configuration options
 */
export interface MeetingConfig {
    roomName: string
    displayName: string
    serverUrl: string
    jwt?: string
    startWithAudioMuted?: boolean
    startWithVideoMuted?: boolean
}

/**
 * Error information for meeting-related errors
 */
export interface MeetingError {
    type: string
    message: string
    timestamp: number
}

/**
 * Redux state for the meeting domain
 */
export interface MeetingState {
    // Connection state
    connectionStatus: ConnectionStatus
    conferenceStatus: ConferenceStatus

    // Room info
    roomName: string | null
    localParticipantId: string | null

    // Participants map (id -> Participant)
    participants: Record<string, Participant>

    // Error tracking
    error: MeetingError | null

    // UI state
    dominantSpeakerId: string | null
}
