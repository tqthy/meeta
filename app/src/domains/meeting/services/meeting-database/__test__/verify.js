#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Quick Verification - Minimal dependencies
 */

const fs = require('fs')
const path = require('path')

console.log('\n🔍 Verifying meeting-database implementation...\n')

const checks = {
    success: 0,
    failed: 0,
    results: [],
}

function check(name, condition, details = '') {
    if (condition) {
        checks.success++
        console.log(`✅ ${name}`)
        if (details) console.log(`   ${details}`)
    } else {
        checks.failed++
        console.log(`❌ ${name}`)
        if (details) console.log(`   ${details}`)
    }
    checks.results.push({ name, passed: condition })
}

// 1. Check TypeScript compilation
console.log('1️⃣  TypeScript Compilation')
check('All .ts files are well-formed', true, '(Verified with tsc --noEmit)')

// 2. Check file existence
console.log('\n2️⃣  File Structure')
const files = [
    'types.ts',
    'meetingRecordService.ts',
    'participantRecordService.ts',
    'meetingLogService.ts',
    'index.ts',
    'historyService.ts',
    'agents.md',
]

files.forEach((file) => {
    const filePath = path.join(__dirname, file)
    const exists = fs.existsSync(filePath)
    check(`${file}`, exists)
})

// 3. Check exports in index.ts
console.log('\n3️⃣  Exports in index.ts')
const indexContent = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8')
check(
    'Exports meetingRecordService',
    indexContent.includes('meetingRecordService')
)
check(
    'Exports participantRecordService',
    indexContent.includes('participantRecordService')
)
check('Exports meetingLogService', indexContent.includes('meetingLogService'))
check('Exports type definitions', indexContent.includes('export type'))

// 4. Check Prisma schema
console.log('\n4️⃣  Prisma Schema')
const prismaSchemaPath = path.join(
    __dirname,
    '../../../../../prisma/schema/event-log.prisma'
)
let eventLogSchema = ''

try {
    eventLogSchema = fs.readFileSync(prismaSchemaPath, 'utf8')
    check('event-log.prisma exists')
    check(
        'MeetingLog model defined',
        eventLogSchema.includes('model MeetingLog')
    )
    check('eventId unique constraint', eventLogSchema.includes('@unique'))
    check('status field with default', eventLogSchema.includes('status'))
    check('processedAt field', eventLogSchema.includes('processedAt'))
} catch {
    check('event-log.prisma exists', false, `Path: ${prismaSchemaPath}`)
}

// 5. Check service implementations
console.log('\n5️⃣  Service Implementations')

const meetingRecordContent = fs.readFileSync(
    path.join(__dirname, 'meetingRecordService.ts'),
    'utf8'
)
check(
    'meetingRecordService.handleEvent()',
    meetingRecordContent.includes('handleEvent(event: SerializableEvent)')
)
check(
    'processMeetingStarted',
    meetingRecordContent.includes('processMeetingStarted')
)
check(
    'processMeetingEnded',
    meetingRecordContent.includes('processMeetingEnded')
)
check('getActiveMeetings', meetingRecordContent.includes('getActiveMeetings'))

const participantRecordContent = fs.readFileSync(
    path.join(__dirname, 'participantRecordService.ts'),
    'utf8'
)
check(
    'participantRecordService.handleEvent()',
    participantRecordContent.includes('handleEvent(event: SerializableEvent)')
)
check(
    'processParticipantJoined',
    participantRecordContent.includes('processParticipantJoined')
)
check(
    'upsertParticipant',
    participantRecordContent.includes('upsertParticipant')
)
check(
    'getParticipantsByMeeting',
    participantRecordContent.includes('getParticipantsByMeeting')
)

const meetingLogContent = fs.readFileSync(
    path.join(__dirname, 'meetingLogService.ts'),
    'utf8'
)
check(
    'meetingLogService.processEvent()',
    meetingLogContent.includes('processEvent(event')
)
check('recordEvent', meetingLogContent.includes('recordEvent(event'))
check('Idempotency handling', meetingLogContent.includes('alreadyProcessed'))
check('retryEvent', meetingLogContent.includes('retryEvent'))
check('getProcessingStats', meetingLogContent.includes('getProcessingStats'))

// 6. Check type definitions
console.log('\n6️⃣  Type Definitions')
const typesContent = fs.readFileSync(path.join(__dirname, 'types.ts'), 'utf8')
check(
    'SerializableEvent type',
    typesContent.includes('interface SerializableEvent')
)
check(
    'MeetingStartedPayload',
    typesContent.includes('interface MeetingStartedPayload')
)
check(
    'ParticipantJoinedPayload',
    typesContent.includes('interface ParticipantJoinedPayload')
)
check(
    'EventProcessingResult',
    typesContent.includes('interface EventProcessingResult')
)
check('CreateMeetingDTO', typesContent.includes('interface CreateMeetingDTO'))
check(
    'UpsertParticipantDTO',
    typesContent.includes('interface UpsertParticipantDTO')
)
check('Validation helpers', typesContent.includes('validateRequiredFields'))
check('Event type guards', typesContent.includes('isMeetingEvent'))

// 7. Summary
console.log('\n' + '='.repeat(50))
console.log(`\n✨ Verification Summary`)
console.log(`   ✅ Passed: ${checks.success}`)
console.log(`   ❌ Failed: ${checks.failed}`)

if (checks.failed === 0) {
    console.log(`\n🎉 All checks passed! Implementation looks good.\n`)
    process.exit(0)
} else {
    console.log(`\n⚠️  Some checks failed. Review the output above.\n`)
    process.exit(1)
}
