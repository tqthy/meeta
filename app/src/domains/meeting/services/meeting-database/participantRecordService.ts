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
            'meetingId',
            'participantId',
            'displayName',
            'joinedAt',
        ])

        if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
        }

        const dto: UpsertParticipantDTO = {
            id: payload.participantId,
            meetingId: payload.meetingId,
            userId: payload.userId,
            displayName: payload.displayName,
            email: payload.email,
            role: payload.role || ParticipantRole.PARTICIPANT,
            joinedAt: new Date(payload.joinedAt),
        }

        // First, ensure the meeting exists
        const meeting = await prisma.meeting.findUnique({
            where: { id: dto.meetingId },
            select: { id: true },
        })

        if (!meeting) {
            // Create a minimal meeting record if it doesn't exist
            // This can happen when events arrive out of order
            // Generate a unique roomName: meetingId_randomNumber to ensure uniqueness
            // while keeping it deterministic per meeting
            const randomNumber = Math.random().toString(36).substring(2, 10)
            const uniqueRoomName = `${dto.meetingId}_${randomNumber}`

            try {
                await prisma.meeting.create({
                    data: {
                        id: dto.meetingId,
                        roomName: uniqueRoomName,
                        title: `Meeting ${dto.meetingId.substring(0, 8)}`,
                        status: MeetingStatus.ACTIVE,
                        // hostId is optional, so we don't need to set it
                    },
                })
            } catch (error: unknown) {
                // If meeting already exists (race condition with another participant),
                // just continue. This is fine - we only need it to exist.
                const prismaError = error as { code?: string }
                if (prismaError?.code !== 'P2002') {
                    throw error
                }
            }
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

        // Update only if the participant exists
        await prisma.meetingParticipant.updateMany({
            where: {
                id: payload.participantId,
                meetingId: payload.meetingId,
            },
            data: {
                leftAt,
            },
        })
    },

    /**
     * Process participant.updated event
     */
    async processParticipantUpdated(payload: ParticipantUpdatedPayload): Promise<void> {
        const validation = validateRequiredFields(payload, ['meetingId', 'participantId'])

        if (!validation.valid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
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
                    meetingId: payload.meetingId,
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
