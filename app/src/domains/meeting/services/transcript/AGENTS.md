# AGENTS.md — Transcript Service

> **Audience**: AI Agents and Developers implementing transcript persistence from Jitsi iframe to database.

---

## 1. Overview

This module handles real-time transcription storage for Jitsi meetings. It captures transcription events from the Jitsi iframe SDK and persists them to PostgreSQL via Prisma.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Jitsi Iframe                                                            │
│       │                                                                  │
│       ▼ (SDK Events)                                                     │
│  page.tsx (jitsi-meeting/[meetingId])                                   │
│       │                                                                  │
│       ▼ (transcriptionChunkReceived, transcribingStatusChanged)         │
│  meetingEventEmitter.emitTranscriptionChunkReceived()                   │
│       │                                                                  │
│       ▼ (SerializableEvent)                                             │
│  useEventPersistence hook                                                │
│       │                                                                  │
│       ▼ (POST /api/meetings/events)                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SERVER (Next.js API)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  POST /api/meetings/events                                               │
│       │                                                                  │
│       ▼                                                                  │
│  meetingLogService.processEvent()                                        │
│       │                                                                  │
│       ▼ (isTranscriptionEvent check)                                    │
│  transcriptRecordService.handleEvent()                                   │
│       │                                                                  │
│       ▼ (Prisma ORM)                                                    │
│  Database: Transcript, TranscriptSegment                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Jitsi SDK Events Reference

### 2.1 transcribingStatusChanged

```typescript
// Event payload
interface TranscribingStatusChangedEvent {
  on: boolean // Transcription active state
}

// Usage in page.tsx
api.addListener('transcribingStatusChanged', (event: TranscribingStatusChangedEvent) => {
  meetingEventEmitter.emitTranscribingStatusChanged(meetingId, event.on)
})
```

### 2.2 transcriptionChunkReceived

```typescript
// Event payload from Jitsi SDK
interface TranscriptionChunkReceivedEvent {
  language: string      // e.g., "en-US"
  messageID: string     // Unique chunk identifier
  participant: {
    id: string          // Jitsi participant ID
    name?: string       // Display name
  }
  final: string         // Final transcription text
  stable: string        // Stable (semi-final) text
  unstable: string      // Unstable (in-progress) text
}

// Usage in page.tsx
api.addListener('transcriptionChunkReceived', (event: TranscriptionChunkReceivedEvent) => {
  meetingEventEmitter.emitTranscriptionChunkReceived(
    meetingId,
    event.language,
    event.messageID,
    { id: event.participant.id, displayName: event.participant.name || 'Unknown' },
    event.final,
    event.stable,
    event.unstable
  )
})
```

---

## 3. File Structure

```
src/domains/meeting/services/transcript/
├── AGENTS.md                    # This file
├── README.md                    # Technical documentation
├── index.ts                     # Barrel export
├── transcriptRecordService.ts   # Main service (Prisma operations)
├── transcriptProcessor.ts       # Text processing utilities
└── types.ts                     # TypeScript interfaces
```

---

## 4. Implementation Templates

### 4.1 transcriptRecordService.ts

