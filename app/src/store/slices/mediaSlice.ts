import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface MediaState {
    localTracks: any[] // JitsiTrack[]
    remoteTracks: Map<string, any[]> // Map<participantId, JitsiTrack[]>
    cameraEnabled: boolean
    micEnabled: boolean
    audioLevel: Map<string, number> // Map<participantId, audioLevel>
    devices: {
        audioInput: MediaDeviceInfo[]
        audioOutput: MediaDeviceInfo[]
        videoInput: MediaDeviceInfo[]
    }
    selectedDevices: {
        audioInput: string | null
        audioOutput: string | null
        videoInput: string | null
    }
    isCreatingTracks: boolean
    trackError: string | null
}

const initialState: MediaState = {
    localTracks: [],
    remoteTracks: new Map(),
    cameraEnabled: true,
    micEnabled: true,
    audioLevel: new Map(),
    devices: {
        audioInput: [],
        audioOutput: [],
        videoInput: [],
    },
    selectedDevices: {
        audioInput: null,
        audioOutput: null,
        videoInput: null,
    },
    isCreatingTracks: false,
    trackError: null,
}

const mediaSlice = createSlice({
    name: 'media',
    initialState,
    reducers: {
        // Local tracks management
        setLocalTracks: (state, action: PayloadAction<any[]>) => {
            state.localTracks = action.payload
            state.trackError = null
        },
        clearLocalTracks: (state) => {
            state.localTracks = []
        },
        setIsCreatingTracks: (state, action: PayloadAction<boolean>) => {
            state.isCreatingTracks = action.payload
        },
        setTrackError: (state, action: PayloadAction<string | null>) => {
            state.trackError = action.payload
        },

        // Remote tracks management
        addRemoteTrack: (
            state,
            action: PayloadAction<{ participantId: string; track: any }>
        ) => {
            const { participantId, track } = action.payload
            const tracks = state.remoteTracks.get(participantId) || []
            tracks.push(track)
            state.remoteTracks.set(participantId, tracks)
        },
        removeRemoteTrack: (
            state,
            action: PayloadAction<{ participantId: string; trackId: string }>
        ) => {
            const { participantId, trackId } = action.payload
            const tracks = state.remoteTracks.get(participantId) || []
            const filtered = tracks.filter(
                (track) => track.getId() !== trackId
            )
            if (filtered.length > 0) {
                state.remoteTracks.set(participantId, filtered)
            } else {
                state.remoteTracks.delete(participantId)
            }
        },
        clearRemoteTracks: (state) => {
            state.remoteTracks.clear()
        },

        // Media controls
        setCameraEnabled: (state, action: PayloadAction<boolean>) => {
            state.cameraEnabled = action.payload
        },
        setMicEnabled: (state, action: PayloadAction<boolean>) => {
            state.micEnabled = action.payload
        },
        toggleCamera: (state) => {
            state.cameraEnabled = !state.cameraEnabled
        },
        toggleMic: (state) => {
            state.micEnabled = !state.micEnabled
        },

        // Audio levels
        setAudioLevel: (
            state,
            action: PayloadAction<{ participantId: string; level: number }>
        ) => {
            const { participantId, level } = action.payload
            state.audioLevel.set(participantId, level)
        },

        // Device management
        setDevices: (
            state,
            action: PayloadAction<{
                audioInput: MediaDeviceInfo[]
                audioOutput: MediaDeviceInfo[]
                videoInput: MediaDeviceInfo[]
            }>
        ) => {
            state.devices = action.payload
        },
        setSelectedDevice: (
            state,
            action: PayloadAction<{
                type: 'audioInput' | 'audioOutput' | 'videoInput'
                deviceId: string
            }>
        ) => {
            const { type, deviceId } = action.payload
            state.selectedDevices[type] = deviceId
        },

        // Reset all media state
        resetMediaState: () => initialState,
    },
})

export const {
    setLocalTracks,
    clearLocalTracks,
    setIsCreatingTracks,
    setTrackError,
    addRemoteTrack,
    removeRemoteTrack,
    clearRemoteTracks,
    setCameraEnabled,
    setMicEnabled,
    toggleCamera,
    toggleMic,
    setAudioLevel,
    setDevices,
    setSelectedDevice,
    resetMediaState,
} = mediaSlice.actions

export default mediaSlice.reducer
