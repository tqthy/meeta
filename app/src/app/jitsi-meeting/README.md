# Jitsi Meeting Module

Next.js pages for Jitsi video conferencing with real-time event persistence.

> **For AI Agents**: See [AGENTS.md](./AGENTS.md) for detailed implementation guidance and code templates.

---

## Overview

This module provides the user interface for Jitsi video meetings, including:

- **Meeting Room**: Full-featured video conference with Jitsi iframe
- **Meeting Creation**: Page for creating new meetings
- **Event Capture**: Automatic persistence of meeting events to database
- **Transcript Support**: Real-time transcription capture and storage

---

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/jitsi-meeting/[meetingId]` | `page.tsx` | Meeting room with Jitsi iframe |
| `/jitsi-meeting/create` | `page.tsx` | Create new meeting |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser                               │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐    │
│  │           JitsiMeetingPage                       │    │
│  ├─────────────────────────────────────────────────┤    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │         JitsiMeeting Component          │    │    │
│  │  │  (iframe → meet.jitsi / localhost)      │    │    │
│  │  └──────────────────┬──────────────────────┘    │    │
│  │                     │ Events                     │    │
│  │                     ▼                            │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │       Event Listeners                    │    │    │
│  │  │  • videoConferenceJoined                │    │    │
│  │  │  • participantJoined/Left               │    │    │
│  │  │  • transcriptionChunkReceived  ◄────────┼────┼── Transcript
│  │  │  • transcribingStatusChanged   ◄────────┼────┼── Transcript
│  │  └──────────────────┬──────────────────────┘    │    │
│  │                     │                            │    │
│  │                     ▼                            │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │      meetingEventEmitter                 │    │    │
│  │  └──────────────────┬──────────────────────┘    │    │
│  │                     │                            │    │
│  │                     ▼                            │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │      useEventPersistence hook           │    │    │
│  │  │      (batches & sends to API)           │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼ POST /api/meetings/events
┌─────────────────────────────────────────────────────────┐
│                    Server                                │
├─────────────────────────────────────────────────────────┤
│  meetingLogService → transcriptRecordService → Database │
└─────────────────────────────────────────────────────────┘
```

---

## Features

### Meeting Room (`[meetingId]/page.tsx`)

- **Jitsi Integration**: Full Jitsi Meet experience via `@jitsi/react-sdk`
- **Authentication**: Uses Better Auth session for user info
- **Event Persistence**: Automatic capture of all meeting events
- **Responsive**: Full viewport height/width

### Events Captured

| Event Category | Events |
|---------------|--------|
| **Meeting** | `videoConferenceJoined`, `videoConferenceLeft` |
| **Participants** | `participantJoined`, `participantLeft`, `displayNameChange` |
| **Media** | `audioMuteStatusChanged`, `videoMuteStatusChanged`, `screenSharingStatusChanged` |
| **Transcription** | `transcribingStatusChanged`, `transcriptionChunkReceived` |

---

## Usage

### Basic Meeting

```typescript
// Navigate to meeting
router.push(`/jitsi-meeting/${meetingId}`)
```

### Configuration

```typescript
<JitsiMeeting
  domain="localhost:8443"
  roomName={meetingId}
  configOverwrite={{
    startWithAudioMuted: false,
    disableModeratorIndicator: false,
    startScreenSharing: false,
  }}
  userInfo={{
    email: userEmail,
    displayName: userName,
  }}
  onApiReady={(api) => setupEventListeners(api)}
/>
```

---

## Transcript Integration

### Enable Transcription

1. **Jitsi Server**: Ensure transcription is enabled in your Jitsi deployment
2. **Client Config**: Add transcription settings to `configOverwrite`

```typescript
configOverwrite={{
  transcription: {
    enabled: true,
    useAppLanguage: true,
  },
}}
```

### Event Flow

```
User speaks → Jitsi ASR → transcriptionChunkReceived event
                              │
                              ▼
                         page.tsx listener
                              │
                              ▼
            meetingEventEmitter.emitTranscriptionChunkReceived()
                              │
                              ▼
                    useEventPersistence
                              │
                              ▼
                POST /api/meetings/events
                              │
                              ▼
               transcriptRecordService
                              │
                              ▼
         Database: Transcript, TranscriptSegment
```

---

## File Structure

```
src/app/jitsi-meeting/
├── [meetingId]/
│   └── page.tsx        # Meeting room
├── create/
│   └── page.tsx        # Create meeting
├── AGENTS.md           # AI agent guidance
└── README.md           # This file
```

---

## Dependencies

- `@jitsi/react-sdk` - React components for Jitsi
- `next/navigation` - App Router navigation
- `@/lib/auth-client` - Better Auth session
- `@/domains/meeting/hooks` - Event persistence
- `@/domains/meeting/services` - Event emitter

---

## Environment

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_JITSI_DOMAIN` | Jitsi server domain | `meet.jitsi` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |

---

## Development

### Local Jitsi

```bash
# Run Jitsi locally with Docker
docker run -d \
  --name jitsi-meet \
  -p 8443:443 \
  jitsi/web:stable
```

### Debug Events

```typescript
// In page.tsx
api.addListener('*', (event, data) => {
  console.log(`[Jitsi] ${event}:`, data)
})
```

---

## Related Documentation

- [Jitsi SDK Events](../../domains/meeting/JitsiSDKAPI/EventListener.txt)
- [Jitsi SDK Commands](../../domains/meeting/JitsiSDKAPI/Commands.txt)
- [Jitsi SDK Functions](../../domains/meeting/JitsiSDKAPI/Functions.txt)
- [Transcript Service](../../domains/meeting/services/transcript/README.md)
- [Meeting Event Emitter](../../domains/meeting/services/meetingEventEmitter.ts)
