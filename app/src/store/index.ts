import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import mediaReducer from './slices/mediaSlice'
import connectionReducer from './slices/connectionSlice'
import participantsReducer from './slices/participantsSlice'
import settingsReducer from './slices/settingsSlice'

export const store = configureStore({
    reducer: {
        media: mediaReducer,
        connection: connectionReducer,
        participants: participantsReducer,
        settings: settingsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these paths in the state for serialization checks
                // JitsiTrack objects are not serializable
                ignoredActions: [
                    'media/setLocalTracks',
                    'media/addRemoteTrack',
                    'media/removeRemoteTrack',
                    'participants/updateParticipantTracks',
                    'participants/addRemoteParticipant',
                    'participants/setLocalParticipant',
                    'connection/addParticipant',
                ],
                ignoredPaths: [
                    'media.localTracks',
                    'media.remoteTracks',
                    'participants.localParticipant.videoTrack',
                    'participants.localParticipant.audioTrack',
                    'participants.remoteParticipants',
                    'connection.participants',
                ],
            },
        }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
