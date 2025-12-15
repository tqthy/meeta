/**
 * participantRecordService
 *
 * Persists participant lifecycle events to the database.
 * Handles participant.joined, participant.left, participant.updated events.
 * Uses upsert operations for idempotency.
 */

import prisma from '../../../../lib/prisma'
import { ParticipantRole, MeetingStatus } from '../../../../app/generated/prisma'
import type {
    SerializableEvent,
    ParticipantJoinedPayload,
    ParticipantLeftPayload,
    ParticipantUpdatedPayload,
    UpsertParticipantDTO,
    UpdateParticipantDTO,
    EventProcessingResult,
} from './types'
import { validateRequiredFields } from './types'

/**
 * Service for persisting participant lifecycle events
 */
export const participantRecordService = {
    /**
     * Handle a participant event and persist to database
     */
    async handleEvent(event: SerializableEvent): Promise<EventProcessingResult> {
        try {
            switch (event.type) {
                case 'participant.joined':
                    await this.processParticipantJoined(event.payload as ParticipantJoinedPayload)
                    break
                case 'participant.left':
                    await this.processParticipantLeft(event.payload as ParticipantLeftPayload)
                    break
                case 'participant.updated':
                    await this.processParticipantUpdated(event.payload as ParticipantUpdatedPayload)
                    break
                default:
                    return {
                        success: false,
                        eventId: event.eventId,
                        eventType: event.type,
                        error: `Unknown participant event type: ${event.type}`,
                    }
            }

            return {
                success: true,
                eventId: event.eventId,
                eventType: event.type,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error(`[participantRecordService] Failed to process event ${event.eventId}:`, error)
            return {
                success: false,
                eventId: event.eventId,
                eventType: event.type,
                error: errorMessage,
            }
        }
    },

    /**
     * Process participant.joined event
     * Uses upsert to handle duplicate join events idempotently
     */
    async processParticipantJoined(payload: ParticipantJoinedPayload): Promise<void> {
        const validation = validateRequiredFields(payload, [
            'meetingId', // This is actually the roomName from Daily.co
            'participantId',
            'displayName',
            'joinedAt',
        ])

        if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
        }

        // payload.meetingId is actually the roomName from Daily.co
        const roomName = payload.meetingId

        // Find the active meeting with this roomName
        let meeting = await prisma.meeting.findFirst({
            where: {
                roomName,
                status: MeetingStatus.ACTIVE,
            },
            select: { id: true },
            orderBy: { createdAt: 'desc' }, // Get the most recent active meeting
        })

        if (!meeting) {
            // Meeting not found - this can happen if participant.joined arrives before meeting.started is processed
            // Auto-create the meeting to handle this race condition
            console.log(
                `[participantRecordService] No active meeting found for roomName: ${roomName}. ` +
                `Auto-creating meeting for participant: ${payload.participantId}`
            )

            // Create meeting with roomName as ID (this matches what meetingRecordService does)
            try {
                const createdMeeting = await prisma.meeting.create({
                    data: {
                        id: roomName,
                        roomName: roomName,
                        title: `Meeting ${roomName}`,
                        hostId: payload.userId || null,
                        startedAt: new Date(payload.joinedAt),
                        status: MeetingStatus.ACTIVE,
                    },
                })
                meeting = { id: createdMeeting.id }
            } catch (error: unknown) {
                const prismaError = error as { code?: string }
                if (prismaError?.code === 'P2002') {
                    // Meeting was created concurrently, try to find it again
                    meeting = await prisma.meeting.findFirst({
                        where: {
                            roomName,
                            status: MeetingStatus.ACTIVE,
                        },
                        select: { id: true },
                        orderBy: { createdAt: 'desc' },
                    })

                    if (!meeting) {
                        console.warn(
                            `[participantRecordService] Race condition: meeting created but not found. ` +
                            `RoomName: ${roomName}, ParticipantId: ${payload.participantId}`
                        )
                        return // Skip this event
                    }
                } else {
                    throw error
                }
            }
        }

        const dto: UpsertParticipantDTO = {
            id: payload.participantId,
            meetingId: meeting.id, // Use the actual database meeting ID
            userId: payload.userId,
            displayName: payload.displayName,
            email: payload.email,
            role: payload.role || ParticipantRole.PARTICIPANT,
            joinedAt: new Date(payload.joinedAt),
        }

        // Use upsert keyed by participantId for idempotency
        await prisma.meetingParticipant.upsert({
            where: { id: dto.id },
            update: {
                displayName: dto.displayName,
                email: dto.email,
                role: dto.role,
                // Don't update joinedAt on duplicate events - keep the original
            },
            create: {
                id: dto.id,
                meetingId: dto.meetingId,
                userId: dto.userId,
                displayName: dto.displayName,
                email: dto.email,
                role: dto.role,
                joinedAt: dto.joinedAt,
            },
        })
    },

    /**
     * Process participant.left event
     */
    async processParticipantLeft(payload: ParticipantLeftPayload): Promise<void> {
        const validation = validateRequiredFields(payload, ['meetingId', 'participantId', 'leftAt'])

        if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
        }

        const leftAt = new Date(payload.leftAt)
        const roomName = payload.meetingId // This is actually the roomName

        // Find the active meeting with this roomName
        const meeting = await prisma.meeting.findFirst({
            where: {
                roomName,
                status: MeetingStatus.ACTIVE,
            },
            select: { id: true, roomName: true },
            orderBy: { createdAt: 'desc' },
        })

        if (!meeting) {
            console.warn(
                `[participantRecordService] No active meeting found for participant.left event. ` +
                `RoomName: ${roomName}, ParticipantId: ${payload.participantId}`
            )
            return
        }

        // Update only if the participant exists
        await prisma.meetingParticipant.updateMany({
            where: {
                id: payload.participantId,
                meetingId: meeting.id, // Use the actual database meeting ID
            },
            data: {
                leftAt,
            },
        })

        // Check if this was the last participant and end meeting if so
        const { meetingRecordService } = await import('./meetingRecordService')
        await meetingRecordService.checkAndEndMeetingIfEmpty(meeting.roomName)
    },

    /**
     * Process participant.updated event
     */
    async processParticipantUpdated(payload: ParticipantUpdatedPayload): Promise<void> {
        const validation = validateRequiredFields(payload, ['meetingId', 'participantId'])

        if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
        }

        const roomName = payload.meetingId // This is actually the roomName

        // Find the active meeting with this roomName
        const meeting = await prisma.meeting.findFirst({
            where: {
                roomName,
                status: MeetingStatus.ACTIVE,
            },
            select: { id: true },
            orderBy: { createdAt: 'desc' },
        })

        if (!meeting) {
            console.warn(
                `[participantRecordService] No active meeting found for participant.updated event. ` +
                `RoomName: ${roomName}, ParticipantId: ${payload.participantId}`
            )
            return
        }

        const updateData: UpdateParticipantDTO = {}

        if (payload.displayName !== undefined) {
            updateData.displayName = payload.displayName
        }

        if (payload.role !== undefined) {
            updateData.role = payload.role
        }

        if (payload.speakerId !== undefined) {
            updateData.speakerId = payload.speakerId
        }

        // Only update if there are fields to update
        if (Object.keys(updateData).length > 0) {
            await prisma.meetingParticipant.updateMany({
                where: {
                    id: payload.participantId,
                    meetingId: meeting.id, // Use the actual database meeting ID
                },
                data: updateData,
            })
        }
    },

    /**
     * Upsert a participant (direct method for non-event usage)
     */
    async upsertParticipant(dto: UpsertParticipantDTO) {
        return prisma.meetingParticipant.upsert({
            where: { id: dto.id },
            update: {
                displayName: dto.displayName,
                email: dto.email,
                role: dto.role,
                leftAt: dto.leftAt,
                speakerId: dto.speakerId,
            },
            create: {
                id: dto.id,
                meetingId: dto.meetingId,
                userId: dto.userId,
                displayName: dto.displayName,
                email: dto.email,
                role: dto.role,
                joinedAt: dto.joinedAt,
                speakerId: dto.speakerId,
            },
        })
    },

    /**
     * Get participants for a meeting
     */
    async getParticipantsByMeeting(meetingId: string, options?: { activeOnly?: boolean }) {
        return prisma.meetingParticipant.findMany({
            where: {
                meetingId,
                ...(options?.activeOnly && { leftAt: null }),
            },
            include: {
                user: true,
            },
            orderBy: { joinedAt: 'asc' },
        })
    },

    /**
     * Get participant by ID
     */
    async getParticipantById(participantId: string) {
        return prisma.meetingParticipant.findUnique({
            where: { id: participantId },
            include: {
                user: true,
                meeting: true,
            },
        })
    },

    /**
     * Get participant by user and meeting
     */
    async getParticipantByUserAndMeeting(userId: string, meetingId: string) {
        return prisma.meetingParticipant.findFirst({
            where: {
                userId,
                meetingId,
            },
            include: {
                user: true,
                meeting: true,
            },
        })
    },

    /**
     * Get all meetings a user has participated in
     */
    async getMeetingsByUser(userId: string, options?: { limit?: number }) {
        return prisma.meetingParticipant.findMany({
            where: { userId },
            include: {
                meeting: {
                    include: {
                        host: true,
                    },
                },
            },
            orderBy: { joinedAt: 'desc' },
            take: options?.limit,
        })
    },

    /**
     * Update speaker ID for diarization mapping
     */
    async updateSpeakerId(participantId: string, speakerId: number) {
        return prisma.meetingParticipant.update({
            where: { id: participantId },
            data: { speakerId },
        })
    },

    /**
     * Get participant by speaker ID within a meeting
     */
    async getParticipantBySpeakerId(meetingId: string, speakerId: number) {
        return prisma.meetingParticipant.findFirst({
            where: {
                meetingId,
                speakerId,
            },
            include: {
                user: true,
            },
        })
    },

    /**
     * Mark all active participants in a meeting as left
     */
    async markAllParticipantsLeft(meetingId: string, leftAt?: Date) {
        return prisma.meetingParticipant.updateMany({
            where: {
                meetingId,
                leftAt: null,
            },
            data: {
                leftAt: leftAt || new Date(),
            },
        })
    },

    /**
     * Get count of active participants in a meeting
     */
    async getActiveParticipantCount(meetingId: string): Promise<number> {
        return prisma.meetingParticipant.count({
            where: {
                meetingId,
                leftAt: null,
            },
        })
    },
}