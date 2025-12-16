# Transcript Service

Real-time transcription persistence for Jitsi meetings.

> **For AI Agents**: See [AGENTS.md](./AGENTS.md) for detailed implementation guidance and code templates.

---

## Overview

This service captures real-time transcription from Jitsi Meet and persists it to the database. It supports:

- **Real-time chunk processing**: Captures final, stable, and unstable transcription text
- **Speaker diarization**: Associates text with speakers via participant IDs
- **Automatic compilation**: Compiles segments into full transcript on meeting end
- **Idempotent updates**: Uses messageID for deduplication

---

## Architecture

```
Jitsi Iframe → Event Listeners → meetingEventEmitter → API Route → transcriptRecordService → Database
```

### Data Flow

1. Jitsi SDK emits `transcriptionChunkReceived` events
2. `page.tsx` captures events and calls `meetingEventEmitter`
3. `useEventPersistence` batches events and POSTs to `/api/meetings/events`
4. `meetingLogService` routes transcription events to `transcriptRecordService`
5. Service persists to `Transcript` and `TranscriptSegment` tables

---

## Database Schema

### Transcript

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | CUID primary key |
| `meetingId` | `string` | Unique reference to Meeting |
| `fullText` | `text?` | Compiled transcript text |
| `status` | `enum` | PENDING, PROCESSING, COMPLETED, FAILED |
| `language` | `string` | Language code (default: "en-US") |
| `wordCount` | `int?` | Total word count |

### TranscriptSegment

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | CUID (uses messageID from Jitsi) |
| `transcriptId` | `string` | Reference to Transcript |
| `speakerId` | `int` | Numeric speaker identifier |
| `speakerName` | `string?` | Display name of speaker |
| `startTime` | `float` | Start time in seconds |
| `endTime` | `float` | End time in seconds |
| `text` | `text` | Transcribed text content |
| `confidence` | `float?` | Confidence score (0-1) |
| `words` | `json?` | Word-level timing data |

---

## API

### Events

The service handles these event types:

| Event Type | Description |
|------------|-------------|
| `transcription.status.changed` | Transcription started/stopped |
| `transcription.chunk.received` | New transcription chunk |

### Service Methods

```typescript
import { transcriptRecordService } from '@/domains/meeting/services/transcript'

// Handle a transcription event
await transcriptRecordService.handleEvent(event)

// Compile full text for a meeting
await transcriptRecordService.compileFullText(meetingId)
```

---

## Usage

### 1. Enable Transcription in Jitsi

Transcription must be enabled in your Jitsi deployment. Configure in `config.js`:

```javascript
config.transcription = {
  enabled: true,
  useAppLanguage: true,
}
```

### 2. Capture Events in Page Component

Events are automatically captured in `jitsi-meeting/[meetingId]/page.tsx`:

```typescript
api.addListener('transcriptionChunkReceived', (event) => {
  meetingEventEmitter.emitTranscriptionChunkReceived(
    meetingId,
    event.language,
    event.messageID,
    { id: event.participant.id, displayName: event.participant.name },
    event.final,
    event.stable,
    event.unstable
  )
})
```

### 3. Query Transcripts

```typescript
import prisma from '@/lib/prisma'

// Get transcript with segments
const transcript = await prisma.transcript.findUnique({
  where: { meetingId },
  include: {
    segments: {
      orderBy: { startTime: 'asc' },
    },
  },
})
```

---

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |

### Event Emitter Options

```typescript
// In useEventPersistence
useEventPersistence(meetingId, {
  batchSize: 5,        // Events before sending
  batchDelayMs: 2000,  // Max wait time
  debug: true,         // Enable logging
})
```

---

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `Transcript not found` | No transcript record | Auto-created on first chunk |
| `Invalid meetingId` | Meeting doesn't exist | Ensure meeting.started processed first |
| `Duplicate segment` | Same messageID | Handled via upsert |

---

## File Structure

```
src/domains/meeting/services/transcript/
├── AGENTS.md                    # AI agent guidance
├── README.md                    # This file
├── index.ts                     # Exports
├── transcriptRecordService.ts   # Main service
├── transcriptProcessor.ts       # Text utilities
└── types.ts                     # TypeScript types
```

---

## Related Documentation

- [Prisma Schema](../../../../prisma/schema/transcript.prisma)
- [Jitsi SDK Events](../JitsiSDKAPI/EventListener.txt)
- [Meeting Event Emitter](../meetingEventEmitter.ts)
- [Event Types](../meeting-database/types.ts)
