/**
 * transcriptRecordService
 *
 * Handles transcript persistence for meeting recordings.
 * Listens to transcription events and stores them in database.
 *
 * Features:
 * - Idempotent chunk processing via messageId
 * - Speaker mapping to userId when available
 * - Automatic fullText compilation on transcription end
 * - State machine: PENDING → ACTIVE → COMPLETED | FAILED
 */

import prisma from '@/lib/prisma'
import { TranscriptStatus } from '@/app/generated/prisma'
import type {
  SerializableEvent,
  EventProcessingResult,
  TranscribingStatusChangedPayload,
  TranscriptionChunkReceivedPayload,
} from './types'

/**
 * Explicit transcription event types (not using startsWith for safety)
 */
const TRANSCRIPT_EVENT_TYPES = [
  'transcription.status.changed',
  'transcription.chunk.received',
] as const

type TranscriptEventType = (typeof TRANSCRIPT_EVENT_TYPES)[number]

/**
 * Type guard for transcription events
 */
export function isTranscriptionEvent(event: SerializableEvent): boolean {
  return TRANSCRIPT_EVENT_TYPES.includes(event.type as TranscriptEventType)
}

export const transcriptRecordService = {
  /**
   * Handle transcription-related events
   */
  async handleEvent(event: SerializableEvent): Promise<EventProcessingResult> {
    const eventType = event.type as TranscriptEventType

    switch (eventType) {
      case 'transcription.status.changed':
        return this.handleTranscriptionStatusChanged(event)
      case 'transcription.chunk.received':
        return this.handleTranscriptionChunkReceived(event)
      default:
        return {
          success: false,
          eventId: event.eventId,
          eventType: event.type,
          error: `Unknown transcription event type: ${event.type}`,
        }
    }
  },

  /**
   * Handle transcription status change (start/stop)
   *
   * State transitions:
   * - on=true: PENDING → ACTIVE (set startedAt)
   * - on=false: ACTIVE → COMPLETED (compile fullText, set endedAt)
   */
  async handleTranscriptionStatusChanged(
    event: SerializableEvent
  ): Promise<EventProcessingResult> {
    const payload = event.payload as TranscribingStatusChangedPayload
    const { meetingId, on } = payload

    try {
      // Resolve actual database meetingId from roomName
      const actualMeetingId = await this.resolveMeetingId(meetingId)
      if (!actualMeetingId) {
        console.warn(
          `[transcriptRecordService] Meeting not found for roomName: ${meetingId}`
        )
        return {
          success: true, // Don't fail - meeting may not exist yet
          eventId: event.eventId,
          eventType: event.type,
        }
      }

      if (on) {
        // Transcription started - create or update transcript record
        await prisma.transcript.upsert({
          where: { meetingId: actualMeetingId },
          create: {
            meetingId: actualMeetingId,
            status: TranscriptStatus.PROCESSING,
            language: 'vi-VN', // Default to Vietnamese (Vosk model)
            startedAt: new Date(),
          },
          update: {
            status: TranscriptStatus.PROCESSING,
            startedAt: new Date(),
          },
        })

        console.log(
          `[transcriptRecordService] Transcription started for meeting: ${actualMeetingId}`
        )
      } else {
        // Transcription stopped - compile full text and mark completed
        await this.compileFullText(actualMeetingId)

        console.log(
          `[transcriptRecordService] Transcription completed for meeting: ${actualMeetingId}`
        )
      }

      return {
        success: true,
        eventId: event.eventId,
        eventType: event.type,
      }
    } catch (error) {
      console.error('[transcriptRecordService] Error handling status change:', error)
      return {
        success: false,
        eventId: event.eventId,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  /**
   * Handle incoming transcription chunk
   *
   * Uses upsert with messageId for idempotency.
   * Only upgrades stable → final, never downgrades.
   */
  async handleTranscriptionChunkReceived(
    event: SerializableEvent
  ): Promise<EventProcessingResult> {
    const payload = event.payload as TranscriptionChunkReceivedPayload
    const { meetingId, language, messageID, participant, final, stable } = payload

    // Only process if there's actual text content
    const text = final || stable
    if (!text || text.trim().length === 0) {
      return {
        success: true,
        eventId: event.eventId,
        eventType: event.type,
      }
    }

    try {
      // Resolve actual database meetingId from roomName
      const actualMeetingId = await this.resolveMeetingId(meetingId)
      if (!actualMeetingId) {
        console.warn(
          `[transcriptRecordService] Meeting not found for roomName: ${meetingId}`
        )
        return {
          success: true,
          eventId: event.eventId,
          eventType: event.type,
        }
      }

      // Ensure transcript exists (auto-create if needed)
      const transcript = await prisma.transcript.upsert({
        where: { meetingId: actualMeetingId },
        create: {
          meetingId: actualMeetingId,
          status: TranscriptStatus.PROCESSING,
          language: language || 'vi-VN',
          startedAt: new Date(),
        },
        update: {
          language: language || undefined,
        },
      })

      // Guard: validate participant exists
      const participantData = participant ?? { id: 'SYSTEM', displayName: 'System' }

      // Resolve speakerUserId from MeetingParticipant if possible
      const speakerUserId = await this.resolveUserIdFromParticipant(
        actualMeetingId,
        participantData.id
      )

      // Create or update segment (use messageId for upsert)
      await prisma.transcriptSegment.upsert({
        where: {
          transcriptId_messageId: {
            transcriptId: transcript.id,
            messageId: messageID,
          },
        },
        create: {
          transcriptId: transcript.id,
          messageId: messageID,
          jitsiParticipantId: participantData.id,
          speakerName: participantData.displayName,
          speakerUserId,
          speakerId: this.hashParticipantId(participantData.id),
          text: text.trim(),
          isFinal: !!final,
          confidence: final ? 1.0 : 0.8,
        },
        update: {
          // Only upgrade stable → final, never downgrade
          ...(final && {
            text: final.trim(),
            isFinal: true,
            confidence: 1.0,
          }),
          // Update speaker name if changed
          speakerName: participantData.displayName,
        },
      })

      return {
        success: true,
        eventId: event.eventId,
        eventType: event.type,
      }
    } catch (error) {
      console.error('[transcriptRecordService] Error handling chunk:', error)
      return {
        success: false,
        eventId: event.eventId,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  /**
   * Compile all final segments into full text
   * Called when transcription ends or meeting ends
   */
  async compileFullText(meetingId: string): Promise<void> {
    const transcript = await prisma.transcript.findUnique({
      where: { meetingId },
      include: {
        segments: {
          where: { isFinal: true },
          orderBy: { receivedAt: 'asc' },
        },
      },
    })

    if (!transcript) {
      console.warn(`[transcriptRecordService] No transcript found for meeting: ${meetingId}`)
      return
    }

    // If no segments, mark as completed but empty
    if (transcript.segments.length === 0) {
      await prisma.transcript.update({
        where: { id: transcript.id },
        data: {
          status: TranscriptStatus.COMPLETED,
          endedAt: new Date(),
        },
      })
      return
    }

    // Compile full text from segments
    const fullText = transcript.segments
      .map((seg) => `[${seg.speakerName || `Speaker ${seg.speakerId}`}]: ${seg.text}`)
      .join('\n')

    const wordCount = fullText.split(/\s+/).filter(Boolean).length

    await prisma.transcript.update({
      where: { id: transcript.id },
      data: {
        fullText,
        wordCount,
        status: TranscriptStatus.COMPLETED,
        endedAt: new Date(),
      },
    })

    console.log(
      `[transcriptRecordService] Compiled transcript: ${transcript.segments.length} segments, ${wordCount} words`
    )
  },

  /**
   * Resolve actual database meeting ID from roomName
   */
  async resolveMeetingId(roomName: string): Promise<string | null> {
    if (!roomName) return null

    const meeting = await prisma.meeting.findFirst({
      where: {
        roomName,
        status: { in: ['ACTIVE', 'SCHEDULED'] },
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    })

    return meeting?.id || null
  },

  /**
   * Resolve userId from MeetingParticipant by Jitsi participant ID
   */
  async resolveUserIdFromParticipant(
    meetingId: string,
    jitsiParticipantId: string
  ): Promise<string | null> {
    if (!jitsiParticipantId || jitsiParticipantId === 'SYSTEM') {
      return null
    }

    // Try to find participant by display name match or other criteria
    // Note: Jitsi participant ID is ephemeral and not stored in DB
    // For now, return null - future: could match by joinedAt timing
    return null
  },

  /**
   * Generate consistent numeric speaker ID from participant ID
   * Uses simple hash function to convert string to 0-99 range
   */
  hashParticipantId(participantId: string): number {
    if (!participantId) return 0

    let hash = 0
    for (let i = 0; i < participantId.length; i++) {
      const char = participantId.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0 // Convert to 32bit integer
    }
    return Math.abs(hash % 100)
  },

  /**
   * Finalize orphaned transcripts (ACTIVE status older than 1 hour)
   * Called periodically or on server startup
   */
  async finalizeOrphanedTranscripts(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const orphaned = await prisma.transcript.findMany({
      where: {
        status: TranscriptStatus.PROCESSING,
        startedAt: { lt: oneHourAgo },
      },
      select: { id: true, meetingId: true },
    })

    for (const transcript of orphaned) {
      try {
        await this.compileFullText(transcript.meetingId)
        console.log(
          `[transcriptRecordService] Finalized orphaned transcript: ${transcript.id}`
        )
      } catch (error) {
        console.error(
          `[transcriptRecordService] Failed to finalize transcript ${transcript.id}:`,
          error
        )
      }
    }

    return orphaned.length
  },
}
