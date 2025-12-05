/**
 * GET /api/meetings/[meetingId]
 *
 * Fetch meeting details for a specific meeting ID
 * Returns full meeting info including participants and metadata
 */

import { NextRequest, NextResponse } from 'next/server'
import { meetingRecordService } from '@/domains/meeting/services/meeting-database'

interface Params {
    params: Promise<{
        meetingId: string
    }>
}

export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { meetingId } = await params

        if (!meetingId) {
            return NextResponse.json(
                { error: 'Meeting ID is required' },
                { status: 400 }
            )
        }

        const meeting = await meetingRecordService.getMeetingById(meetingId)

        if (!meeting) {
            return NextResponse.json(
                { error: 'Meeting not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(meeting)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
