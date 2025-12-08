/**
 * GET /api/user/meetings/stats
 *
 * Fetch meeting statistics for the authenticated user
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { historyService } from '@/domains/meeting/services/meeting-database/historyService'

export async function GET() {
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

    // Fetch statistics
    const stats = await historyService.getUserMeetingStats(userId)

    return NextResponse.json({
      userId,
      stats,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user/meetings/stats] Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
