/**
 * meetingLogService
 *
 * Persists raw events for auditing and replay.
 * Implements deduplication using eventId to prevent double-processing.
 * Stores events in MeetingLog table with processing status.
 */

import prisma from '../../../../lib/prisma'
import { MeetingStatus } from '../../../../app/generated/prisma'
import type {
    SerializableEvent,
    EventLogDTO,
    EventProcessingResult,
    MeetingDatabaseEvent,
} from './types'
import { isMeetingEvent, isParticipantEvent, isTrackEvent, isMediaEvent } from './types'
import { meetingRecordService } from './meetingRecordService'
import { participantRecordService } from './participantRecordService'
import { transcriptRecordService, isTranscriptionEvent } from './transcriptRecordService'

/**
 * Service for persisting and processing event logs
 */
export const meetingLogService = {
    /**
     * Record a raw event for auditing
     * Returns the event log ID for traceability
     * Uses eventId as unique constraint to prevent duplicate processing
     */
    async recordEvent(event: SerializableEvent): Promise<{ id: string; alreadyProcessed: boolean }> {
        // Extract roomName from event (event.meetingId is actually the roomName)
        const roomName = event.meetingId || this.extractRoomName(event)

        // Find the active meeting with this roomName to get the actual database meetingId
        const actualMeetingId = await this.resolveMeetingId(roomName)

        if (!actualMeetingId) {
            // throw new Error(`Cannot record event: active meeting not found for roomName ${roomName}`)
            console.warn(`[meetingLogService] Warning: active meeting not found for roomName ${roomName}. Event will not be recorded.`)
            return { id: '', alreadyProcessed: false }
        }

        const dto: EventLogDTO = {
            eventId: event.eventId,
            meetingId: actualMeetingId, // Use the actual database meeting ID
            eventType: event.type,
            payload: event.payload as Record<string, unknown>,
            timestamp: new Date(event.timestamp),
            status: 'pending',
        }

        try {
            // Try to create - will fail if eventId already exists
            const log = await prisma.meetingLog.create({
                data: {
                    eventId: dto.eventId,
                    meetingId: dto.meetingId,
                    eventType: dto.eventType,
                    payload: JSON.parse(JSON.stringify(dto.payload)),
                    timestamp: dto.timestamp,
                    status: dto.status,
                },
            })

            return { id: log.id, alreadyProcessed: false }
        } catch (error: unknown) {
            // Handle unique constraint violation - event already processed
            if (this.isPrismaUniqueConstraintError(error)) {
                const existingLog = await prisma.meetingLog.findUnique({
                    where: { eventId: dto.eventId },
                })
                if (!existingLog) {
                    throw new Error(`Event with eventId ${dto.eventId} not found after unique constraint violation`)
                }
                return { id: existingLog.id, alreadyProcessed: true }
            }
            throw error
        }
    },

    /**
     * Resolve the actual database meeting ID from a roomName
     * Looks up the active meeting with the given roomName
     */
    async resolveMeetingId(roomName: string): Promise<string | null> {
        if (!roomName) {
            return null
        }

        const meeting = await prisma.meeting.findFirst({
            where: {
                roomName,
                status: MeetingStatus.ACTIVE,
            },
            select: { id: true },
            orderBy: { createdAt: 'desc' },
        })

        return meeting?.id || null
    },

    /**
     * Process an event: record it and route to appropriate service
     * Implements idempotency - won't reprocess already processed events
     */
    async processEvent(event: SerializableEvent): Promise<EventProcessingResult> {
        // First, record the event
        const { id: logId, alreadyProcessed } = await this.recordEvent(event)

        // Skip if already processed
        if (alreadyProcessed) {
            return {
                success: true,
                eventId: event.eventId,
                eventType: event.type,
            }
        }

        try {
            // Route to appropriate service
            let result: EventProcessingResult

            if (isMeetingEvent(event)) {
                result = await meetingRecordService.handleEvent(event)
            } else if (isParticipantEvent(event)) {
                result = await participantRecordService.handleEvent(event)
            } else if (isTrackEvent(event)) {
                // Track events are typically just logged, not processed further
                result = {
                    success: true,
                    eventId: event.eventId,
                    eventType: event.type,
                }
            } else if (isTranscriptionEvent(event)) {
                // Transcription events are routed to transcriptRecordService
                result = await transcriptRecordService.handleEvent(event)
            } else if (isMediaEvent(event)) {
                // Media events (audio/video mute, screen share, etc.) are logged but not processed further
                // They can be used for analytics and audit trails
                console.log(`[meetingLogService] Media event recorded: ${event.type}`)
                result = {
                    success: true,
                    eventId: event.eventId,
                    eventType: event.type,
                }
            } else {
                result = {
                    success: false,
                    eventId: event.eventId,
                    eventType: event.type,
                    error: `Unknown event type: ${event.type}`,
                }
            }

            // Update log status based on result
            await this.updateEventStatus(
                logId,
                result.success ? 'processed' : 'failed',
                result.error
            )

            return result
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            await this.updateEventStatus(logId, 'failed', errorMessage)
            return {
                success: false,
                eventId: event.eventId,
                eventType: event.type,
                error: errorMessage,
            }
        }
    },

    /**
     * Process multiple events in batch
     * Returns results for each event
     */
    async processEvents(events: SerializableEvent[]): Promise<EventProcessingResult[]> {
        const results: EventProcessingResult[] = []

        for (const event of events) {
            const result = await this.processEvent(event)
            results.push(result)
        }

        return results
    },

    /**
     * Update event processing status
     */
    async updateEventStatus(
        logId: string,
        status: 'pending' | 'processed' | 'failed',
        error?: string
    ): Promise<void> {
        await prisma.meetingLog.update({
            where: { id: logId },
            data: {
                status,
                error,
                processedAt: status !== 'pending' ? new Date() : undefined,
            },
        })
    },

    /**
     * Get event logs for a meeting
     */
    async getEventsByMeeting(
        meetingId: string,
        options?: {
            status?: 'pending' | 'processed' | 'failed'
            eventType?: string
            limit?: number
        }
    ) {
        return prisma.meetingLog.findMany({
            where: {
                meetingId,
                ...(options?.status && { status: options.status }),
                ...(options?.eventType && { eventType: options.eventType }),
            },
            orderBy: { timestamp: 'asc' },
            take: options?.limit,
        })
    },

    /**
     * Get event logs by roomName (useful for querying by Daily.co room)
     */
    async getEventsByRoomName(
        roomName: string,
        options?: {
            status?: 'pending' | 'processed' | 'failed'
            eventType?: string
            limit?: number
        }
    ) {
        // Find all meetings with this roomName
        const meetings = await prisma.meeting.findMany({
            where: { roomName },
            select: { id: true },
        })

        const meetingIds = meetings.map(m => m.id)

        return prisma.meetingLog.findMany({
            where: {
                meetingId: { in: meetingIds },
                ...(options?.status && { status: options.status }),
                ...(options?.eventType && { eventType: options.eventType }),
            },
            orderBy: { timestamp: 'asc' },
            take: options?.limit,
        })
    },

    /**
     * Get failed events for retry
     */
    async getFailedEvents(options?: { limit?: number; olderThan?: Date }) {
        return prisma.meetingLog.findMany({
            where: {
                status: 'failed',
                ...(options?.olderThan && { timestamp: { lt: options.olderThan } }),
            },
            orderBy: { timestamp: 'asc' },
            take: options?.limit,
        })
    },

    /**
     * Retry a failed event
     */
    async retryEvent(logId: string): Promise<EventProcessingResult> {
        const log = await prisma.meetingLog.findUnique({
            where: { id: logId },
        })

        if (!log) {
            return {
                success: false,
                eventId: '',
                eventType: '',
                error: `Event log not found: ${logId}`,
            }
        }

        // Reconstruct the event
        const event: SerializableEvent = {
            eventId: log.eventId,
            type: log.eventType,
            payload: log.payload as Record<string, unknown>,
            timestamp: log.timestamp.getTime(),
            meetingId: log.meetingId,
        }

        // Reset status to pending before retry
        await this.updateEventStatus(logId, 'pending')

        // Process the event
        try {
            let result: EventProcessingResult

            if (isMeetingEvent(event as MeetingDatabaseEvent)) {
                result = await meetingRecordService.handleEvent(event)
            } else if (isParticipantEvent(event as MeetingDatabaseEvent)) {
                result = await participantRecordService.handleEvent(event)
            } else {
                result = {
                    success: true,
                    eventId: event.eventId,
                    eventType: event.type,
                }
            }

            await this.updateEventStatus(logId, result.success ? 'processed' : 'failed', result.error)
            return result
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            await this.updateEventStatus(logId, 'failed', errorMessage)
            return {
                success: false,
                eventId: event.eventId,
                eventType: event.type,
                error: errorMessage,
            }
        }
    },

    /**
     * Get event by eventId
     */
    async getEventByEventId(eventId: string) {
        return prisma.meetingLog.findUnique({
            where: { eventId },
        })
    },

    /**
     * Check if an event has been processed
     */
    async isEventProcessed(eventId: string): Promise<boolean> {
        const log = await prisma.meetingLog.findUnique({
            where: { eventId },
            select: { status: true },
        })
        return log?.status === 'processed'
    },

    /**
     * Get processing statistics
     */
    async getProcessingStats(meetingId?: string) {
        const where = meetingId ? { meetingId } : {}

        const [total, pending, processed, failed] = await Promise.all([
            prisma.meetingLog.count({ where }),
            prisma.meetingLog.count({ where: { ...where, status: 'pending' } }),
            prisma.meetingLog.count({ where: { ...where, status: 'processed' } }),
            prisma.meetingLog.count({ where: { ...where, status: 'failed' } }),
        ])

        return { total, pending, processed, failed }
    },

    /**
     * Delete old processed events (for cleanup)
     */
    async deleteOldEvents(olderThan: Date, options?: { onlyProcessed?: boolean }) {
        return prisma.meetingLog.deleteMany({
            where: {
                timestamp: { lt: olderThan },
                ...(options?.onlyProcessed && { status: 'processed' }),
            },
        })
    },

    /**
     * Extract roomName from event payload if not provided at top level
     */
    extractRoomName(event: SerializableEvent): string {
        const payload = event.payload as Record<string, unknown>
        return (payload?.meetingId as string) || ''
    },

    /**
     * Check if error is a Prisma unique constraint violation
     */
    isPrismaUniqueConstraintError(error: unknown): boolean {
        return (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code: string }).code === 'P2002'
        )
    },
}