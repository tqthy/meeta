/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppDispatch } from '@/store'
import {
    setConnecting,
    setConnected,
    setConnectionError,
    setRoomName,
    setJoining,
    setJoined,
    setConferenceError,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setDominantSpeaker,
    setConnectionInterrupted,
    incrementRetryCount,
    resetRetryCount,
    clearParticipants,
} from '@/store/slices/connectionSlice'
import type { ConnectionError } from '@/store/slices/connectionSlice'

// Dynamically import JitsiMeetJS
let JitsiMeetJS: any = null
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    JitsiMeetJS = require('lib-jitsi-meet')
}

interface ConnectionOptions {
    hosts: {
        domain: string
        muc: string
    }
    serviceUrl: string
    websocketKeepAliveUrl?: string
    appId?: string | null
}

/**
 * JitsiService - Quản lý connection và conference lifecycle
 * - Establish/disconnect Jitsi connection
 * - Join/leave conference
 * - Manage participants
 * - Handle connection events
 */
export class JitsiService {
    private dispatch: AppDispatch
    private connection: any = null
    private conference: any = null
    private roomName: string = ''
    private retryTimeoutId: NodeJS.Timeout | null = null
    private maxRetries: number = 3

    // Event callbacks
    private onConnectionEstablishedCallback?: () => void
    private onConnectionFailedCallback?: (error: ConnectionError) => void
    private onConferenceJoinedCallback?: (room: string) => void
    private onConferenceLeftCallback?: (room: string) => void
    private onConferenceFailedCallback?: (error: ConnectionError) => void

