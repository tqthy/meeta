/**
 * Type definitions for Jitsi External API (iframe API)
 * Based on: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe
 */

export interface JitsiDevice {
  deviceId: string
  groupId: string
  kind: 'audioinput' | 'videoinput' | 'audiooutput'
  label: string
}

export interface JitsiExternalAPI {
  // Use generic type to allow typed event listeners
  addListener: <T = unknown>(event: string, listener: (data: T) => void) => void
  removeListener: <T = unknown>(event: string, listener: (data: T) => void) => void
  dispose: () => void
  executeCommand: (command: string, ...args: unknown[]) => void
  getAvailableDevices: () => Promise<Record<string, unknown>>
  getCurrentDevices: () => Promise<Record<string, unknown>>
  isAudioMuted: () => Promise<boolean>
  isVideoMuted: () => Promise<boolean>
  // Add more methods as needed
}

// Event data interfaces based on EventListener.txt
export interface VideoConferenceJoinedEvent {
  roomName: string
  id: string
  displayName: string
  avatarURL?: string
  breakoutRoom?: boolean
  visitor?: boolean
}

export interface VideoConferenceLeftEvent {
  roomName: string
}

export interface ParticipantJoinedEvent {
  id: string
  displayName: string
}

export interface ParticipantLeftEvent {
  id: string
}

export interface DisplayNameChangeEvent {
  id: string
  displayname: string
}

export interface ParticipantRoleChangedEvent {
  id: string
  role: string
}

export interface AudioMuteStatusChangedEvent {
  muted: boolean
}

export interface VideoMuteStatusChangedEvent {
  muted: boolean
}

export interface ScreenSharingStatusChangedEvent {
  on: boolean
  details?: {
    sourceType?: string
  }
}

export interface ErrorOccurredEvent {
  details?: object
  message?: string
  name: string
  type: string
  isFatal: boolean
}

export interface DominantSpeakerChangedEvent {
  id: string
}

export interface RaiseHandUpdatedEvent {
  id: string
  handRaised: number
}

export interface ChatUpdatedEvent {
  isOpen: boolean
  unreadCount: number
}

export interface IncomingMessageEvent {
  from: string
  nick: string
  privateMessage: boolean
  message: string
  stamp: string
}