```typescript
/**
 * transcriptRecordService
 *
 * Handles transcript persistence for meeting recordings.
 * Listens to transcription events and stores them in database.
 */

import prisma from '@/lib/prisma'
import { TranscriptStatus } from '@/app/generated/prisma'
import type {
  SerializableEvent,
  EventProcessingResult,
  TranscriptionChunkReceivedPayload,
  TranscribingStatusChangedPayload,
} from '../meeting-database/types'

export const transcriptRecordService = {
  /**
   * Handle transcription-related events
   */
  async handleEvent(event: SerializableEvent): Promise<EventProcessingResult> {
    switch (event.type) {
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
   */
  async handleTranscriptionStatusChanged(
    event: SerializableEvent
  ): Promise<EventProcessingResult> {
    const payload = event.payload as TranscribingStatusChangedPayload
    const { meetingId, on } = payload

    try {
      if (on) {
        // Transcription started - create or update transcript record
        await prisma.transcript.upsert({
          where: { meetingId },
          create: {
            meetingId,
            status: TranscriptStatus.PROCESSING,
            language: 'en-US',
          },
          update: {
            status: TranscriptStatus.PROCESSING,
          },
        })
      } else {
        // Transcription stopped - mark as completed and compile full text
        await this.compileFullText(meetingId)
      }

      return {
        success: true,
        eventId: event.eventId,
        eventType: event.type,
      }
    } catch (error) {
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
   */
  async handleTranscriptionChunkReceived(
    event: SerializableEvent
  ): Promise<EventProcessingResult> {
    const payload = event.payload as TranscriptionChunkReceivedPayload
    const { meetingId, language, messageID, participant, final, stable } = payload

    // Only process final or stable text
    const text = final || stable
    if (!text || text.trim().length === 0) {
      return {
        success: true,
        eventId: event.eventId,
        eventType: event.type,
      }
    }

    try {
      // Ensure transcript exists
      const transcript = await prisma.transcript.upsert({
        where: { meetingId },
        create: {
          meetingId,
          status: TranscriptStatus.PROCESSING,
          language,
        },
        update: {
          language,
        },
      })

      // Create or update segment (use messageID for upsert)
      await prisma.transcriptSegment.upsert({
        where: {
          id: messageID, // Use messageID as segment ID
        },
        create: {
          id: messageID,
          transcriptId: transcript.id,
          speakerId: this.extractSpeakerId(participant.id),
          speakerName: participant.displayName,
          startTime: Date.now() / 1000, // Approximate timing
          endTime: Date.now() / 1000,
          text: text,
          confidence: final ? 1.0 : 0.8, // Final text has higher confidence
        },
        update: {
          text: text,
          speakerName: participant.displayName,
          confidence: final ? 1.0 : 0.8,
          endTime: Date.now() / 1000,
        },
      })

      return {
        success: true,
        eventId: event.eventId,
        eventType: event.type,
      }
    } catch (error) {
      return {
        success: false,
        eventId: event.eventId,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  /**
   * Compile all segments into full text
   */
  async compileFullText(meetingId: string): Promise<void> {
    const transcript = await prisma.transcript.findUnique({
      where: { meetingId },
      include: {
        segments: {
          orderBy: { startTime: 'asc' },
        },
      },
    })

    if (!transcript) return

    // Compile full text from segments
    const fullText = transcript.segments
      .map(seg => `[${seg.speakerName || `Speaker ${seg.speakerId}`}]: ${seg.text}`)
      .join('\n')

    const wordCount = fullText.split(/\s+/).filter(Boolean).length

    await prisma.transcript.update({
      where: { id: transcript.id },
      data: {
        fullText,
        wordCount,
        status: TranscriptStatus.COMPLETED,
      },
    })
  },

  /**
   * Extract numeric speaker ID from participant ID
   */
  extractSpeakerId(participantId: string): number {
    // Simple hash function to convert participant ID to speaker number
    let hash = 0
    for (let i = 0; i < participantId.length; i++) {
      hash = (hash << 5) - hash + participantId.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash % 10) // 0-9 speakers
  },
}
```

### 4.2 types.ts

```typescript
/**
 * Transcript Service Types
 */

// Re-export from meeting-database types
export type {
  TranscribingStatusChangedPayload,
  TranscriptionChunkReceivedPayload,
} from '../meeting-database/types'

// Transcript DTO for API responses
export interface TranscriptDTO {
  id: string
  meetingId: string
  fullText: string | null
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  language: string
  wordCount: number | null
  segments: TranscriptSegmentDTO[]
  createdAt: Date
  updatedAt: Date
}

export interface TranscriptSegmentDTO {
  id: string
  speakerId: number
  speakerName: string | null
  startTime: number
  endTime: number
  text: string
  confidence: number | null
}

// Request types
export interface CreateTranscriptRequest {
  meetingId: string
  language?: string
}

export interface AddSegmentRequest {
  transcriptId: string
  speakerId: number
  speakerName?: string
  startTime: number
  endTime: number
  text: string
  confidence?: number
}
```

### 4.3 index.ts

```typescript
/**
 * Transcript Service Exports
 */

export { transcriptRecordService } from './transcriptRecordService'
export type * from './types'
```

---

## 5. Integration with meetingLogService

