/**
 * Type declarations for lib-jitsi-meet
 * 
 * Comprehensive type definitions based on official Jitsi SDK API documentation.
 * Updated to match JitsiAPI documentation in src/domains/meeting/JitsiAPI/
 * 
 * @see JitsiAPI/4-JitsiMeetJS/Variable_JitsiMeetJS.txt for complete API surface
 * @see JitsiAPI/1-JitsiConference/JitsiConferenceEvents_Enum.txt for event constants
 * @see JitsiAPI/2-JitsiConnection/JitsiConnectionEvents_Enum.txt for connection events
 * @see JitsiAPI/6-JitsiTrack/JitsiTrackEvents_Enum.txt for track events
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'lib-jitsi-meet' {
    interface JitsiMeetJS {
        // Initialization and configuration
        init(options?: {
            disableAudioLevels?: boolean
            enableAnalyticsLogging?: boolean
        }): void

        setLogLevel(level: any): void
        setLogLevelById(loggerId: string, level: any): void
        setGlobalLogOptions(options: any): void
        addGlobalLogTransport(transport: any): void
        removeGlobalLogTransport(transport: any): void

        // Track creation
        createLocalTracks(options?: {
            devices?: string[]
            resolution?: number
            cameraDeviceId?: string
            micDeviceId?: string
            facingMode?: 'user' | 'environment'
            constraints?: any
        }): Promise<any[]>

        createLocalTracksFromMediaStreams(streams: MediaStream[]): any[]
        createTrackVADEmitter(localAudioDeviceId: string, sampleRate: number, vadProcessor: any): any

        // Connection constructor
        JitsiConnection: new (
            appId: string | null,
            token: string | null | undefined,
            options: any
        ) => any

        // Media devices API
        mediaDevices: {
            enumerateDevices(callback: (devices: MediaDeviceInfo[]) => void): void
            isDevicePermissionGranted(type?: string): boolean
            isDeviceChangeAvailable(deviceType?: string): boolean
            isMultipleAudioInputSupported(): boolean
            getAudioOutputDevice(): string
            setAudioOutputDevice(deviceId: string): void
            addEventListener(event: string, listener: (...args: any[]) => void): void
            removeEventListener(event: string, listener: (...args: any[]) => void): void
        }

        // Event constants (aligned with API documentation)
        events: {
            connection: {
                CONNECTION_ESTABLISHED: string
                CONNECTION_FAILED: string
                CONNECTION_DISCONNECTED: string
                CONNECTION_REDIRECTED: string
                DISPLAY_NAME_REQUIRED: string
                PROPERTIES_UPDATED: string
            }
            conference: {
                // Core lifecycle events
                CONFERENCE_JOINED: string
                CONFERENCE_FAILED: string
                CONFERENCE_LEFT: string
                CONFERENCE_JOIN_IN_PROGRESS: string
                CONFERENCE_ERROR: string
                CONFERENCE_UNIQUE_ID_SET: string
                CONFERENCE_CREATED_TIMESTAMP: string

                // Connection state
                CONNECTION_ESTABLISHED: string
                CONNECTION_INTERRUPTED: string
                CONNECTION_RESTORED: string

                // Participant events
                USER_JOINED: string
                USER_LEFT: string
                USER_ROLE_CHANGED: string
                USER_STATUS_CHANGED: string
                DISPLAY_NAME_CHANGED: string
                PARTICIPANT_PROPERTY_CHANGED: string
                PARTICIPANT_FEATURES_CHANGED: string
                PARTICIPANT_KICKED: string
                PARTICIPANT_SOURCE_UPDATED: string

                // Track events
                TRACK_ADDED: string
                TRACK_REMOVED: string
                TRACK_MUTE_CHANGED: string
                TRACK_AUDIO_LEVEL_CHANGED: string
                TRACK_UNMUTE_REJECTED: string

                // Speaker and moderation
                DOMINANT_SPEAKER_CHANGED: string
                SILENT_STATUS_CHANGED: string
                NOISY_MIC: string
                NO_AUDIO_INPUT: string
                TALK_WHILE_MUTED: string

                // P2P and bridge
                P2P_STATUS: string
                SERVER_REGION_CHANGED: string
                DATA_CHANNEL_OPENED: string
                DATA_CHANNEL_CLOSED: string

                // Messaging
                MESSAGE_RECEIVED: string
                PRIVATE_MESSAGE_RECEIVED: string
                ENDPOINT_MESSAGE_RECEIVED: string
                NON_PARTICIPANT_MESSAGE_RECEIVED: string

                // Media and encoding
                AUDIO_INPUT_STATE_CHANGE: string
                AUDIO_UNMUTE_PERMISSIONS_CHANGED: string
                VIDEO_UNMUTE_PERMISSIONS_CHANGED: string
                VIDEO_CODEC_CHANGED: string
                ENCODE_TIME_STATS_RECEIVED: string

                // Moderation
                AV_MODERATION_APPROVED: string
                AV_MODERATION_REJECTED: string
                AV_MODERATION_CHANGED: string
                AV_MODERATION_PARTICIPANT_APPROVED: string
                AV_MODERATION_PARTICIPANT_REJECTED: string

                // Other
                KICKED: string
                LOCK_STATE_CHANGED: string
                SUBJECT_CHANGED: string
                PROPERTIES_CHANGED: string
                SUSPEND_DETECTED: string
                LAST_N_ENDPOINTS_CHANGED: string
                FORWARDED_SOURCES_CHANGED: string
            }
            track: {
                LOCAL_TRACK_STOPPED: string
                NO_AUDIO_INPUT: string
                NO_DATA_FROM_SOURCE: string
                TRACK_AUDIO_LEVEL_CHANGED: string
                TRACK_AUDIO_OUTPUT_CHANGED: string
                TRACK_MUTE_CHANGED: string
                TRACK_OWNER_SET: string
                TRACK_STREAMING_STATUS_CHANGED: string
                TRACK_VIDEOTYPE_CHANGED: string
            }
            mediaDevices: {
                DEVICE_LIST_CHANGED: string
                PERMISSION_PROMPT_IS_SHOWN: string
                PERMISSIONS_CHANGED: string
                SLOW_GET_USER_MEDIA: string
            }
        }

        // Error types
        errors: {
            connection: any
            conference: any
            track: any
        }

        // Log levels
        logLevels: {
            TRACE: any
            DEBUG: any
            INFO: any
            LOG: any
            WARN: any
            ERROR: any
        }

        // Utility methods
        isWebRtcSupported(): boolean
        isDesktopSharingEnabled(): boolean
        isMultipleAudioInputSupported(): boolean
        isCollectingLocalStats(): boolean
        getActiveAudioDevice(): Promise<string>
        setNetworkInfo(info: { isOnline: boolean }): void

        // Advanced features
        version: string
        constants: any
        util: any
        rtcstats: any
    }

    const JitsiMeetJS: JitsiMeetJS
    export default JitsiMeetJS
    export = JitsiMeetJS
}
