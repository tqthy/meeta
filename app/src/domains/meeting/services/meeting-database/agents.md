## meeting-database — Agents Guide

Purpose: Guidance for the persistence domain that subscribes to `meeting-runtime` events and maps them into Prisma DTOs to persist meetings, participants, and logs.

Principles

- `meeting-database` is a consumer of serializable events emitted by `meeting-runtime`.
- Validate and sanitize every incoming event payload before mapping to DTOs.
- Implement idempotent operations: event processing may be retried or delivered more than once.
- Use Prisma (server-only) here — this domain is the only place that imports Prisma client or performs writes.

Recommended services

- `meetingRecordService` — persist meeting lifecycle (create/update Meeting rows).
- `participantRecordService` — upsert participant rows and maintain current state.
- `meetingLogService` — persist raw events or structured logs for auditing and replay.

Event → Prisma mapping examples

- `meeting.started` → `Meeting` create
    - Event payload (example): `{ meetingId, roomName, hostUserId, startedAt }`
    - Prisma DTO (pseudo):
        ```ts
        const dto = {
            id: event.payload.meetingId,
            roomName: event.payload.roomName,
            hostUserId: event.payload.hostUserId,
            startedAt: new Date(event.payload.startedAt),
        }
        await prisma.meeting.create({ data: dto })
        ```

- `participant.joined` → `Participant` upsert + `MeetingParticipant` join record
    - Use `upsert` keyed by `participantId` or `userId` so repeated join events don't create duplicates.
    - Optionally maintain a `MeetingParticipant` join/leave history table with `joinedAt`/`leftAt`.

- `track.added` → `MeetingLog` or `Track` table
    - Persist minimal track metadata (trackId, kind, participantId, createdAt). Tracks are transient; consider storing only when necessary (e.g., for audits or recordings).

Idempotency & deduplication strategies

- Prefer storing `eventId` (from runtime) in a `ProcessedEvent` table or as part of a `MeetingLog` with a unique constraint on `eventId` to prevent double-processing.
- Use `upsert` or unique constraints on natural keys (`participantId`, `meetingId` + `trackId`) where appropriate.
- In high-throughput systems, consider a lightweight `INSERT ... ON CONFLICT DO NOTHING` (or Prisma equivalent) for dedupe.

Transactions and consistency

- Batch related DB operations in a transaction when processing a single event that affects multiple tables (e.g., participant upsert + meeting participant join record).
- Keep transactions short and retry on transient failures. Handle Prisma-specific errors (e.g., unique constraint violations) gracefully.

Error handling and retries

- On transient DB errors, implement exponential backoff retries.
- On permanent or schema errors, log the failing event into a dead-letter queue or a `FailedEvent` table with full payload and error message.

Service API examples (pseudo)

- `meetingRecordService.handleEvent(event: SerializableEvent)`
    - Validate `event.type` and `event.payload`.
    - Use switch/case to route to specialized handlers: `processMeetingStarted`, `processParticipantJoined`, etc.

- `participantRecordService.upsertParticipant(payload)`
    - Use `prisma.participant.upsert({ where: { id: payload.participantId }, update: {...}, create: {...} })`.

- `meetingLogService.recordEvent(event)`
    - Store raw JSON event and return a DB id for traceability. Enforce uniqueness on `eventId`.

Validation and contracts

- The persistence domain should not assume optional fields exist; validate required fields and either reject or normalize missing values.
- Keep a small set of JSON Schemas or TypeScript types that define the expected shapes for each `type` of event.

Observability and monitoring

- Emit metrics for event processing success/failure, processing latency, and DB error rates.
- Keep an audit trail (raw events + processed status) for replay during migrations or incident investigations.

Domain testing

- Unit tests: mock Prisma client and test mapping logic and idempotency behavior.
- Integration tests: run against a test database and verify that events produce the expected DB state.

Deployment notes

- This domain should run on server-side only processes (serverless functions, background workers, or dedicated services). Do not bundle with client-side code.

Generated: concise agent guide for `meeting-database` domain (Prisma mapping + idempotency guidance).
