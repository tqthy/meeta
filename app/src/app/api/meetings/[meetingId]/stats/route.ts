/**
 * GET /api/meetings/[meetingId]/stats
 *
 * Fetch event processing statistics for a meeting
 */

import { NextRequest, NextResponse } from 'next/server'
import { meetingLogService } from '@/domains/meeting/services/meeting-database'

interface Params {
    params: Promise<{
        meetingId: string
    }>
}

export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { meetingId } = await params

        if (!meetingId) {
            return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 })
        }

        const stats = await meetingLogService.getProcessingStats(meetingId)

        return NextResponse.json({
            meetingId,
            ...stats,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
