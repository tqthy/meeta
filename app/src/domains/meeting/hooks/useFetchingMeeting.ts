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
