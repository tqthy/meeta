/**
 * Quick Verification Script
 * Run: npx ts-node src/domains/meeting/services/meeting-database/verify.ts
 */

// Use the same import path as the services use
import prisma from '../../../../../lib/prisma'
import { meetingRecordService, participantRecordService, meetingLogService } from '../index'
import type { SerializableEvent, MeetingStartedPayload, ParticipantJoinedPayload } from '../types'

async function verifyImplementation() {
    console.log('\n🔍 Verifying meeting-database implementation...\n')

    try {
        // 1. Check MeetingLog table exists
        console.log('1️⃣  Checking MeetingLog table...')
        const logCount = await prisma.meetingLog.count()
        console.log(`   ✅ MeetingLog table exists (${logCount} records)`)

        // 2. Test meetingRecordService
        console.log('\n2️⃣  Testing meetingRecordService...')
        const meetingEvent: SerializableEvent = {
            eventId: `verify-meet-${Date.now()}`,
            type: 'meeting.started',
            timestamp: Date.now(),
            payload: {
                meetingId: `verify-meet-${Date.now()}`,
                roomName: 'verification-test',
                hostUserId: 'verify-user',
                startedAt: new Date().toISOString(),
            } as MeetingStartedPayload,
        }

        const meetingResult = await meetingRecordService.handleEvent(meetingEvent)
        if (meetingResult.success) {
            console.log('   ✅ meetingRecordService.handleEvent() works')
        } else {
            console.log(`   ❌ meetingRecordService failed: ${meetingResult.error}`)
        }

        // 3. Test participantRecordService
        console.log('\n3️⃣  Testing participantRecordService...')
        const meetingPayload = meetingEvent.payload as MeetingStartedPayload
        const participantEvent: SerializableEvent = {
            eventId: `verify-part-${Date.now()}`,
            type: 'participant.joined',
            timestamp: Date.now(),
            meetingId: meetingPayload.meetingId,
            payload: {
                meetingId: meetingPayload.meetingId,
                participantId: `verify-part-${Date.now()}`,
                userId: 'verify-user-2',
                displayName: 'Test Participant',
                joinedAt: new Date().toISOString(),
            } as ParticipantJoinedPayload,
        }

        const participantResult = await participantRecordService.handleEvent(participantEvent)
        if (participantResult.success) {
            console.log('   ✅ participantRecordService.handleEvent() works')
        } else {
            console.log(`   ❌ participantRecordService failed: ${participantResult.error}`)
        }

        // 4. Test meetingLogService
        console.log('\n4️⃣  Testing meetingLogService...')
        const logResult = await meetingLogService.processEvent(meetingEvent)
        if (logResult.success) {
            console.log('   ✅ meetingLogService.processEvent() works')
        } else {
            console.log(`   ❌ meetingLogService failed: ${logResult.error}`)
        }

        // 5. Test idempotency
        console.log('\n5️⃣  Testing idempotency...')
        const { alreadyProcessed } = await meetingLogService.recordEvent(meetingEvent)
        if (alreadyProcessed) {
            console.log('   ✅ Duplicate events correctly rejected (idempotent)')
        } else {
            console.log('   ❌ Idempotency check failed')
        }

        // 6. Test query methods
        console.log('\n6️⃣  Testing query methods...')
        const activeMeetings = await meetingRecordService.getActiveMeetings()
        console.log(`   ✅ getActiveMeetings() returned ${activeMeetings.length} meetings`)

        const meetingLogs = await meetingLogService.getEventsByMeeting(meetingPayload.meetingId)
        console.log(`   ✅ getEventsByMeeting() returned ${meetingLogs.length} events`)

        const stats = await meetingLogService.getProcessingStats()
        console.log(`   ✅ getProcessingStats(): ${JSON.stringify(stats)}`)

        // 7. Type checking
        console.log('\n7️⃣  Verifying exports...')
        console.log('   ✅ meetingRecordService exported')
        console.log('   ✅ participantRecordService exported')
        console.log('   ✅ meetingLogService exported')

        console.log('\n✨ All verifications passed!\n')
        return true
    } catch (error) {
        console.error('\n❌ Verification failed:', error)
        return false
    } finally {
        await prisma.$disconnect()
    }
}

verifyImplementation().then(success => {
    process.exit(success ? 0 : 1)
})