    constructor(dispatch: AppDispatch) {
        this.dispatch = dispatch

        // Initialize JitsiMeetJS if not already done
        if (JitsiMeetJS && typeof window !== 'undefined') {
            try {
                JitsiMeetJS.init({
                    disableAudioLevels: false,
                    enableAnalyticsLogging: false,
                })
                JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR)
                console.log('[JitsiService] JitsiMeetJS initialized')
            } catch (error) {
                console.error('[JitsiService] Init failed:', error)
            }
        }
    }

    /**
     * Set callbacks
     */
    setCallbacks(callbacks: {
        onConnectionEstablished?: () => void
        onConnectionFailed?: (error: ConnectionError) => void
        onConferenceJoined?: (room: string) => void
        onConferenceLeft?: (room: string) => void
        onConferenceFailed?: (error: ConnectionError) => void
    }): void {
        this.onConnectionEstablishedCallback = callbacks.onConnectionEstablished
        this.onConnectionFailedCallback = callbacks.onConnectionFailed
        this.onConferenceJoinedCallback = callbacks.onConferenceJoined
        this.onConferenceLeftCallback = callbacks.onConferenceLeft
        this.onConferenceFailedCallback = callbacks.onConferenceFailed
    }

    /**
     * Build connection options
     */
    private buildConnectionOptions(roomName: string): ConnectionOptions {
        const baseUrl =
            process.env.NEXT_PUBLIC_JITSI_WS_URL || 'ws://localhost:8000'
        const keepAliveUrl = baseUrl
            .replace('ws://', 'http://')
            .replace('wss://', 'https://')

        return {
            hosts: {
                domain: 'meet.jitsi',
                muc: 'muc.meet.jitsi',
            },
            serviceUrl: `${baseUrl}/xmpp-websocket?room=${roomName}`,
            websocketKeepAliveUrl: `${keepAliveUrl}/xmpp-websocket`,
        }
    }

    /**
     * Connect to Jitsi server
     */
    async connect(roomName: string, jwt?: string): Promise<void> {
        if (!JitsiMeetJS) {
            throw new Error('JitsiMeetJS not available')
        }

        if (this.connection) {
            console.warn('[JitsiService] Connection already exists')
            return
        }

        this.roomName = roomName
        this.dispatch(setRoomName(roomName))
        this.dispatch(setConnecting(true))

        try {
            console.log('[JitsiService] Creating connection...')
            const connectionOptions = this.buildConnectionOptions(roomName)
            const jitsiJwt = jwt || process.env.NEXT_PUBLIC_JITSI_JWT || null

            this.connection = new JitsiMeetJS.JitsiConnection(
                connectionOptions.appId,
                jitsiJwt,
                connectionOptions
            )

            // Setup connection event handlers
            this.setupConnectionHandlers()

            // Connect
            this.connection.connect()
        } catch (error) {
            console.error('[JitsiService] Connection error:', error)
            this.dispatch(setConnecting(false))
            throw error
        }
    }

    /**
     * Setup connection event handlers
     */
    private setupConnectionHandlers(): void {
        if (!this.connection) return

        // Connection established
        this.connection.addEventListener(
            JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
            this.handleConnectionEstablished.bind(this)
        )

        // Connection failed
        this.connection.addEventListener(
            JitsiMeetJS.events.connection.CONNECTION_FAILED,
            this.handleConnectionFailed.bind(this)
        )

        // Connection disconnected
        this.connection.addEventListener(
            JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
            this.handleConnectionDisconnected.bind(this)
        )
    }

    /**
     * Handle connection established
     */
    private handleConnectionEstablished(): void {
        console.log('[JitsiService] Connection established!')

        this.dispatch(setConnected(true))
        this.dispatch(resetRetryCount())

        if (this.retryTimeoutId) {
            clearTimeout(this.retryTimeoutId)
            this.retryTimeoutId = null
        }

        this.onConnectionEstablishedCallback?.()
    }

    /**
     * Handle connection failed
     */
    private handleConnectionFailed(
        errorCode: string,
        errorMessage: string,
        ...params: any[]
    ): void {
        console.error('[JitsiService] Connection failed!', {
            errorCode,
            errorMessage,
            params,
        })

        const error: ConnectionError = {
            name: errorCode,
            message: errorMessage,
            params: params[0],
        }

        this.dispatch(setConnectionError(error))

        // Retry logic
        const state = this.dispatch((_, getState) => getState().connection)
        if (state.retryCount < this.maxRetries) {
            this.dispatch(incrementRetryCount())
            const retryDelay = Math.min(
                1000 * Math.pow(2, state.retryCount + 1),
                5000
            )

            console.log(
                `[JitsiService] Retrying in ${retryDelay}ms (attempt ${state.retryCount + 1}/${this.maxRetries})`
            )

            this.retryTimeoutId = setTimeout(() => {
                if (this.connection) {
                    this.connection.connect()
                }
            }, retryDelay)
        } else {
            console.error('[JitsiService] Max retry attempts reached')
            this.onConnectionFailedCallback?.(error)
        }
    }

    /**
     * Handle connection disconnected
     */
    private handleConnectionDisconnected(): void {
        console.log('[JitsiService] Connection disconnected')
        this.dispatch(setConnected(false))
    }

    /**
     * Join conference with local tracks
     */
    async joinConference(
        userName: string,
        localTracks: any[]
    ): Promise<void> {
        if (!this.connection) {
            throw new Error('Connection not established')
        }

        if (this.conference) {
            console.warn('[JitsiService] Already in conference')
            return
        }

        this.dispatch(setJoining(true))

        try {
            console.log('[JitsiService] Creating conference...')
            this.conference = this.connection.initJitsiConference(
                this.roomName.toLowerCase(),
                {
                    openBridgeChannel: true,
                }
            )

            // Setup conference event handlers
            this.setupConferenceHandlers()

            // Set display name
            this.conference.setDisplayName(userName)

            // Join conference
            this.conference.join()

            // Add local tracks after joining
            // Note: Tracks are added in CONFERENCE_JOINED handler
            this.addTracksToConference(localTracks)
        } catch (error) {
            console.error('[JitsiService] Join conference error:', error)
            this.dispatch(setJoining(false))
            throw error
        }
    }

    /**
     * Setup conference event handlers
     */
    private setupConferenceHandlers(): void {
        if (!this.conference) return

        // Conference joined
        this.conference.on(
            JitsiMeetJS.events.conference.CONFERENCE_JOINED,
            this.handleConferenceJoined.bind(this)
        )

        // Conference left
        this.conference.on(
            JitsiMeetJS.events.conference.CONFERENCE_LEFT,
            this.handleConferenceLeft.bind(this)
        )

        // Conference failed
        this.conference.on(
            JitsiMeetJS.events.conference.CONFERENCE_FAILED,
            this.handleConferenceFailed.bind(this)
        )

        // User joined
        this.conference.on(
            JitsiMeetJS.events.conference.USER_JOINED,
            this.handleUserJoined.bind(this)
        )

        // User left
        this.conference.on(
            JitsiMeetJS.events.conference.USER_LEFT,
            this.handleUserLeft.bind(this)
        )

        // Display name changed
        this.conference.on(
            JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
            this.handleDisplayNameChanged.bind(this)
        )

        // Dominant speaker changed
        this.conference.on(
            JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED,
            this.handleDominantSpeakerChanged.bind(this)
        )

        // Connection interrupted
        this.conference.on(
            JitsiMeetJS.events.conference.CONNECTION_INTERRUPTED,
            this.handleConnectionInterrupted.bind(this)
        )

        // Connection restored
        this.conference.on(
            JitsiMeetJS.events.conference.CONNECTION_RESTORED,
            this.handleConnectionRestored.bind(this)
        )
    }

    /**
     * Handle conference joined
     */
    private handleConferenceJoined(): void {
        console.log('[JitsiService] Conference joined!')
        this.dispatch(setJoined(true))
        this.onConferenceJoinedCallback?.(this.roomName)
    }

    /**
     * Handle conference left
     */
    private handleConferenceLeft(): void {
        console.log('[JitsiService] Conference left!')
        this.dispatch(setJoined(false))
        this.dispatch(clearParticipants())
        this.onConferenceLeftCallback?.(this.roomName)
    }

    /**
     * Handle conference failed
     */
    private handleConferenceFailed(
        errorCode: string,
        errorMessage: string,
        ...params: any[]
    ): void {
        console.error('[JitsiService] Conference failed!', {
            errorCode,
            errorMessage,
            params,
        })

        const error: ConnectionError = {
            name: errorCode,
            message: errorMessage,
            params: params[0],
        }

        this.dispatch(setConferenceError(error))
        this.onConferenceFailedCallback?.(error)
    }

    /**
     * Handle user joined
     */
    private handleUserJoined(id: string): void {
        const participant = this.conference.getParticipantById(id)
        const displayName = participant?.getDisplayName() || id

        console.log('[JitsiService] User joined:', displayName, '(', id, ')')

        this.dispatch(
            addParticipant({
                id,
                displayName,
                isDominantSpeaker: false,
            })
        )
    }

    /**
     * Handle user left
     */
    private handleUserLeft(id: string): void {
        console.log('[JitsiService] User left:', id)
        this.dispatch(removeParticipant(id))
    }

    /**
     * Handle display name changed
     */
    private handleDisplayNameChanged(id: string, displayName: string): void {
        console.log('[JitsiService] Display name changed:', id, displayName)
        this.dispatch(updateParticipant({ id, updates: { displayName } }))
    }

    /**
     * Handle dominant speaker changed
     */
    private handleDominantSpeakerChanged(id: string): void {
        console.log('[JitsiService] Dominant speaker:', id)
        this.dispatch(setDominantSpeaker(id))
    }

    /**
     * Handle connection interrupted
     */
    private handleConnectionInterrupted(): void {
        console.warn('[JitsiService] Connection interrupted')
        this.dispatch(setConnectionInterrupted(true))
    }

    /**
     * Handle connection restored
     */
    private handleConnectionRestored(): void {
        console.log('[JitsiService] Connection restored')
        this.dispatch(setConnectionInterrupted(false))
    }

    /**
     * Add tracks to conference
     */
    private addTracksToConference(tracks: any[]): void {
        if (!this.conference) return

        tracks.forEach((track) => {
            this.conference
                .addTrack(track)
                .catch((error: any) => {
                    console.error('[JitsiService] Failed to add track:', error)
                })
        })
    }

    /**
     * Leave conference
     */
    async leaveConference(): Promise<void> {
        if (!this.conference) {
            console.warn('[JitsiService] No conference to leave')
            return
        }

        try {
            console.log('[JitsiService] Leaving conference...')
            await this.conference.leave()
            this.conference = null
        } catch (error) {
            console.error('[JitsiService] Failed to leave conference:', error)
        }
    }

    /**
     * Disconnect from Jitsi
     */
    disconnect(): void {
        if (!this.connection) {
            console.warn('[JitsiService] No connection to disconnect')
            return
        }

        console.log('[JitsiService] Disconnecting...')

        // Clear retry timeout
        if (this.retryTimeoutId) {
            clearTimeout(this.retryTimeoutId)
            this.retryTimeoutId = null
        }

        // Disconnect
        this.connection.disconnect()
        this.connection = null
    }

    /**
     * Get conference instance
     */
    getConference(): any {
        return this.conference
    }

    /**
     * Get connection instance
     */
    getConnection(): any {
        return this.connection
    }

    /**
     * Complete cleanup
     */
    async cleanup(): Promise<void> {
        console.log('[JitsiService] Complete cleanup...')
        await this.leaveConference()
        this.disconnect()
    }
}
