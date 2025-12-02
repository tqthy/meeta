import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/* eslint-disable @typescript-eslint/no-explicit-any */
export enum ParticipantRole {
    HOST = 'HOST',
    CO_HOST = 'CO_HOST',
    PARTICIPANT = 'PARTICIPANT',
}

export interface Participant {
    id: string
    displayName: string
    email?: string
    role: ParticipantRole
    isMuted: boolean
    videoTrack: any | null // JitsiTrack or null
    audioTrack: any | null // JitsiTrack or null
    audioLevel: number
    isLocalParticipant: boolean
    joinedAt: number // Unix timestamp in milliseconds
    leftAt?: number | null // Unix timestamp in milliseconds
    speakerId?: number | null // Deepgram speaker ID for diarization
}

export interface ParticipantsState {
    localParticipant: Participant | null
    remoteParticipants: Record<string, Participant>
    audioLevels: Record<string, number>
}

const initialState: ParticipantsState = {
    localParticipant: null,
    remoteParticipants: {},
    audioLevels: {},
}

const participantsSlice = createSlice({
    name: 'participants',
    initialState,
    reducers: {
        // Set local participant
        setLocalParticipant: (state, action: PayloadAction<Participant>) => {
            state.localParticipant = action.payload
            state.audioLevels[action.payload.id] = 0
        },

        // Add remote participant
        addRemoteParticipant: (state, action: PayloadAction<Participant>) => {
            const participant = action.payload
            state.remoteParticipants[participant.id] = participant
            state.audioLevels[participant.id] = 0
        },

        // Remove remote participant
        removeRemoteParticipant: (state, action: PayloadAction<string>) => {
            delete state.remoteParticipants[action.payload]
            delete state.audioLevels[action.payload]
        },

        // Update participant audio/video tracks
        updateParticipantTracks: (
            state,
            action: PayloadAction<
                {
                    participantId: string
                    videoTrack?: any | null
                    audioTrack?: any | null
                    isLocal?: boolean
                }
            >
        ) => {
            const { participantId, videoTrack, audioTrack, isLocal } =
                action.payload
            const participant = isLocal
                ? state.localParticipant
                : state.remoteParticipants[participantId]

            if (participant) {
                // Chỉ cập nhật những track được cung cấp (không undefined)
                if (videoTrack !== undefined) {
                    participant.videoTrack = videoTrack
                }
                if (audioTrack !== undefined) {
                    participant.audioTrack = audioTrack
                }
            }
        },

        // Update participant mute state
        updateParticipantMuteState: (
            state,
            action: PayloadAction<
                {
                    participantId: string
                    isMuted: boolean
                    isLocal?: boolean
                }
            >
        ) => {
            const { participantId, isMuted, isLocal } = action.payload
            const participant = isLocal
                ? state.localParticipant
                : state.remoteParticipants[participantId]

            if (participant) {
                participant.isMuted = isMuted
            }
        },

        // Update audio levels for visualizer
        updateAudioLevel: (
            state,
            action: PayloadAction<
                {
                    participantId: string
                    level: number
                }
            >
        ) => {
            const { participantId, level } = action.payload
            state.audioLevels[participantId] = level
        },

        // Clear all participants
        clearAllParticipants: (state) => {
            state.localParticipant = null
            state.remoteParticipants = {}
            state.audioLevels = {}
        },
    },
})

export const {
    setLocalParticipant,
    addRemoteParticipant,
    removeRemoteParticipant,
    updateParticipantTracks,
    updateParticipantMuteState,
    updateAudioLevel,
    clearAllParticipants,
} = participantsSlice.actions

// Selectors
export const selectAllParticipants = (state: {
    participants: ParticipantsState
}): Participant[] => {
    const all: Participant[] = []
    if (state.participants.localParticipant) {
        all.push(state.participants.localParticipant)
    }
    all.push(...Object.values(state.participants.remoteParticipants))
    return all
}

export default participantsSlice.reducer
