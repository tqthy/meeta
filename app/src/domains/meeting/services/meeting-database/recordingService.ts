/**
 * recordingService
 *
 * Handles local recording storage for meetings.
 * Supports file upload with checksum deduplication and metadata storage.
 */

import prisma from '@/lib/prisma'
import { RecordingStatus, RecordingType } from '@/app/generated/prisma'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// Storage configuration
const STORAGE_BASE_PATH = process.env.RECORDING_STORAGE_PATH || './storage/recordings'
const MAX_FILE_SIZE = parseInt(process.env.MAX_RECORDING_SIZE || '524288000', 10) // 500MB default
const ALLOWED_FORMATS = ['webm', 'mp4', 'mp3', 'ogg', 'wav']

export interface UploadRecordingParams {
  meetingId: string
  userId: string
  filename: string
  format: string
  data: Buffer
  duration?: number
}

export interface RecordingResult {
  success: boolean
  recordingId?: string
  error?: string
  isDuplicate?: boolean
}

export const recordingService = {
  /**
   * Upload and store a recording
   * @param params Upload parameters
   * @returns Result with recordingId or error
   */
  async uploadRecording(params: UploadRecordingParams): Promise<RecordingResult> {
    const { meetingId, userId, filename, format, data, duration } = params

    // Validate format
    if (!ALLOWED_FORMATS.includes(format.toLowerCase())) {
      return {
        success: false,
        error: `Invalid format: ${format}. Allowed: ${ALLOWED_FORMATS.join(', ')}`,
      }
    }

    // Validate file size
    if (data.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${data.length} bytes. Max: ${MAX_FILE_SIZE} bytes`,
      }
    }

    // Calculate checksum for deduplication
    const checksum = crypto.createHash('sha256').update(data).digest('hex')

    // Check for duplicate
    const existing = await prisma.recording.findUnique({
      where: {
        meetingId_checksum: {
          meetingId,
          checksum,
        },
      },
    })

    if (existing) {
      return {
        success: true,
        recordingId: existing.id,
        isDuplicate: true,
      }
    }

    // Verify meeting exists
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    })

    if (!meeting) {
      return {
        success: false,
        error: `Meeting not found: ${meetingId}`,
      }
    }

    try {
      // Ensure storage directory exists
      const meetingStoragePath = path.join(STORAGE_BASE_PATH, meetingId)
      await fs.promises.mkdir(meetingStoragePath, { recursive: true })

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const storedFilename = `${timestamp}_${filename}`
      const storagePath = path.join(meetingStoragePath, storedFilename)

      // Write file to disk
      await fs.promises.writeFile(storagePath, data)

      // Create recording record
      const recording = await prisma.recording.create({
        data: {
          meetingId,
          url: `/api/recordings/${meetingId}/${storedFilename}`,
          filename: storedFilename,
          format: format.toLowerCase(),
          size: data.length,
          duration,
          type: this.getRecordingType(format),
          status: RecordingStatus.READY,
          storagePath,
          storageType: 'local',
          checksum,
          uploadedBy: userId,
          uploadedAt: new Date(),
        },
      })

      console.log(
        `[recordingService] Recording saved: ${recording.id} (${data.length} bytes)`
      )

      return {
        success: true,
        recordingId: recording.id,
      }
    } catch (error) {
      console.error('[recordingService] Error uploading recording:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  /**
   * Get recording file stream
   */
  async getRecordingStream(
    recordingId: string
  ): Promise<{ stream: fs.ReadStream; contentType: string; size: number } | null> {
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
    })

    if (!recording || !recording.storagePath) {
      return null
    }

    try {
      const stats = await fs.promises.stat(recording.storagePath)
      const stream = fs.createReadStream(recording.storagePath)
      const contentType = this.getContentType(recording.format)

      return {
        stream,
        contentType,
        size: stats.size,
      }
    } catch {
      return null
    }
  },

  /**
   * Get recordings for a meeting
   */
  async getRecordingsForMeeting(meetingId: string) {
    return prisma.recording.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    })
  },

  /**
   * Delete a recording (file and record)
   */
  async deleteRecording(recordingId: string, userId: string): Promise<boolean> {
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: { meeting: { select: { hostId: true } } },
    })

    if (!recording) {
      return false
    }

    // Only allow deletion by uploader or meeting host
    if (recording.uploadedBy !== userId && recording.meeting.hostId !== userId) {
      return false
    }

    try {
      // Delete file if exists
      if (recording.storagePath) {
        await fs.promises.unlink(recording.storagePath).catch(() => {
          /* File may not exist */
        })
      }

      // Delete record
      await prisma.recording.delete({
        where: { id: recordingId },
      })

      return true
    } catch {
      return false
    }
  },

  /**
   * Get recording type from format
   */
  getRecordingType(format: string): RecordingType {
    const audioFormats = ['mp3', 'ogg', 'wav', 'aac', 'm4a']
    if (audioFormats.includes(format.toLowerCase())) {
      return RecordingType.AUDIO
    }
    return RecordingType.VIDEO
  },

  /**
   * Get content type for format
   */
  getContentType(format: string): string {
    const types: Record<string, string> = {
      webm: 'video/webm',
      mp4: 'video/mp4',
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg',
      wav: 'audio/wav',
    }
    return types[format.toLowerCase()] || 'application/octet-stream'
  },

  /**
   * Cleanup old recordings (retention policy)
   */
  async cleanupOldRecordings(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const oldRecordings = await prisma.recording.findMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    let deleted = 0
    for (const recording of oldRecordings) {
      try {
        if (recording.storagePath) {
          await fs.promises.unlink(recording.storagePath).catch(() => { })
        }
        await prisma.recording.delete({ where: { id: recording.id } })
        deleted++
      } catch {
        console.error(`Failed to delete recording: ${recording.id}`)
      }
    }

    return deleted
  },
}
