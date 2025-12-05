/**
 * useEventPersistence Hook
 *
 * Client-side hook that subscribes to meeting events and sends them to the backend
 * for persistence via the meeting-database services.
 *
 * Usage in components:
 * ```tsx
 * const MeetingContainer = () => {
 *   const meetingId = useParams().meetingId as string
 *   useEventPersistence(meetingId)
 *   // Component continues normally
 * }
 * ```
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import useSWRMutation from 'swr/mutation'
import { meetingEventEmitter } from '@/domains/meeting/services/meetingEventEmitter'
import type { SerializableEvent } from '@/domains/meeting/services/meeting-database/types'

interface UseEventPersistenceOptions {
    /**
     * Batch events before sending (reduces API calls)
     * Default: 5 events or 2 seconds
     */
    batchSize?: number
    batchDelayMs?: number

    /**
     * Enable debug logging
     */
    debug?: boolean

    /**
     * Callback when events are sent
     */
    onEventsSent?: (count: number) => void

    /**
     * Callback on error
     */
    onError?: (error: Error) => void
}

/**
 * SWR mutation fetcher for posting events
 */
async function postEvents(url: string, { arg }: { arg: { events: SerializableEvent[] } }) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
    })

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Failed to persist events`)
    }

    return res.json()
}

/**
 * Hook that persists meeting events to the backend
 */
export function useEventPersistence(
    meetingId: string,
    options: UseEventPersistenceOptions = {}
) {
    const {
        batchSize = 5,
        batchDelayMs = 2000,
        debug = false,
        onEventsSent,
        onError,
    } = options

    const batchRef = useRef<SerializableEvent[]>([])
    const batchTimerRef = useRef<NodeJS.Timeout | null>(null)

    // SWR mutation for posting events
    const { trigger } = useSWRMutation('/api/meetings/events', postEvents)

    /**
     * Send batched events to the backend
     */
    const sendBatch = useCallback(async () => {
        if (batchRef.current.length === 0) {
            return
        }

        const eventsToSend = [...batchRef.current]
        batchRef.current = []

        if (debug) {
            console.log(`[useEventPersistence] Sending ${eventsToSend.length} events for meeting ${meetingId}`)
        }

        try {
            const result = await trigger({ events: eventsToSend })

            if (debug) {
                console.log(`[useEventPersistence] Events persisted:`, result)
            }

            onEventsSent?.(eventsToSend.length)
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error))
            console.error(`[useEventPersistence] Error persisting events:`, err)
            onError?.(err)
        }
    }, [meetingId, debug, trigger, onEventsSent, onError])

    /**
     * Schedule batch send with debounce
     */
    const scheduleBatchSend = useCallback(() => {
        if (batchTimerRef.current) {
            clearTimeout(batchTimerRef.current)
        }

        batchTimerRef.current = setTimeout(() => {
            sendBatch()
        }, batchDelayMs)
    }, [batchDelayMs, sendBatch])

    /**
     * Handle incoming event from emitter
     */
    const handleEvent = useCallback((event: SerializableEvent) => {
        // Only process events for this meeting
        if (event.meetingId !== meetingId) {
            return
        }

        // Add to batch
        batchRef.current.push(event)

        if (debug) {
            console.log(
                `[useEventPersistence] Event added (batch: ${batchRef.current.length}/${batchSize}):`,
                event.type
            )
        }

        // Send immediately if batch is full, otherwise schedule
        if (batchRef.current.length >= batchSize) {
            sendBatch()
        } else {
            scheduleBatchSend()
        }
    }, [meetingId, batchSize, debug, sendBatch, scheduleBatchSend])

    // Subscribe to events on mount
    useEffect(() => {
        const unsubscribe = meetingEventEmitter.subscribe(handleEvent)

        return () => {
            unsubscribe()

            // Send any remaining events
            if (batchRef.current.length > 0) {
                sendBatch()
            }

            // Clear timer
            if (batchTimerRef.current) {
                clearTimeout(batchTimerRef.current)
            }
        }
    }, [handleEvent, sendBatch])

    return {
        flushEvents: sendBatch,
        pendingEventCount: batchRef.current.length,
    }
}
