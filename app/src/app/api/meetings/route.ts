/**
 * POST /api/meetings
 *
 * Create or find a meeting by room name
 * Returns { meetingId: string, roomName: string, isNew: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { meetingRecordService } from '@/domains/meeting/services/meeting-database'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomName, title } = body

    if (!roomName) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      )
    }

    // Check if meeting with this roomName already exists
    let meeting = await meetingRecordService.getActiveMeetingByRoomName(roomName)

    if (meeting) {
      // Return existing meeting
      return NextResponse.json({
        meetingId: meeting.id,
        roomName: meeting.roomName,
        status: meeting.status,
        isNew: false
      })
    }

    // Also check for any meeting (not just active) by roomName
    meeting = await meetingRecordService.getMeetingByRoomName(roomName)

    if (meeting) {
      return NextResponse.json({
        meetingId: meeting.id,
        roomName: meeting.roomName,
        status: meeting.status,
        isNew: false
      })
    }

    // Get authenticated user (if available)
    const session = await auth.api.getSession({
      headers: await headers()
    })
    const userId = session?.user?.id || null

    // Create new meeting with SCHEDULED status
    // The actual ACTIVE status will be set when meeting.started event fires
    const newMeeting = await createMeeting({
      roomName,
      title: title || roomName,
      hostId: userId
    })

    return NextResponse.json({
      meetingId: newMeeting.id,
      roomName: newMeeting.roomName,
      status: newMeeting.status,
      isNew: true
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[POST /api/meetings] Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * Helper function to create a new meeting
 */
async function createMeeting({ roomName, title, hostId }: {
  roomName: string
  title: string
  hostId: string | null
}) {
  const { default: prisma } = await import('@/lib/prisma')

  return prisma.meeting.create({
    data: {
      roomName,
      title,
      hostId,
      status: 'SCHEDULED',
    }
  })
}
