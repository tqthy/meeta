/**
 * historyService
 *
 * Retrieves meeting history for users.
 * Provides queries for meetings where user was host or participant.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import prisma from '../../../../lib/prisma'
import { MeetingStatus, ParticipantRole } from '../../../../app/generated/prisma'

export interface MeetingHistoryFilters {
    status?: MeetingStatus
    role?: 'host' | 'participant' | 'all'
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
}

export interface MeetingHistoryItem {
    id: string
    roomName: string
    title: string
    description?: string
    status: MeetingStatus
    scheduledAt?: Date
    startedAt?: Date
    endedAt?: Date
    duration?: number
    hostId?: string
    host?: {
        id: string
        name?: string
        email?: string
        image?: string
    }
    participantCount: number
    userRole: ParticipantRole | 'HOST'
    joinedAt?: Date
    leftAt?: Date
    createdAt: Date
}

export const historyService = {
    /**
     * Get all meetings for a user (as host or participant)
     */
    async getUserMeetings(
        userId: string,
        filters: MeetingHistoryFilters = {}
    ): Promise<MeetingHistoryItem[]> {
        const {
            status,
            role = 'all',
            startDate,
            endDate,
            limit = 50,
            offset = 0,
        } = filters

        console.log('[historyService] getUserMeetings called for userId:', userId, 'with filters:', filters)

        // Build date filter for meetings
        const dateFilter: any = {}
        if (startDate || endDate) {
            dateFilter.OR = []
            if (startDate) {
                dateFilter.OR.push(
                    { startedAt: { gte: startDate } },
                    { scheduledAt: { gte: startDate } }
                )
            }
            if (endDate) {
                dateFilter.OR.push(
                    { startedAt: { lte: endDate } },
                    { scheduledAt: { lte: endDate } },
                    { endedAt: { lte: endDate } }
                )
            }
        }

        // Query based on role filter
        let meetingsAsHost: any[] = []
        let meetingsAsParticipant: any[] = []

        if (role === 'host' || role === 'all') {
            meetingsAsHost = await prisma.meeting.findMany({
                where: {
                    hostId: userId,
                    ...(status && { status }),
                    ...dateFilter,
                },
                include: {
                    host: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                        },
                    },
                    participants: {
                        select: {
                            id: true,
                        },
                    },
                },
                orderBy: [
                    { startedAt: 'desc' },
                    { scheduledAt: 'desc' },
                    { createdAt: 'desc' },
                ],
            })
            console.log('[historyService] Found meetingsAsHost:', meetingsAsHost.length)
        }

        if (role === 'participant' || role === 'all') {
            const participations = await prisma.meetingParticipant.findMany({
                where: {
                    userId,
                    meeting: {
                        ...(status && { status }),
                        ...dateFilter,
                    },
                },
                include: {
                    meeting: {
                        include: {
                            host: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    image: true,
                                },
                            },
                            participants: {
                                select: {
                                    id: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    joinedAt: 'desc',
                },
            })
            console.log('[historyService] Found participations:', participations.length)

            meetingsAsParticipant = participations.map((p) => ({
                ...p.meeting,
                userRole: p.role,
                joinedAt: p.joinedAt,
                leftAt: p.leftAt,
            }))
        }

        // Merge and deduplicate
        const meetingMap = new Map<string, any>()

        // Add host meetings
        for (const meeting of meetingsAsHost) {
            meetingMap.set(meeting.id, {
                ...meeting,
                userRole: 'HOST' as const,
                participantCount: meeting.participants.length,
            })
        }

        // Add participant meetings (don't override host role if already present)
        for (const meeting of meetingsAsParticipant) {
            if (!meetingMap.has(meeting.id)) {
                meetingMap.set(meeting.id, {
                    ...meeting,
                    participantCount: meeting.participants.length,
                })
            } else {
                // Update with participant timing info if user was also participant
                const existing = meetingMap.get(meeting.id)
                if (meeting.joinedAt) {
                    existing.joinedAt = meeting.joinedAt
                    existing.leftAt = meeting.leftAt
                }
            }
        }

        // Convert to array and sort
        let results = Array.from(meetingMap.values())
        results.sort((a, b) => {
            const aTime = a.startedAt || a.scheduledAt || a.createdAt
            const bTime = b.startedAt || b.scheduledAt || b.createdAt
            return bTime.getTime() - aTime.getTime()
        })

        // Apply pagination
        results = results.slice(offset, offset + limit)

        console.log('[historyService] After merge and pagination, returning:', results.length, 'meetings')

        // Clean up and format results
        return results.map((meeting) => ({
            id: meeting.id,
            roomName: meeting.roomName,
            title: meeting.title,
            description: meeting.description,
            status: meeting.status,
            scheduledAt: meeting.scheduledAt,
            startedAt: meeting.startedAt,
            endedAt: meeting.endedAt,
            duration: meeting.duration,
            hostId: meeting.hostId,
            host: meeting.host,
            participantCount: meeting.participantCount,
            userRole: meeting.userRole,
            joinedAt: meeting.joinedAt,
            leftAt: meeting.leftAt,
            createdAt: meeting.createdAt,
        }))
    },

    /**
     * Get meetings where user was host
     */
    async getUserHostedMeetings(
        userId: string,
        options?: { status?: MeetingStatus; limit?: number; offset?: number }
    ): Promise<MeetingHistoryItem[]> {
        return this.getUserMeetings(userId, {
            ...options,
            role: 'host',
        })
    },

    /**
     * Get meetings where user was participant (not host)
     */
    async getUserParticipatedMeetings(
        userId: string,
        options?: { status?: MeetingStatus; limit?: number; offset?: number }
    ): Promise<MeetingHistoryItem[]> {
        return this.getUserMeetings(userId, {
            ...options,
            role: 'participant',
        })
    },

    /**
     * Get upcoming scheduled meetings for user
     */
    async getUpcomingMeetings(userId: string): Promise<MeetingHistoryItem[]> {
        return this.getUserMeetings(userId, {
            status: MeetingStatus.SCHEDULED,
            startDate: new Date(),
            role: 'all',
            limit: 20,
        })
    },

    /**
     * Get recent ended meetings for user
     */
    async getRecentMeetings(userId: string, limit = 10): Promise<MeetingHistoryItem[]> {
        return this.getUserMeetings(userId, {
            status: MeetingStatus.ENDED,
            role: 'all',
            limit,
        })
    },

    /**
     * Get active meetings for user
     */
    async getActiveMeetings(userId: string): Promise<MeetingHistoryItem[]> {
        return this.getUserMeetings(userId, {
            status: MeetingStatus.ACTIVE,
            role: 'all',
        })
    },

    /**
     * Get meeting statistics for user
     */
    async getUserMeetingStats(userId: string) {
        const [
            totalMeetings,
            hostedMeetings,
            participatedMeetings,
            activeMeetings,
            scheduledMeetings,
        ] = await Promise.all([
            // Total meetings (as host or participant)
            prisma.meeting.count({
                where: {
                    OR: [
                        { hostId: userId },
                        { participants: { some: { userId } } },
                    ],
                },
            }),
            // Hosted meetings
            prisma.meeting.count({
                where: { hostId: userId },
            }),
            // Participated meetings
            prisma.meetingParticipant.count({
                where: { userId },
            }),
            // Active meetings
            prisma.meeting.count({
                where: {
                    status: MeetingStatus.ACTIVE,
                    OR: [
                        { hostId: userId },
                        { participants: { some: { userId } } },
                    ],
                },
            }),
            // Scheduled meetings
            prisma.meeting.count({
                where: {
                    status: MeetingStatus.SCHEDULED,
                    OR: [
                        { hostId: userId },
                        { participants: { some: { userId } } },
                    ],
                },
            }),
        ])

        return {
            totalMeetings,
            hostedMeetings,
            participatedMeetings,
            activeMeetings,
            scheduledMeetings,
        }
    },
}