Update `meetingLogService.ts` to route transcription events:

```typescript
// In meetingLogService.processEvent()

import { transcriptRecordService } from './transcript'

// Add to event routing
if (isTranscriptionEvent(event)) {
  result = await transcriptRecordService.handleEvent(event)
}

// Add type guard
export function isTranscriptionEvent(event: SerializableEvent): boolean {
  return event.type.startsWith('transcription.')
}
```

---

## 6. Jitsi Iframe Integration

Update `jitsi-meeting/[meetingId]/page.tsx`:

```typescript
// Add transcription event listeners in setupEventListeners()

// transcribingStatusChanged
api.addListener('transcribingStatusChanged', (event: { on: boolean }) => {
  console.log('[Jitsi Event] transcribingStatusChanged:', event)
  meetingEventEmitter.emitTranscribingStatusChanged(meetingId, event.on)
})

// transcriptionChunkReceived
api.addListener('transcriptionChunkReceived', (event: {
  language: string
  messageID: string
  participant: { id: string; name?: string }
  final: string
  stable: string
  unstable: string
}) => {
  console.log('[Jitsi Event] transcriptionChunkReceived:', event)
  meetingEventEmitter.emitTranscriptionChunkReceived(
    meetingId,
    event.language,
    event.messageID,
    { id: event.participant.id, displayName: event.participant.name || 'Unknown' },
    event.final,
    event.stable,
    event.unstable
  )
})
```

---

## 7. Error Handling

### 7.1 Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Meeting not found` | Transcript created before meeting record | Ensure meeting.started event processed first |
| `Duplicate segment` | Same messageID received twice | Use upsert instead of create |
| `Connection timeout` | Database connection pool exhausted | Implement retry with exponential backoff |

### 7.2 Error Handling Pattern

```typescript
try {
  // Database operation
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation - use upsert
    } else if (error.code === 'P2003') {
      // Foreign key constraint - meeting doesn't exist
    }
  }
  throw error
}
```

---

## 8. Testing Guidelines

### 8.1 Unit Tests

```typescript
// __tests__/transcriptRecordService.test.ts

describe('transcriptRecordService', () => {
  describe('handleTranscriptionChunkReceived', () => {
    it('should create transcript if not exists', async () => {
      // Test implementation
    })

    it('should update existing segment with same messageID', async () => {
      // Test implementation
    })

    it('should ignore empty text', async () => {
      // Test implementation
    })
  })

  describe('compileFullText', () => {
    it('should compile segments in chronological order', async () => {
      // Test implementation
    })

    it('should calculate correct word count', async () => {
      // Test implementation
    })
  })
})
```

### 8.2 Integration Tests

```typescript
// __tests__/integration/transcript.test.ts

describe('Transcript Integration', () => {
  it('should persist transcript from Jitsi events', async () => {
    // 1. Emit transcription.status.changed (on: true)
    // 2. Emit multiple transcription.chunk.received events
    // 3. Emit transcription.status.changed (on: false)
    // 4. Verify transcript in database with compiled fullText
  })
})
```

---

## 9. Performance Considerations

1. **Batch Processing**: Consider batching segment updates for high-frequency events
2. **Debouncing**: Debounce unstable text updates to reduce database writes
3. **Connection Pooling**: Use Prisma connection pooling for concurrent requests
4. **Indexing**: Ensure indexes on `transcriptId`, `startTime` for efficient queries

---

## 10. Related Files

- [Prisma Schema: transcript.prisma](file:///d:/Code/SE400/meeta/app/prisma/schema/transcript.prisma)
- [Event Types: types.ts](file:///d:/Code/SE400/meeta/app/src/domains/meeting/services/meeting-database/types.ts)
- [Event Emitter: meetingEventEmitter.ts](file:///d:/Code/SE400/meeta/app/src/domains/meeting/services/meetingEventEmitter.ts)
- [Jitsi SDK Events: EventListener.txt](file:///d:/Code/SE400/meeta/app/src/domains/meeting/JitsiSDKAPI/EventListener.txt)
- [Meeting Page: page.tsx](file:///d:/Code/SE400/meeta/app/src/app/jitsi-meeting/[meetingId]/page.tsx)
