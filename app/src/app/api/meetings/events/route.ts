/**
 * POST /api/meetings/events
 *
 * Server-side event processor
 * Receives serializable events from the client and persists them via meeting-database services.
 *
 * Flow:
 * 1. Client emits event via meetingEventEmitter
 * 2. Client sends to this endpoint
 * 3. Server processes with meetingLogService (handles deduplication + routing)
 * 4. Database updated via Prisma
 * 5. Response sent back to client
 */

import { NextRequest, NextResponse } from 'next/server'
import { meetingLogService } from '@/domains/meeting/services/meeting-database'
import type { SerializableEvent } from '@/domains/meeting/services/meeting-database/types'

/**
 * Type for batch event request
 */
interface EventBatchRequest {
    events: SerializableEvent[]
}

/**
 * Type for event processing response
 */
interface EventProcessingResponse {
    success: boolean
    eventId?: string
    error?: string
}

/**
 * POST handler - process meeting events
 */
export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body: EventBatchRequest | SerializableEvent = await request.json()

        // Determine if it's a batch or single event
        const events: SerializableEvent[] = Array.isArray((body as EventBatchRequest).events)
            ? (body as EventBatchRequest).events
            : [body as SerializableEvent]

        // Validate events exist
        if (!events || events.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No events provided' },
                { status: 400 }
            )
        }

        // Process each event
        const results: EventProcessingResponse[] = []

        for (const event of events) {
            try {
                // Validate event structure
                if (!event.eventId || !event.type || !event.payload) {
                    results.push({
                        success: false,
                        eventId: event.eventId,
                        error: 'Invalid event structure: missing eventId, type, or payload',
                    })
                    continue
                }

                // Process the event
                const result = await meetingLogService.processEvent(event)

                results.push({
                    success: result.success,
                    eventId: result.eventId,
                    error: result.error,
                })
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                results.push({
                    success: false,
                    eventId: event.eventId,
                    error: errorMessage,
                })
            }
        }

        // Determine overall success
        const allSuccessful = results.every(r => r.success)
        const statusCode = allSuccessful ? 200 : 207 // 207 Multi-Status for partial success

        return NextResponse.json(
            {
                success: allSuccessful,
                processed: results.length,
                results,
            },
            { status: statusCode }
        )
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[POST /api/meetings/events] Error:', error)

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            },
            { status: 500 }
        )
    }
}

/**
 * GET handler - retrieve event statistics (optional)
 */
export async function GET(request: NextRequest) {
    try {
        const meetingId = request.nextUrl.searchParams.get('meetingId')

        if (!meetingId) {
            return NextResponse.json(
                { success: false, error: 'meetingId query parameter required' },
                { status: 400 }
            )
        }

        // Get statistics for the meeting
        const stats = await meetingLogService.getProcessingStats(meetingId)

        return NextResponse.json({
            success: true,
            data: stats,
        })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[GET /api/meetings/events] Error:', error)

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            },
            { status: 500 }
        )
    }
}
