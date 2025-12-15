/**
 * POST /api/meetings/[meetingId]/recording
 *
 * Upload a local recording for a meeting.
 * Supports multipart form data with file upload.
 *
 * Authorization: User must be authenticated
 * Body: FormData with 'file' field
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { recordingService } from '@/domains/meeting/services/meeting-database/recordingService'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { meetingId } = await params

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const durationStr = formData.get('duration') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Get file extension
    const filename = file.name
    const format = filename.split('.').pop()?.toLowerCase() || 'unknown'

    // Read file data
    const arrayBuffer = await file.arrayBuffer()
    const data = Buffer.from(arrayBuffer)

    // Parse duration if provided
    const duration = durationStr ? parseInt(durationStr, 10) : undefined

    // Upload recording
    const result = await recordingService.uploadRecording({
      meetingId,
      userId: session.user.id,
      filename,
      format,
      data,
      duration,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      recordingId: result.recordingId,
      isDuplicate: result.isDuplicate || false,
    })
  } catch (error) {
    console.error('[POST /api/meetings/[meetingId]/recording] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/meetings/[meetingId]/recording
 *
 * Get all recordings for a meeting.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params

    const recordings = await recordingService.getRecordingsForMeeting(meetingId)

    return NextResponse.json({
      success: true,
      recordings: recordings.map((r) => ({
        id: r.id,
        url: r.url,
        filename: r.filename,
        format: r.format,
        size: r.size,
        duration: r.duration,
        type: r.type,
        status: r.status,
        createdAt: r.createdAt,
      })),
    })
  } catch (error) {
    console.error('[GET /api/meetings/[meetingId]/recording] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
