/**
 * GET /api/meetings/check?roomName=xxx
 *
 * Check if a meeting room exists by room name or meeting ID
 * Returns { exists: boolean, meetingId?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { meetingRecordService } from '@/domains/meeting/services/meeting-database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomName = searchParams.get('roomName')

    if (!roomName) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      )
    }

    // Try to find meeting by room name first
    let meeting = await meetingRecordService.getMeetingByRoomName(roomName)

    // If not found by room name, try by ID
    if (!meeting) {
      meeting = await meetingRecordService.getMeetingById(roomName)
    }

    if (!meeting) {
      return NextResponse.json({
        exists: false,
        meetingId: null,
        roomName
      })
    }

    return NextResponse.json({
      exists: true,
      meetingId: meeting.id,
      roomName: meeting.roomName,
      status: meeting.status
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
