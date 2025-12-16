/**
 * SWR Hooks for Meeting Data
 *
 * Client-side data fetching hooks using SWR for caching and revalidation.
 * These hooks fetch meeting data from the database API endpoints.
 *
 * Usage:
 * ```tsx
 * const { meeting, isLoading, error } = useMeetingDetails(meetingId)
 * const { participants } = useMeetingParticipants(meetingId)
 * const { stats } = useMeetingStats(meetingId)
 * ```
 */

'use client'

import useSWR from 'swr'
import type { SWRConfiguration } from 'swr'

/**
 * Default fetcher for SWR
 */
const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) {
        const error = new Error('Failed to fetch')
        throw error
    }
    return res.json()
}

// ============================================================================
// Meeting Validation
// ============================================================================

export interface MeetingCheckResult {
    exists: boolean
    meetingId?: string
    roomName?: string
    status?: 'ACTIVE' | 'ENDED' | 'SCHEDULED' | 'CANCELLED'
    error?: string
}

/**
 * Check if a meeting room exists by room name or meeting ID
 * @param roomNameOrId - The room name or meeting ID to check
 * @returns Promise resolving to check result
 */
export async function checkMeetingExists(roomNameOrId: string): Promise<MeetingCheckResult> {
    try {
        const res = await fetch(`/api/meetings/check?roomName=${encodeURIComponent(roomNameOrId)}`)

        if (!res.ok) {
            return { exists: false, error: 'Failed to check meeting' }
        }

        return await res.json()
    } catch (error) {
        return {
            exists: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Default SWR configuration
 */
const defaultConfig: SWRConfiguration = {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
    errorRetryCount: 3,
}

// ============================================================================
// Types
// ============================================================================

export interface MeetingData {
    id: string
    roomName: string
    title?: string
    description?: string
    status: 'ACTIVE' | 'ENDED' | 'SCHEDULED' | 'CANCELLED'
    startedAt?: string
    endedAt?: string
    duration?: number
    hostId: string
}

export interface ParticipantData {
    id: string
    meetingId: string
    userId: string
    displayName: string
    role: 'HOST' | 'CO_HOST' | 'PARTICIPANT'
    joinedAt: string
    leftAt?: string
    speakerId?: string
}

export interface ParticipantsResponse {
    meetingId: string
    count: number
    participants: ParticipantData[]
}

export interface MeetingStatsData {
    meetingId: string
    total: number
    pending: number
    processed: number
    failed: number
    timestamp: string
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch meeting details by ID from database
 */
export function useMeetingDetails(meetingId: string | null | undefined, options?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<MeetingData>(
        meetingId ? `/api/meetings/${meetingId}` : null,
        fetcher,
        { ...defaultConfig, ...options }
    )

    return {
        meeting: data,
        isLoading,
        error,
        isError: !!error,
        mutate,
    }
}

/**
 * Fetch all participants for a meeting
 */
export function useMeetingParticipants(meetingId: string | null | undefined, options?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<ParticipantsResponse>(
        meetingId ? `/api/meetings/${meetingId}/participants` : null,
        fetcher,
        { ...defaultConfig, refreshInterval: 3000, ...options }
    )

    return {
        participants: data?.participants || [],
        participantCount: data?.count || 0,
        isLoading,
        error,
        isError: !!error,
        mutate,
    }
}

/**
 * Fetch event processing statistics for a meeting
 */
export function useMeetingStats(meetingId: string | null | undefined, options?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<MeetingStatsData>(
        meetingId ? `/api/meetings/${meetingId}/stats` : null,
        fetcher,
        { ...defaultConfig, refreshInterval: 5000, ...options }
    )

    return {
        stats: data,
        isLoading,
        error,
        isError: !!error,
        mutate,
    }
}

/**
 * Fetch all meeting data (details, participants, stats) in one hook
 */
export function useMeetingData(meetingId: string | null | undefined, options?: SWRConfiguration) {
    const meeting = useMeetingDetails(meetingId, options)
    const participants = useMeetingParticipants(meetingId, options)
    const stats = useMeetingStats(meetingId, options)

    return {
        meeting: meeting.meeting,
        participants: participants.participants,
        participantCount: participants.participantCount,
        stats: stats.stats,
        isLoading: meeting.isLoading || participants.isLoading || stats.isLoading,
        error: meeting.error || participants.error || stats.error,
        isError: meeting.isError || participants.isError || stats.isError,
        mutate: async () => {
            await Promise.all([meeting.mutate(), participants.mutate(), stats.mutate()])
        },
    }
}

// ============================================================================
// User Meeting History
// ============================================================================

export interface MeetingHistoryItem {
    id: string
    roomName: string
    title: string
    description?: string
    status: 'ACTIVE' | 'ENDED' | 'SCHEDULED' | 'CANCELLED'
    scheduledAt?: string
    startedAt?: string
    endedAt?: string
    duration?: number
    hostId?: string
    host?: {
        id: string
        name?: string
        email?: string
        image?: string
    }
    participantCount: number
    userRole: 'HOST' | 'CO_HOST' | 'PARTICIPANT'
    joinedAt?: string
    leftAt?: string
    createdAt: string
}

export interface MeetingHistoryResponse {
    userId: string
    count: number
    meetings: MeetingHistoryItem[]
    filters: {
        status: string
        role: string
        limit: number
        offset: number
    }
}

export interface UserMeetingStats {
    totalMeetings: number
    hostedMeetings: number
    participatedMeetings: number
    activeMeetings: number
    scheduledMeetings: number
}

export interface UserStatsResponse {
    userId: string
    stats: UserMeetingStats
}

export interface MeetingHistoryFilters {
    status?: 'ACTIVE' | 'ENDED' | 'SCHEDULED' | 'CANCELLED'
    role?: 'host' | 'participant' | 'all'
    limit?: number
    offset?: number
}

/**
 * Fetch authenticated user's meeting history
 * 
 * @param filters - Optional filters for status, role, pagination
 * @param options - SWR configuration options
 */
export function useMeetingHistory(filters?: MeetingHistoryFilters, options?: SWRConfiguration) {
    // Build query string
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.role) params.set('role', filters.role)
    if (filters?.limit) params.set('limit', filters.limit.toString())
    if (filters?.offset) params.set('offset', filters.offset.toString())

    const queryString = params.toString()
    const url = `/api/user/meetings${queryString ? `?${queryString}` : ''}`

    const { data, error, isLoading, mutate } = useSWR<MeetingHistoryResponse>(
        url,
        fetcher,
        { ...defaultConfig, ...options }
    )

    return {
        meetings: data?.meetings || [],
        count: data?.count || 0,
        filters: data?.filters,
        isLoading,
        error,
        isError: !!error,
        mutate,
    }
}

/**
 * Fetch user's meeting statistics
 */
export function useUserMeetingStats(options?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<UserStatsResponse>(
        '/api/user/meetings/stats',
        fetcher,
        { ...defaultConfig, ...options }
    )

    return {
        stats: data?.stats,
        isLoading,
        error,
        isError: !!error,
        mutate,
    }
}
