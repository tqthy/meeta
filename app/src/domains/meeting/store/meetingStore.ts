/**
 * meetingStore
 *
 * Redux slice for meeting state.
 * Manages participant list, meeting status, and connection state.
 * Stores serializable payloads only - no SDK objects.
 *
 * @see JitsiAPI/5-JitsiParticipant for participant model reference
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    MeetingState,
    Participant,
    ConnectionStatus,
    ConferenceStatus,
    MeetingError,
} from '../types/meeting'

const initialState: MeetingState = {
    connectionStatus: 'disconnected',
    conferenceStatus: 'idle',
    roomName: null,
    localParticipantId: null,
    participants: {},
    error: null,
    dominantSpeakerId: null,
}

export const meetingSlice = createSlice({
    name: 'meeting',
    initialState,
    reducers: {
        // Connection actions
        setConnectionStatus: (
            state,
            action: PayloadAction<ConnectionStatus>
        ) => {
            state.connectionStatus = action.payload
            if (
                action.payload === 'disconnected' ||
                action.payload === 'failed'
            ) {
                // Reset meeting state on disconnect
                state.conferenceStatus = 'idle'
                state.roomName = null
                state.participants = {}
                state.dominantSpeakerId = null
            }
        },

        // Conference actions
        setConferenceStatus: (
            state,
            action: PayloadAction<ConferenceStatus>
        ) => {
            state.conferenceStatus = action.payload
        },

        setRoomName: (state, action: PayloadAction<string | null>) => {
            state.roomName = action.payload
        },

        setLocalParticipantId: (
            state,
            action: PayloadAction<string | null>
        ) => {
            state.localParticipantId = action.payload
        },

        // Participant actions
        addParticipant: (state, action: PayloadAction<Participant>) => {
            state.participants[action.payload.id] = action.payload
        },

        updateParticipant: (
            state,
            action: PayloadAction<{
                id: string
                updates: Partial<Participant>
            }>
        ) => {
            const { id, updates } = action.payload
            if (state.participants[id]) {
                state.participants[id] = {
                    ...state.participants[id],
                    ...updates,
                }
            }
        },

        removeParticipant: (state, action: PayloadAction<string>) => {
            delete state.participants[action.payload]
            if (state.dominantSpeakerId === action.payload) {
                state.dominantSpeakerId = null
            }
        },

        clearParticipants: (state) => {
            state.participants = {}
            state.dominantSpeakerId = null
        },

        // Dominant speaker
        setDominantSpeaker: (state, action: PayloadAction<string | null>) => {
            // Reset previous dominant speaker
            Object.values(state.participants).forEach((p) => {
                p.isDominantSpeaker = false
            })
            state.dominantSpeakerId = action.payload
            if (action.payload && state.participants[action.payload]) {
                state.participants[action.payload].isDominantSpeaker = true
            }
        },

        // Error handling
        setError: (state, action: PayloadAction<MeetingError | null>) => {
            state.error = action.payload
        },

        // Reset state
        resetMeetingState: () => initialState,
    },
})

export const {
    setConnectionStatus,
    setConferenceStatus,
    setRoomName,
    setLocalParticipantId,
    addParticipant,
    updateParticipant,
    removeParticipant,
    clearParticipants,
    setDominantSpeaker,
    setError,
    resetMeetingState,
} = meetingSlice.actions

export default meetingSlice.reducer
