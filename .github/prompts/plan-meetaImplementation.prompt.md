# Plan: Meeta - Self-Hosted Video Conferencing MVP

Build a Google Meet alternative with Jitsi video, real-time transcription (Deepgram), and AI summaries (OpenAI/Claude). The project starts from a fresh Next.js 15 setup and will be developed in 5 phases over ~5 weeks.

---

## Phase 1: Foundation (Week 1)

1. **Set up database with Prisma** — Create [schema.prisma](app/prisma/schema.prisma) with models: `User`, `Account`, `Session`, `Meeting`, `MeetingParticipant`, `Transcript`, `TranscriptSegment`, `Summary`, `Recording`

2. **Configure NextAuth.js v5** — Add OAuth providers (Google, GitHub) in [auth.ts](app/src/lib/auth.ts), use Prisma adapter, create auth middleware in [middleware.ts](app/src/middleware.ts)

3. **Install UI component library** — Set up shadcn/ui components in [components/ui/](app/src/components/ui/): `Button`, `Card`, `Dialog`, `Input`, `Avatar`, `Toast`, `Tabs`

4. **Build authentication pages** — Create [login/page.tsx](<app/src/app/(auth)/login/page.tsx>) and [signup/page.tsx](<app/src/app/(auth)/signup/page.tsx>) with OAuth buttons

5. **Create dashboard layout** — Build [layout.tsx](<app/src/app/(dashboard)/layout.tsx>) with `Sidebar`, `Navbar`, and `UserMenu` components

6. **Implement protected routes** — Add session checks in middleware, redirect unauthenticated users

---

## Phase 2: Meeting Management (Week 2)

1. **Create Meeting API endpoints** — Build [api/meetings/route.ts](app/src/app/api/meetings/route.ts) with CRUD operations, input validation using Zod

2. **Implement Jitsi JWT generation** — Create [lib/jitsi.ts](app/src/lib/jitsi.ts) using `jose` library for signing JWTs with user identity & room permissions

3. **Build meeting creation flow** — Create [meetings/new/page.tsx](<app/src/app/(dashboard)/meetings/new/page.tsx>) with form for title, description, scheduled time

4. **Integrate Jitsi React SDK** — Create [JitsiMeeting.tsx](app/src/components/meeting/jitsi-meeting.tsx) wrapper using `@jitsi/react-sdk` with custom config

5. **Build meeting room page** — Create [room/page.tsx](<app/src/app/(dashboard)/meetings/[id]/room/page.tsx>) with pre-join lobby, meeting controls overlay

6. **Implement participant tracking** — Use Jitsi events (`participantJoined`, `participantLeft`) to record attendance via API

---

## Phase 3: Transcription Pipeline (Week 3)

1. **Integrate Deepgram SDK** — Create [lib/transcription.ts](app/src/lib/ai/transcription.ts) with WebSocket connection to Deepgram Nova-3 model

2. **Implement audio extraction** — Use Jitsi's `transcriptionChunkReceived` event or client-side `MediaRecorder` as fallback

3. **Build transcript streaming API** — Create WebSocket endpoint [api/transcription/stream/route.ts](app/src/app/api/transcription/stream/route.ts) for real-time updates

4. **Store transcript segments** — Save `TranscriptSegment` records with speaker ID, timestamps, and confidence scores

5. **Create live transcript component** — Build [LiveTranscript.tsx](app/src/components/transcript/live-transcript.tsx) with auto-scroll and speaker labels

6. **Build transcript viewer page** — Create [transcript/page.tsx](<app/src/app/(dashboard)/meetings/[id]/transcript/page.tsx>) with full transcript, speaker legend, download options

---

## Phase 4: AI Summary Generation (Week 4)

1. **Integrate OpenAI/Claude SDK** — Create [lib/ai/summarization.ts](app/src/lib/ai/summarization.ts) with structured output prompts

2. **Implement transcript chunking** — Split long transcripts (~4K tokens) with overlap, use hierarchical summarization for very long meetings

3. **Build summary generation API** — Create [api/meetings/[id]/summary/route.ts](app/src/app/api/meetings/[id]/summary/route.ts) triggered on meeting end

4. **Design summary schema** — Store structured JSON: `overview`, `keyPoints[]`, `actionItems[]`, `decisions[]`, `nextSteps[]`

5. **Create summary viewer UI** — Build [summary/page.tsx](<app/src/app/(dashboard)/meetings/[id]/summary/page.tsx>) with sections for each summary component

6. **Add summary editing** — Allow users to edit/regenerate summaries with different styles (bullet, narrative, decisions-only)

---

## Phase 5: Polish & Infrastructure (Week 5)

1. **Set up Docker Compose** — Create [docker-compose.yml](docker-compose.yml) with PostgreSQL, Redis, and optional Jitsi stack

2. **Add error handling** — Implement error boundaries, API error responses, retry logic for transcription/AI calls

3. **Build loading states** — Add skeleton loaders, progress indicators for transcript processing, summary generation

4. **Create meeting history page** — Build [history/page.tsx](<app/src/app/(dashboard)/history/page.tsx>) with past meetings, search, and filters

5. **Implement download functionality** — Add export options for transcripts (TXT, JSON, SRT) and summaries (PDF, Markdown)

6. **Write deployment documentation** — Create [docs/deployment.md](docs/deployment.md) with local, Docker, and cloud instructions

---

## Further Considerations

1. **Jitsi hosting decision?** — Start with meet.jit.si for development, then self-host with Docker for production (full transcription access) / Use JaaS for managed option

2. **Transcription fallback strategy?** — Primary: Deepgram real-time (~$0.0043/min) / Fallback: Recording + Whisper API for post-processing / Option: Local Whisper for free tier

3. **Cost management approach?** — Implement per-user quotas / Cache AI summaries / Consider usage-based billing for commercial deployment

4. **Recording storage?** — Optional for MVP / Recommend S3-compatible storage (AWS S3, Cloudflare R2) if implemented later
