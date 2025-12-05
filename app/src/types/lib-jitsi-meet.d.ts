/**
 * Type declarations for lib-jitsi-meet
 * 
 * This provides minimal type definitions for the lib-jitsi-meet SDK.
 * The actual SDK is dynamically typed, so we use 'any' for most types.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'lib-jitsi-meet' {
    interface JitsiMeetJS {
        init(options?: {
            disableAudioLevels?: boolean
            enableAnalyticsLogging?: boolean
        }): void

        setLogLevel(level: any): void

        createLocalTracks(options?: {
            devices?: string[]
            resolution?: number
            cameraDeviceId?: string
            micDeviceId?: string
        }): Promise<any[]>

        JitsiConnection: new (
            appId: string | null,
            token: string | null | undefined,
            options: any
        ) => any

        mediaDevices: {
            enumerateDevices(callback: (devices: MediaDeviceInfo[]) => void): void
            isDevicePermissionGranted(type?: string): boolean
            setAudioOutputDevice(deviceId: string): void
            addEventListener(event: string, listener: (...args: any[]) => void): void
            removeEventListener(event: string, listener: (...args: any[]) => void): void
        }

        events: {
            connection: {
                CONNECTION_ESTABLISHED: string
                CONNECTION_FAILED: string
                CONNECTION_DISCONNECTED: string
                DISPLAY_NAME_REQUIRED: string
            }
            conference: {
                CONFERENCE_JOINED: string
                CONFERENCE_FAILED: string
                CONFERENCE_LEFT: string
                USER_JOINED: string
                USER_LEFT: string
                TRACK_ADDED: string
                TRACK_REMOVED: string
                TRACK_MUTE_CHANGED: string
                DOMINANT_SPEAKER_CHANGED: string
                DISPLAY_NAME_CHANGED: string
            }
            track: {
                TRACK_MUTE_CHANGED: string
                TRACK_AUDIO_LEVEL_CHANGED: string
                LOCAL_TRACK_STOPPED: string
            }
            mediaDevices: {
                DEVICE_LIST_CHANGED: string
            }
        }

        errors: {
            connection: any
            conference: any
            track: any
        }

        logLevels: {
            TRACE: any
            DEBUG: any
            INFO: any
            LOG: any
            WARN: any
            ERROR: any
        }
    }

    const JitsiMeetJS: JitsiMeetJS
    export default JitsiMeetJS
    export = JitsiMeetJS
}
