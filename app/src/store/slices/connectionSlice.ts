import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export enum ParticipantRole {
    HOST = 'HOST',
    CO_HOST = 'CO_HOST',
    PARTICIPANT = 'PARTICIPANT',
}

export enum MeetingStatus {
    SCHEDULED = 'SCHEDULED',
    ACTIVE = 'ACTIVE',
    ENDED = 'ENDED',
    CANCELLED = 'CANCELLED',
}

export interface Participant {
    id: string
    displayName: string
    email?: string
    role: ParticipantRole
    isDominantSpeaker: boolean
    joinedAt: number // Unix timestamp in milliseconds
    leftAt?: number | null // Unix timestamp in milliseconds
    speakerId?: number | null // Deepgram speaker ID for diarization
}

export interface ConnectionError {
    name: string
    message: string
    params?: Record<string, unknown>
}

export interface ConnectionState {
    // Connection state
    isConnected: boolean
    isConnecting: boolean
    connectionError: ConnectionError | null

    // Conference state
    isJoined: boolean
    isJoining: boolean
    conferenceError: ConnectionError | null
    roomName: string | null

    // Meeting metadata
    meetingId?: string | null
    meetingTitle?: string | null
    meetingDescription?: string | null
    meetingStatus: MeetingStatus | null
    scheduledAt?: number | null // Unix timestamp in milliseconds
    startedAt?: number | null // Unix timestamp in milliseconds
    endedAt?: number | null // Unix timestamp in milliseconds
    duration?: number | null // Duration in seconds

    // Participants
    participants: Record<string, Participant>
    dominantSpeakerId: string | null
    localParticipantId: string | null

    // Connection quality
    connectionQuality: 'good' | 'poor' | 'interrupted' | null
    isConnectionInterrupted: boolean

    // Retry state
    retryCount: number
    maxRetries: number
}

const initialState: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    connectionError: null,

    isJoined: false,
    isJoining: false,
    conferenceError: null,
    roomName: null,

    meetingId: null,
    meetingTitle: null,
    meetingDescription: null,
    meetingStatus: null,
    scheduledAt: null,
    startedAt: null,
    endedAt: null,
    duration: null,

    participants: {},
    dominantSpeakerId: null,
    localParticipantId: null,

    connectionQuality: null,
    isConnectionInterrupted: false,

    retryCount: 0,
    maxRetries: 3,
}

const connectionSlice = createSlice({
    name: 'connection',
    initialState,
    reducers: {
        // Connection lifecycle
        setConnecting: (state, action: PayloadAction<boolean>) => {
            state.isConnecting = action.payload
            if (action.payload) {
                state.connectionError = null
            }
        },
        setConnected: (state, action: PayloadAction<boolean>) => {
            state.isConnected = action.payload
            if (action.payload) {
                state.isConnecting = false
                state.connectionError = null
                state.retryCount = 0
            }
        },
        setConnectionError: (
            state,
            action: PayloadAction<ConnectionError | null>
        ) => {
            state.connectionError = action.payload
            state.isConnecting = false
            if (action.payload) {
                state.isConnected = false
            }
        },

        // Conference lifecycle
        setRoomName: (state, action: PayloadAction<string | null>) => {
            state.roomName = action.payload
        },
        setMeetingMetadata: (
            state,
            action: PayloadAction<{
                meetingId?: string
                title?: string
                description?: string
                status?: MeetingStatus
                scheduledAt?: Date | number | null
                startedAt?: Date | number | null
                endedAt?: Date | number | null
                duration?: number | null
            }>
        ) => {
            const {
                meetingId,
                title,
                description,
                status,
                scheduledAt,
                startedAt,
                endedAt,
                duration,
            } = action.payload
            if (meetingId !== undefined) state.meetingId = meetingId
            if (title !== undefined) state.meetingTitle = title
            if (description !== undefined) state.meetingDescription = description
            if (status !== undefined) state.meetingStatus = status
            if (scheduledAt !== undefined) state.scheduledAt = scheduledAt instanceof Date ? scheduledAt.getTime() : scheduledAt
            if (startedAt !== undefined) state.startedAt = startedAt instanceof Date ? startedAt.getTime() : startedAt
            if (endedAt !== undefined) state.endedAt = endedAt instanceof Date ? endedAt.getTime() : endedAt
            if (duration !== undefined) state.duration = duration
        },
        setMeetingStatus: (state, action: PayloadAction<MeetingStatus>) => {
            state.meetingStatus = action.payload
        },
        setJoining: (state, action: PayloadAction<boolean>) => {
            state.isJoining = action.payload
            if (action.payload) {
                state.conferenceError = null
            }
        },
        setJoined: (state, action: PayloadAction<boolean>) => {
            state.isJoined = action.payload
            if (action.payload) {
                state.isJoining = false
                state.conferenceError = null
            }
        },
        setConferenceError: (
            state,
            action: PayloadAction<ConnectionError | null>
        ) => {
            state.conferenceError = action.payload
            state.isJoining = false
            if (action.payload) {
                state.isJoined = false
            }
        },

        // Participants management
        addParticipant: (state, action: PayloadAction<Participant>) => {
            state.participants[action.payload.id] = action.payload
        },
        removeParticipant: (state, action: PayloadAction<string>) => {
            delete state.participants[action.payload]
        },
        updateParticipant: (
            state,
            action: PayloadAction<{ id: string; updates: Partial<Participant> }>
        ) => {
            const { id, updates } = action.payload
            const participant = state.participants[id]
            if (participant) {
                state.participants[id] = { ...participant, ...updates }
            }
        },
        clearParticipants: (state) => {
            state.participants = {}
        },
        setLocalParticipantId: (state, action: PayloadAction<string>) => {
            state.localParticipantId = action.payload
        },

        // Dominant speaker
        setDominantSpeaker: (state, action: PayloadAction<string | null>) => {
            // Clear previous dominant speaker
            if (state.dominantSpeakerId) {
                const prevSpeaker = state.participants[state.dominantSpeakerId]
                if (prevSpeaker) {
                    prevSpeaker.isDominantSpeaker = false
                }
            }

            state.dominantSpeakerId = action.payload

            // Set new dominant speaker
            if (action.payload) {
                const newSpeaker = state.participants[action.payload]
                if (newSpeaker) {
                    newSpeaker.isDominantSpeaker = true
                }
            }
        },

        // Connection quality
        setConnectionQuality: (
            state,
            action: PayloadAction<'good' | 'poor' | 'interrupted' | null>
        ) => {
            state.connectionQuality = action.payload
        },
        setConnectionInterrupted: (state, action: PayloadAction<boolean>) => {
            state.isConnectionInterrupted = action.payload
            if (action.payload) {
                state.connectionQuality = 'interrupted'
            }
        },

        // Retry management
        incrementRetryCount: (state) => {
            state.retryCount += 1
        },
        resetRetryCount: (state) => {
            state.retryCount = 0
        },

        // Full reset
        resetConnectionState: () => initialState,
    },
})

export const {
    setConnecting,
    setConnected,
    setConnectionError,
    setRoomName,
    setMeetingMetadata,
    setMeetingStatus,
    setJoining,
    setJoined,
    setConferenceError,
    addParticipant,
    removeParticipant,
    updateParticipant,
    clearParticipants,
    setLocalParticipantId,
    setDominantSpeaker,
    setConnectionQuality,
    setConnectionInterrupted,
    incrementRetryCount,
    resetRetryCount,
    resetConnectionState,
} = connectionSlice.actions

export default connectionSlice.reducer
