/**
 * GET /api/meetings/[meetingId]/summary
 * POST /api/meetings/[meetingId]/summary
 *
 * GET: Fetch existing summary for a meeting
 * POST: Generate a new summary using AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { summaryService } from '@/domains/meeting/services/meeting-database/summaryService'
import prisma from '@/lib/prisma'

interface Params {
    params: Promise<{
        meetingId: string
    }>
}

/**
 * GET handler - Fetch existing summary
 */
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { meetingId } = await params

        if (!meetingId) {
            return NextResponse.json(
                { error: 'Meeting ID is required' },
                { status: 400 }
            )
        }

        // Fetch the summary
        const summary = await summaryService.getSummary(meetingId)

        if (!summary) {
            return NextResponse.json(
                { error: 'Summary not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ summary })
    } catch (error) {
        console.error('[API] Error fetching summary:', error)
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}

/**
 * POST handler - Generate a new summary
 */
export async function POST(request: NextRequest, { params }: Params) {
    try {
        const { meetingId } = await params

        if (!meetingId) {
            return NextResponse.json(
                { error: 'Meeting ID is required' },
                { status: 400 }
            )
        }

        // Check if meeting exists
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
        })

        if (!meeting) {
            return NextResponse.json(
                { error: 'Meeting not found' },
                { status: 404 }
            )
        }

        // Generate the summary
        const result = await summaryService.generateSummary(meetingId)

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        // Fetch the generated summary
        const summary = await summaryService.getSummary(meetingId)

        return NextResponse.json({
            success: true,
            summary,
        })
    } catch (error) {
        console.error('[API] Error generating summary:', error)
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
