-- CreateTable
CREATE TABLE "MeetingLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingLog_eventId_key" ON "MeetingLog"("eventId");

-- CreateIndex
CREATE INDEX "MeetingLog_meetingId_idx" ON "MeetingLog"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingLog_eventType_idx" ON "MeetingLog"("eventType");

-- CreateIndex
CREATE INDEX "MeetingLog_status_idx" ON "MeetingLog"("status");

-- CreateIndex
CREATE INDEX "MeetingLog_timestamp_idx" ON "MeetingLog"("timestamp");
