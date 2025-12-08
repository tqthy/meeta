/**
 * GET /api/user/meetings
 *
 * Fetch meeting history for the authenticated user
 * Returns meetings where user is host or participant
 * 
 * Query params:
 * - status: ACTIVE | ENDED | SCHEDULED | CANCELLED
 * - role: host | participant | all
 * - limit: number (default 50)
 * - offset: number (default 0)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { historyService } from '@/domains/meeting/services/meeting-database/historyService'
import { MeetingStatus } from '@/app/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    console.log('[API /user/meetings] Fetching meetings for userId:', userId)    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as MeetingStatus | null
    const role = searchParams.get('role') as 'host' | 'participant' | 'all' | null
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate parameters
    if (status && !['ACTIVE', 'ENDED', 'SCHEDULED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status parameter' },
        { status: 400 }
      )
    }

    if (role && !['host', 'participant', 'all'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role parameter' },
        { status: 400 }
      )
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit parameter (1-100)' },
        { status: 400 }
      )
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid offset parameter' },
        { status: 400 }
      )
    }

    // Fetch meetings
    const meetings = await historyService.getUserMeetings(userId, {
      status: status || undefined,
      role: role || 'all',
      limit,
      offset,
    })

    console.log('[API /user/meetings] Found meetings:', meetings.length, 'with filters:', { status, role, limit, offset })

    return NextResponse.json({
      userId,
      count: meetings.length,
      meetings,
      filters: {
        status: status || 'all',
        role: role || 'all',
        limit,
        offset,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user/meetings] Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
