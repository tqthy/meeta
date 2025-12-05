/**
 * trackStore
 *
 * Redux slice for track state.
 * Manages local and remote track references, mute states, and device info.
 * Stores serializable payloads only - no SDK objects.
 *
 * @see JitsiAPI/6-JitsiTrack for track model reference
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    TrackState,
    LocalTrackInfo,
    RemoteTrackInfo,
    DeviceInfo,
} from '../types/tracks'

const initialState: TrackState = {
    localAudioTrack: null,
    localVideoTrack: null,
    remoteTracks: {},
    audioInputDevices: [],
    audioOutputDevices: [],
    videoInputDevices: [],
    selectedAudioInputId: null,
    selectedAudioOutputId: null,
    selectedVideoInputId: null,
    audioPermissionGranted: false,
    videoPermissionGranted: false,
    isCreatingAudioTrack: false,
    isCreatingVideoTrack: false,
}

export const trackSlice = createSlice({
    name: 'tracks',
    initialState,
    reducers: {
        // Local track actions
        setLocalAudioTrack: (
            state,
            action: PayloadAction<LocalTrackInfo | null>
        ) => {
            state.localAudioTrack = action.payload
        },

        setLocalVideoTrack: (
            state,
            action: PayloadAction<LocalTrackInfo | null>
        ) => {
            state.localVideoTrack = action.payload
        },

        updateLocalAudioMuted: (state, action: PayloadAction<boolean>) => {
            if (state.localAudioTrack) {
                state.localAudioTrack.isMuted = action.payload
            }
        },

        updateLocalVideoMuted: (state, action: PayloadAction<boolean>) => {
            if (state.localVideoTrack) {
                state.localVideoTrack.isMuted = action.payload
            }
        },

        // Remote track actions
        addRemoteTrack: (state, action: PayloadAction<RemoteTrackInfo>) => {
            state.remoteTracks[action.payload.id] = action.payload
        },

        updateRemoteTrack: (
            state,
            action: PayloadAction<{
                id: string
                updates: Partial<RemoteTrackInfo>
            }>
        ) => {
            const { id, updates } = action.payload
            if (state.remoteTracks[id]) {
                state.remoteTracks[id] = {
                    ...state.remoteTracks[id],
                    ...updates,
                }
            }
        },

        removeRemoteTrack: (state, action: PayloadAction<string>) => {
            delete state.remoteTracks[action.payload]
        },

        removeRemoteTracksByParticipant: (
            state,
            action: PayloadAction<string>
        ) => {
            const participantId = action.payload
            Object.keys(state.remoteTracks).forEach((trackId) => {
                if (state.remoteTracks[trackId].participantId === participantId) {
                    delete state.remoteTracks[trackId]
                }
            })
        },

        clearRemoteTracks: (state) => {
            state.remoteTracks = {}
        },

        // Device management
        setAudioInputDevices: (state, action: PayloadAction<DeviceInfo[]>) => {
            state.audioInputDevices = action.payload
        },

        setAudioOutputDevices: (state, action: PayloadAction<DeviceInfo[]>) => {
            state.audioOutputDevices = action.payload
        },

        setVideoInputDevices: (state, action: PayloadAction<DeviceInfo[]>) => {
            state.videoInputDevices = action.payload
        },

        setSelectedAudioInput: (
            state,
            action: PayloadAction<string | null>
        ) => {
            state.selectedAudioInputId = action.payload
        },

        setSelectedAudioOutput: (
            state,
            action: PayloadAction<string | null>
        ) => {
            state.selectedAudioOutputId = action.payload
        },

        setSelectedVideoInput: (
            state,
            action: PayloadAction<string | null>
        ) => {
            state.selectedVideoInputId = action.payload
        },

        // Permissions
        setAudioPermission: (state, action: PayloadAction<boolean>) => {
            state.audioPermissionGranted = action.payload
        },

        setVideoPermission: (state, action: PayloadAction<boolean>) => {
            state.videoPermissionGranted = action.payload
        },

        // Loading states
        setCreatingAudioTrack: (state, action: PayloadAction<boolean>) => {
            state.isCreatingAudioTrack = action.payload
        },

        setCreatingVideoTrack: (state, action: PayloadAction<boolean>) => {
            state.isCreatingVideoTrack = action.payload
        },

        // Reset state
        resetTrackState: () => initialState,
    },
})

export const {
    setLocalAudioTrack,
    setLocalVideoTrack,
    updateLocalAudioMuted,
    updateLocalVideoMuted,
    addRemoteTrack,
    updateRemoteTrack,
    removeRemoteTrack,
    removeRemoteTracksByParticipant,
    clearRemoteTracks,
    setAudioInputDevices,
    setAudioOutputDevices,
    setVideoInputDevices,
    setSelectedAudioInput,
    setSelectedAudioOutput,
    setSelectedVideoInput,
    setAudioPermission,
    setVideoPermission,
    setCreatingAudioTrack,
    setCreatingVideoTrack,
    resetTrackState,
} = trackSlice.actions

export default trackSlice.reducer
