/**
 * meetingRecordService
 *
 * Persists meeting lifecycle events to the database.
 * Handles meeting.started, meeting.ended, meeting.scheduled, meeting.cancelled events.
 */

import prisma from '../../../../lib/prisma'
import { MeetingStatus } from '../../../../app/generated/prisma'
import type {
    SerializableEvent,
    MeetingStartedPayload,
    MeetingEndedPayload,
    MeetingScheduledPayload,
    MeetingCancelledPayload,
    CreateMeetingDTO,
    UpdateMeetingDTO,
    EventProcessingResult,
} from './types'
import { validateRequiredFields } from './types'

/**
 * Service for persisting meeting lifecycle events
 */
export const meetingRecordService = {
    /**
     * Handle a meeting event and persist to database
     */
    async handleEvent(event: SerializableEvent): Promise<EventProcessingResult> {
        try {
            switch (event.type) {
                case 'meeting.scheduled':
                    await this.processMeetingScheduled(event.payload as MeetingScheduledPayload)
                    break
                case 'meeting.started':
                    await this.processMeetingStarted(event.payload as MeetingStartedPayload)
                    break
                case 'meeting.ended':
                    await this.processMeetingEnded(event.payload as MeetingEndedPayload)
                    break
                case 'meeting.cancelled':
                    await this.processMeetingCancelled(event.payload as MeetingCancelledPayload)
                    break
                default:
                    return {
                        success: false,
                        eventId: event.eventId,
                        eventType: event.type,
                        error: `Unknown meeting event type: ${event.type}`,
                    }
            }

            return {
                success: true,
                eventId: event.eventId,
                eventType: event.type,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error(`[meetingRecordService] Failed to process event ${event.eventId}:`, error)
            return {
                success: false,
                eventId: event.eventId,
                eventType: event.type,
                error: errorMessage,
            }
        }
    },

    /**
     * Process meeting.scheduled event
     */
    async processMeetingScheduled(payload: MeetingScheduledPayload): Promise<void> {
        const validation = validateRequiredFields(payload, [
            'meetingId',
            'roomName',
            'hostUserId',
            'title',
            'scheduledAt',
        ])

        if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
        }

        const dto: CreateMeetingDTO = {
            id: payload.meetingId,
            roomName: payload.roomName,
            title: payload.title,
            description: payload.description,
            hostId: payload.hostUserId,
            scheduledAt: new Date(payload.scheduledAt),
            status: MeetingStatus.SCHEDULED,
        }

        // Upsert to handle duplicate events
        await prisma.meeting.upsert({
            where: { id: dto.id },
            update: {
                title: dto.title,
                description: dto.description,
                scheduledAt: dto.scheduledAt,
            },
            create: {
                id: dto.id,
                roomName: dto.roomName,
                title: dto.title,
                description: dto.description,
                hostId: dto.hostId,
                scheduledAt: dto.scheduledAt,
                status: dto.status,
            },
        })
    },

    /**
     * Process meeting.started event
     */
    async processMeetingStarted(payload: MeetingStartedPayload): Promise<void> {
        const validation = validateRequiredFields(payload, [
            'meetingId',
            'roomName',
            'hostUserId',
            'startedAt',
        ])

        if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
        }

        const startedAt = new Date(payload.startedAt)

        // Upsert: create if not exists (ad-hoc meeting), update if exists (scheduled meeting)
        await prisma.meeting.upsert({
            where: { id: payload.meetingId },
            update: {
                startedAt,
                status: MeetingStatus.ACTIVE,
                ...(payload.title && { title: payload.title }),
                ...(payload.description && { description: payload.description }),
            },
            create: {
                id: payload.meetingId,
                roomName: payload.roomName,
                title: payload.title || `Meeting ${payload.roomName}`,
                description: payload.description,
                hostId: payload.hostUserId,
                startedAt,
                status: MeetingStatus.ACTIVE,
            },
        })
    },

    /**
     * Process meeting.ended event
     */
    async processMeetingEnded(payload: MeetingEndedPayload): Promise<void> {
        const validation = validateRequiredFields(payload, ['meetingId', 'endedAt'])

        if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
        }

        const endedAt = new Date(payload.endedAt)

        const updateData: UpdateMeetingDTO = {
            endedAt,
            status: MeetingStatus.ENDED,
        }

        if (payload.duration !== undefined) {
            updateData.duration = payload.duration
        }

        await prisma.meeting.update({
            where: { id: payload.meetingId },
            data: updateData,
        })
    },

    /**
     * Process meeting.cancelled event
     */
    async processMeetingCancelled(payload: MeetingCancelledPayload): Promise<void> {
        const validation = validateRequiredFields(payload, ['meetingId'])

        if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
        }

        await prisma.meeting.update({
            where: { id: payload.meetingId },
            data: {
                status: MeetingStatus.CANCELLED,
            },
        })
    },

    /**
     * Get a meeting by ID
     */
    async getMeetingById(meetingId: string) {
        return prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                participants: true,
                host: true,
            },
        })
    },

    /**
     * Get a meeting by room name
     */
    async getMeetingByRoomName(roomName: string) {
        return prisma.meeting.findUnique({
            where: { roomName },
            include: {
                participants: true,
                host: true,
            },
        })
    },

    /**
     * Get meetings by host
     */
    async getMeetingsByHost(hostId: string, options?: { status?: MeetingStatus; limit?: number }) {
        return prisma.meeting.findMany({
            where: {
                hostId,
                ...(options?.status && { status: options.status }),
            },
            orderBy: { createdAt: 'desc' },
            take: options?.limit,
            include: {
                participants: true,
            },
        })
    },

    /**
     * Get active meetings
     */
    async getActiveMeetings() {
        return prisma.meeting.findMany({
            where: { status: MeetingStatus.ACTIVE },
            include: {
                participants: true,
                host: true,
            },
        })
    },

    /**
     * Calculate and update meeting duration
     */
    async updateMeetingDuration(meetingId: string): Promise<void> {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            select: { startedAt: true, endedAt: true },
        })

        if (meeting?.startedAt && meeting?.endedAt) {
            const duration = Math.floor(
                (meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 1000
            )

            await prisma.meeting.update({
                where: { id: meetingId },
                data: { duration },
            })
        }
    },
}
