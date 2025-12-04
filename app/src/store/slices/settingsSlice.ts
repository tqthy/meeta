import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'

interface DevicePreference {
    deviceId: string
    deviceLabel: string
}

interface SettingsState {
    // Device preferences (user's explicitly selected devices)
    preferredCameraDeviceId: string | null
    preferredCameraDeviceLabel: string | null
    preferredMicDeviceId: string | null
    preferredMicDeviceLabel: string | null
    preferredAudioOutputDeviceId: string | null
    preferredAudioOutputDeviceLabel: string | null

    // Display preferences
    displayName: string | null

    // Quality preferences
    videoQuality: 'low' | 'medium' | 'high'

    // Notification preferences
    soundEnabled: boolean
    notificationsEnabled: boolean
}

const initialState: SettingsState = {
    preferredCameraDeviceId: null,
    preferredCameraDeviceLabel: null,
    preferredMicDeviceId: null,
    preferredMicDeviceLabel: null,
    preferredAudioOutputDeviceId: null,
    preferredAudioOutputDeviceLabel: null,
    displayName: null,
    videoQuality: 'high',
    soundEnabled: true,
    notificationsEnabled: true,
}

export const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setPreferredCameraDeviceId: (
            state,
            action: PayloadAction<DevicePreference>
        ) => {
            state.preferredCameraDeviceId = action.payload.deviceId
            state.preferredCameraDeviceLabel = action.payload.deviceLabel
        },
        setPreferredMicDeviceId: (
            state,
            action: PayloadAction<DevicePreference>
        ) => {
            state.preferredMicDeviceId = action.payload.deviceId
            state.preferredMicDeviceLabel = action.payload.deviceLabel
        },
        setPreferredAudioOutputDeviceId: (
            state,
            action: PayloadAction<DevicePreference>
        ) => {
            state.preferredAudioOutputDeviceId = action.payload.deviceId
            state.preferredAudioOutputDeviceLabel = action.payload.deviceLabel
        },
        setDisplayName: (state, action: PayloadAction<string>) => {
            state.displayName = action.payload
        },
        setVideoQuality: (
            state,
            action: PayloadAction<'low' | 'medium' | 'high'>
        ) => {
            state.videoQuality = action.payload
        },
        setSoundEnabled: (state, action: PayloadAction<boolean>) => {
            state.soundEnabled = action.payload
        },
        setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
            state.notificationsEnabled = action.payload
        },
        resetSettings: () => initialState,
    },
})

export const {
    setPreferredCameraDeviceId,
    setPreferredMicDeviceId,
    setPreferredAudioOutputDeviceId,
    setDisplayName,
    setVideoQuality,
    setSoundEnabled,
    setNotificationsEnabled,
    resetSettings,
} = settingsSlice.actions

// Selectors
export const selectPreferredCameraDeviceId = (state: RootState) =>
    state.settings.preferredCameraDeviceId
export const selectPreferredMicDeviceId = (state: RootState) =>
    state.settings.preferredMicDeviceId
export const selectPreferredAudioOutputDeviceId = (state: RootState) =>
    state.settings.preferredAudioOutputDeviceId
export const selectDisplayName = (state: RootState) =>
    state.settings.displayName
export const selectVideoQuality = (state: RootState) =>
    state.settings.videoQuality
export const selectSoundEnabled = (state: RootState) =>
    state.settings.soundEnabled
export const selectNotificationsEnabled = (state: RootState) =>
    state.settings.notificationsEnabled

export default settingsSlice.reducer
