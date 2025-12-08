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
            'title',
            'scheduledAt',
        ])

        if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
        }

        let validHostId = null
        if (payload.hostUserId) {
            const hostExists = await prisma.user.findUnique({
                where: { id: payload.hostUserId },
                select: { id: true },
            })
            validHostId = hostExists ? payload.hostUserId : null
        }

        const dto: CreateMeetingDTO = {
            id: payload.meetingId,
            roomName: payload.roomName,
            title: payload.title,
            description: payload.description,
            hostId: validHostId || "(unknown)",
            scheduledAt: new Date(payload.scheduledAt),
            status: MeetingStatus.SCHEDULED,
        }

        const existingMeeting = await prisma.meeting.findUnique({
            where: { id: dto.id },
            select: { id: true },
        })

        if (existingMeeting) {
            await prisma.meeting.update({
                where: { id: dto.id },
                data: {
                    title: dto.title,
                    description: dto.description,
                    scheduledAt: dto.scheduledAt,
                    hostId: validHostId,
                },
            })
        } else {
            try {
                await prisma.meeting.create({
                    data: {
                        id: dto.id,
                        roomName: dto.roomName,
                        title: dto.title,
                        description: dto.description,
                        hostId: validHostId,
                        scheduledAt: dto.scheduledAt,
                        status: dto.status,
                    },
                })
            } catch (error: unknown) {
                const prismaError = error as { code?: string }
                if (prismaError?.code === 'P2002' || prismaError?.code === 'P2025') {
                    await prisma.meeting.update({
                        where: { id: dto.id },
                        data: {
                            title: dto.title,
                            description: dto.description,
                            scheduledAt: dto.scheduledAt,
                            hostId: validHostId,
                        },
                    })
                } else {
                    throw error
                }
            }
        }
    },

    /**
     * Process meeting.started event
     */
    async processMeetingStarted(payload: MeetingStartedPayload): Promise<void> {
        const validation = validateRequiredFields(payload, [
            'meetingId',
            'roomName',
            'startedAt',
        ])

        if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
        }

        const startedAt = new Date(payload.startedAt)

        let validHostId = null
        if (payload.hostUserId) {
            const hostExists = await prisma.user.findUnique({
                where: { id: payload.hostUserId },
                select: { id: true },
            })
            validHostId = hostExists ? payload.hostUserId : null
        }

        const existingRoomWithSameName = await prisma.meeting.findFirst({
            where: {
                roomName: payload.roomName,
                status: {
                    in: [MeetingStatus.ACTIVE, MeetingStatus.SCHEDULED],
                },
            },
            select: { id: true, status: true },
        })

        if (existingRoomWithSameName) {
            throw new Error(`Cannot create new room: ${existingRoomWithSameName.status} meeting already exists with room name ${payload.roomName}`)
        }

        const generateUniqueMeetingId = (roomName: string): string => {
            const randomSuffix = Math.random().toString(36).substring(2, 10)
            return `${roomName}_${randomSuffix}`
        }

        let meetingId = payload.meetingId
        let existingMeeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            select: { id: true, status: true, roomName: true },
        })

        if (existingMeeting) {
            if (existingMeeting.roomName === payload.roomName &&
                (existingMeeting.status === MeetingStatus.ENDED || existingMeeting.status === MeetingStatus.CANCELLED)) {
                meetingId = generateUniqueMeetingId(payload.roomName)
                existingMeeting = null
            } else {
                await prisma.meeting.update({
                    where: { id: meetingId },
                    data: {
                        startedAt,
                        status: MeetingStatus.ACTIVE,
                        hostId: validHostId,
                        ...(payload.title && { title: payload.title }),
                        ...(payload.description && { description: payload.description }),
                    },
                })
                return
            }
        }

        try {
            await prisma.meeting.create({
                data: {
                    id: meetingId,
                    roomName: payload.roomName,
                    title: payload.title || `Meeting ${payload.roomName}`,
                    description: payload.description,
                    hostId: validHostId,
                    startedAt,
                    status: MeetingStatus.ACTIVE,
                },
            })
        } catch (error: unknown) {
            const prismaError = error as { code?: string }
            if (prismaError?.code === 'P2002') {
                meetingId = generateUniqueMeetingId(payload.roomName)
                await prisma.meeting.create({
                    data: {
                        id: meetingId,
                        roomName: payload.roomName,
                        title: payload.title || `Meeting ${payload.roomName}`,
                        description: payload.description,
                        hostId: validHostId,
                        startedAt,
                        status: MeetingStatus.ACTIVE,
                    },
                })
            } else if (prismaError?.code === 'P2025') {
                await prisma.meeting.update({
                    where: { id: meetingId },
                    data: {
                        startedAt,
                        status: MeetingStatus.ACTIVE,
                        hostId: validHostId,
                        ...(payload.title && { title: payload.title }),
                        ...(payload.description && { description: payload.description }),
                    },
                })
            } else {
                throw error
            }
        }
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

        await prisma.meeting.upsert({
            where: { id: payload.meetingId },
            update: updateData,
            create: {
                id: payload.meetingId,
                roomName: `room-${payload.meetingId.substring(0, 8)}`,
                title: `Meeting ${payload.meetingId.substring(0, 8)}`,
                hostId: null,
                endedAt,
                status: MeetingStatus.ENDED,
            },
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

        await prisma.meeting.upsert({
            where: { id: payload.meetingId },
            update: {
                status: MeetingStatus.CANCELLED,
            },
            create: {
                id: payload.meetingId,
                roomName: `room-${payload.meetingId.substring(0, 8)}`,
                title: `Meeting ${payload.meetingId.substring(0, 8)}`,
                hostId: null,
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
        return prisma.meeting.findFirst({
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