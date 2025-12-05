/**
 * Track Domain Types
 *
 * Type definitions for track-related data structures.
 *
 * @see JitsiAPI/6-JitsiTrack for track model reference
 */

/**
 * Media type for tracks
 */
export type MediaType = 'audio' | 'video'

/**
 * Video type classification
 */
export type VideoType = 'camera' | 'desktop'

/**
 * Track streaming status
 */
export type TrackStreamingStatus =
    | 'active'
    | 'inactive'
    | 'interrupted'
    | 'restoring'

/**
 * Represents a local track (camera/microphone)
 * Serializable metadata - actual track stored separately
 */
export interface LocalTrackInfo {
    id: string
    type: MediaType
    videoType?: VideoType
    deviceId: string
    isMuted: boolean
    isActive: boolean
}

/**
 * Represents a remote participant's track
 * Serializable metadata - actual track stored separately
 */
export interface RemoteTrackInfo {
    id: string
    participantId: string
    type: MediaType
    videoType?: VideoType
    isMuted: boolean
    streamingStatus: TrackStreamingStatus
}

/**
 * Device information for media devices
 */
export interface DeviceInfo {
    deviceId: string
    label: string
    kind: 'audioinput' | 'audiooutput' | 'videoinput'
    groupId: string
}

/**
 * Redux state for the tracks domain
 */
export interface TrackState {
    // Local tracks
    localAudioTrack: LocalTrackInfo | null
    localVideoTrack: LocalTrackInfo | null

    // Remote tracks map (trackId -> RemoteTrackInfo)
    remoteTracks: Record<string, RemoteTrackInfo>

    // Device lists
    audioInputDevices: DeviceInfo[]
    audioOutputDevices: DeviceInfo[]
    videoInputDevices: DeviceInfo[]

    // Selected devices
    selectedAudioInputId: string | null
    selectedAudioOutputId: string | null
    selectedVideoInputId: string | null

    // Permissions
    audioPermissionGranted: boolean
    videoPermissionGranted: boolean

    // Loading states
    isCreatingAudioTrack: boolean
    isCreatingVideoTrack: boolean
}
