/**
 * GET /api/meetings/[meetingId]/transcript
 *
 * Fetch meeting details with transcript segments
 * Returns meeting info + transcript with all segments ordered by receivedAt
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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

    // Fetch meeting with participants
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        participants: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
            joinedAt: true,
            leftAt: true,
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    })

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }

    // Fetch transcript with segments
    const transcript = await prisma.transcript.findUnique({
      where: { meetingId },
      include: {
        segments: {
          orderBy: { receivedAt: 'asc' },
          select: {
            id: true,
            messageId: true,
            speakerId: true,
            speakerName: true,
            speakerUserId: true,
            jitsiParticipantId: true,
            startTime: true,
            endTime: true,
            text: true,
            confidence: true,
            isFinal: true,
            receivedAt: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json({
      meeting: {
        id: meeting.id,
        roomName: meeting.roomName,
        title: meeting.title,
        description: meeting.description,
        status: meeting.status,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        duration: meeting.duration,
        host: meeting.host,
        participants: meeting.participants,
        createdAt: meeting.createdAt,
      },
      transcript: transcript
        ? {
          id: transcript.id,
          status: transcript.status,
          language: transcript.language,
          wordCount: transcript.wordCount,
          fullText: transcript.fullText,
          startedAt: transcript.startedAt,
          endedAt: transcript.endedAt,
          segments: transcript.segments,
        }
        : null,
    })
  } catch (error) {
    console.error('[API] Error fetching meeting transcript:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
