/**
 * GET /api/meetings/[meetingId]/participants
 *
 * Fetch all participants for a specific meeting
 */

import { NextRequest, NextResponse } from 'next/server'
import { participantRecordService } from '@/domains/meeting/services/meeting-database'

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

        const participants = await participantRecordService.getParticipantsByMeeting(meetingId)

        return NextResponse.json({
            meetingId,
            count: participants.length,
            participants,
        })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
