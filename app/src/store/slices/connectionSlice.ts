import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Participant {
    id: string
    displayName: string
    role?: string
    isDominantSpeaker: boolean
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

    // Participants
    participants: Map<string, Participant>
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

    participants: new Map(),
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
            state.participants.set(action.payload.id, action.payload)
        },
        removeParticipant: (state, action: PayloadAction<string>) => {
            state.participants.delete(action.payload)
        },
        updateParticipant: (
            state,
            action: PayloadAction<{ id: string; updates: Partial<Participant> }>
        ) => {
            const { id, updates } = action.payload
            const participant = state.participants.get(id)
            if (participant) {
                state.participants.set(id, { ...participant, ...updates })
            }
        },
        clearParticipants: (state) => {
            state.participants.clear()
        },
        setLocalParticipantId: (state, action: PayloadAction<string>) => {
            state.localParticipantId = action.payload
        },

        // Dominant speaker
        setDominantSpeaker: (state, action: PayloadAction<string | null>) => {
            // Clear previous dominant speaker
            if (state.dominantSpeakerId) {
                const prevSpeaker = state.participants.get(
                    state.dominantSpeakerId
                )
                if (prevSpeaker) {
                    prevSpeaker.isDominantSpeaker = false
                }
            }

            state.dominantSpeakerId = action.payload

            // Set new dominant speaker
            if (action.payload) {
                const newSpeaker = state.participants.get(action.payload)
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
