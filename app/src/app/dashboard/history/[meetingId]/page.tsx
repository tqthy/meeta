'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import {
    ArrowLeft,
    Calendar,
    Clock,
    Users,
    FileText,
    Loader2,
    MessageSquare,
    User,
    CheckCircle2,
    XCircle,
    PlayCircle,
    AlertCircle,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { SummarizeSection } from '@/components/dashboard/summarize-section'

// Types for API response
interface MeetingHost {
    id: string
    name: string | null
    email: string
    image: string | null
}

interface MeetingParticipant {
    id: string
    displayName: string
    email: string | null
    role: string
    joinedAt: string
    leftAt: string | null
}

interface TranscriptSegment {
    id: string
    messageId: string
    speakerId: number
    speakerName: string | null
    speakerUserId: string | null
    jitsiParticipantId: string | null
    startTime: number | null
    endTime: number | null
    text: string
    confidence: number | null
    isFinal: boolean
    receivedAt: string
    createdAt: string
}

interface MeetingData {
    id: string
    roomName: string
    title: string
    description: string | null
    status: string
    startedAt: string | null
    endedAt: string | null
    duration: number | null
    host: MeetingHost | null
    participants: MeetingParticipant[]
    createdAt: string
}

interface TranscriptData {
    id: string
    status: string
    language: string
    wordCount: number | null
    fullText: string | null
    startedAt: string | null
    endedAt: string | null
    segments: TranscriptSegment[]
}

interface ApiResponse {
    meeting: MeetingData
    transcript: TranscriptData | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MeetingDetailPage() {
    const params = useParams()
    const router = useRouter()
    const meetingId = (params as { meetingId?: string })?.meetingId || ''

    const { data, error, isLoading } = useSWR<ApiResponse>(
        meetingId ? `/api/meetings/${meetingId}/transcript` : null,
        fetcher
    )

    // Format duration
    const formatDuration = (seconds?: number | null) => {
        if (!seconds) return 'N/A'
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
        if (minutes > 0) return `${minutes}m ${secs}s`
        return `${secs}s`
    }

    // Get status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return {
                    icon: PlayCircle,
                    className: 'text-green-600 bg-green-50 border-green-200',
                    label: 'Active',
                }
            case 'ENDED':
                return {
                    icon: CheckCircle2,
                    className: 'text-gray-600 bg-gray-50 border-gray-200',
                    label: 'Ended',
                }
            // case 'SCHEDULED':
            //     return {
            //         icon: Calendar,
            //         className: 'text-blue-600 bg-blue-50 border-blue-200',
            //         label: 'Scheduled',
            //     }
            case 'CANCELLED':
                return {
                    icon: XCircle,
                    className: 'text-red-600 bg-red-50 border-red-200',
                    label: 'Cancelled',
                }
            default:
                return {
                    icon: Clock,
                    className: 'text-gray-600 bg-gray-50 border-gray-200',
                    label: status,
                }
        }
    }

    // Get transcript status badge
    const getTranscriptStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return {
                    icon: CheckCircle2,
                    className: 'text-green-600 bg-green-50',
                    label: 'Completed',
                }
            case 'PROCESSING':
                return {
                    icon: Loader2,
                    className: 'text-blue-600 bg-blue-50 animate-spin',
                    label: 'Processing',
                }
            case 'FAILED':
                return {
                    icon: XCircle,
                    className: 'text-red-600 bg-red-50',
                    label: 'Failed',
                }
            default:
                return {
                    icon: AlertCircle,
                    className: 'text-gray-600 bg-gray-50',
                    label: status,
                }
        }
    }

    // Group segments by speaker for better readability
    const groupedSegments = React.useMemo(() => {
        if (!data?.transcript?.segments) return []

        const segments = data.transcript.segments
        const grouped: {
            speakerName: string
            segments: TranscriptSegment[]
        }[] = []

        let currentGroup: {
            speakerName: string
            segments: TranscriptSegment[]
        } | null = null

        for (const segment of segments) {
            const speakerName =
                segment.speakerName || `Speaker ${segment.speakerId}`

            if (!currentGroup || currentGroup.speakerName !== speakerName) {
                currentGroup = { speakerName, segments: [segment] }
                grouped.push(currentGroup)
            } else {
                currentGroup.segments.push(segment)
            }
        }

        return grouped
    }, [data?.transcript?.segments])

    if (isLoading) {
        return (
            <main className="flex-1 overflow-auto bg-background">
                <div className="max-w-4xl mx-auto px-6 py-12">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </div>
            </main>
        )
    }

    if (error || !data?.meeting) {
        return (
            <main className="flex-1 overflow-auto bg-background">
                <div className="max-w-4xl mx-auto px-6 py-12">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to History
                    </Button>
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-6">
                            <p className="text-red-600">
                                {error?.message || 'Meeting not found'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        )
    }

    const { meeting, transcript } = data
    const statusBadge = getStatusBadge(meeting.status)
    const StatusIcon = statusBadge.icon

    return (
        <main className="flex-1 overflow-auto bg-background">
            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Back Button */}
                <Button variant="ghost" asChild className="mb-6">
                    <Link href="/dashboard/history">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to History
                    </Link>
                </Button>

                {/* Meeting Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <h1 className="text-4xl text-foreground">
                            {meeting.title}
                        </h1>
                        <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-md border text-sm font-medium ${statusBadge.className}`}
                        >
                            <StatusIcon className="h-4 w-4" />
                            {statusBadge.label}
                        </div>
                    </div>
                    {meeting.description && (
                        <p className="text-muted-foreground mb-2">
                            {meeting.description}
                        </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                        Room:{' '}
                        <code className="bg-muted px-1 py-0.5 rounded">
                            {meeting.roomName}
                        </code>
                    </p>
                </div>

                <hr className="border-border mb-8" />

                {/* Meeting Info - Compact Layout */}
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-8">
                    {/* Duration */}
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                            {formatDuration(meeting.duration)}
                        </span>
                    </div>

                    <span className="text-muted-foreground/50">•</span>

                    {/* Participants */}
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">
                            {meeting.participants.length} participant
                            {meeting.participants.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <span className="text-muted-foreground/50">•</span>

                    {/* Started At */}
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">
                            {meeting.startedAt
                                ? format(new Date(meeting.startedAt), 'PPp')
                                : 'Not started'}
                        </span>
                    </div>
                </div>

                {/* Host & Participants */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Participants</CardTitle>
                        <CardDescription>
                            People who joined this meeting
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {/* Deduplicated participants - merge by displayName, keep earliest join and latest left */}
                            {(() => {
                                // Deduplicate participants by displayName
                                const uniqueParticipants =
                                    meeting.participants.reduce(
                                        (acc, p) => {
                                            const existing = acc.find(
                                                (ep) =>
                                                    ep.displayName ===
                                                    p.displayName
                                            )
                                            if (existing) {
                                                // Keep earliest joinedAt and latest leftAt
                                                if (
                                                    new Date(p.joinedAt) <
                                                    new Date(existing.joinedAt)
                                                ) {
                                                    existing.joinedAt =
                                                        p.joinedAt
                                                }
                                                if (
                                                    p.leftAt &&
                                                    (!existing.leftAt ||
                                                        new Date(p.leftAt) >
                                                            new Date(
                                                                existing.leftAt
                                                            ))
                                                ) {
                                                    existing.leftAt = p.leftAt
                                                }
                                            } else {
                                                acc.push({ ...p })
                                            }
                                            return acc
                                        },
                                        [] as typeof meeting.participants
                                    )

                                if (uniqueParticipants.length === 0) {
                                    return (
                                        <p className="text-muted-foreground text-center py-4">
                                            No participants recorded
                                        </p>
                                    )
                                }

                                return uniqueParticipants.map((participant) => {
                                    // Check if this participant is the host
                                    const isHost =
                                        meeting.host &&
                                        (participant.displayName ===
                                            meeting.host.name ||
                                            participant.email ===
                                                meeting.host.email)

                                    return (
                                        <div
                                            key={participant.id}
                                            className={`flex items-center gap-3 p-2 rounded-lg ${
                                                isHost
                                                    ? 'bg-blue-50 dark:bg-blue-950'
                                                    : 'hover:bg-muted'
                                            }`}
                                        >
                                            <Avatar className="h-8 w-8">
                                                <div
                                                    className={`w-full h-full flex items-center justify-center ${
                                                        isHost
                                                            ? 'bg-blue-200 text-blue-700'
                                                            : 'bg-gray-200 text-gray-600'
                                                    }`}
                                                >
                                                    <User className="h-4 w-4" />
                                                </div>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="font-medium">
                                                    {participant.displayName}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Joined{' '}
                                                    {formatDistanceToNow(
                                                        new Date(
                                                            participant.joinedAt
                                                        ),
                                                        { addSuffix: true }
                                                    )}
                                                    {participant.leftAt && (
                                                        <>
                                                            {' '}
                                                            · Left{' '}
                                                            {formatDistanceToNow(
                                                                new Date(
                                                                    participant.leftAt
                                                                ),
                                                                {
                                                                    addSuffix: true,
                                                                }
                                                            )}
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                            {isHost && (
                                                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                                    Host
                                                </span>
                                            )}
                                        </div>
                                    )
                                })
                            })()}
                        </div>
                    </CardContent>
                </Card>

                {/* Transcript */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Transcript
                                </CardTitle>
                                <CardDescription>
                                    {transcript
                                        ? `${transcript.segments.length} segments · ${transcript.language}`
                                        : 'No transcript available for this meeting'}
                                </CardDescription>
                            </div>
                            {transcript && transcript.segments.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        console.log('Summarize with AI clicked')
                                    }
                                >
                                    ✨ Summarize with AI
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {transcript && transcript.segments.length > 0 ? (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                {groupedSegments.map((group, groupIndex) => (
                                    <div key={groupIndex} className="space-y-1">
                                        <div className="flex items-center gap-2 sticky top-0 bg-background py-1">
                                            <span className="text-sm font-semibold text-primary">
                                                {group.speakerName}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(
                                                    new Date(
                                                        group.segments[0].receivedAt
                                                    ),
                                                    'HH:mm:ss'
                                                )}
                                            </span>
                                        </div>
                                        <div className="pl-4 border-l-2 border-muted space-y-1">
                                            {group.segments.map((segment) => (
                                                <p
                                                    key={segment.id}
                                                    className={`text-sm ${
                                                        segment.isFinal
                                                            ? 'text-foreground'
                                                            : 'text-muted-foreground italic'
                                                    }`}
                                                >
                                                    {segment.text}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                    No transcript segments available
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Transcription may not have been enabled for
                                    this meeting
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Summary Section - Only show if transcript exists */}
                {transcript && transcript.segments.length > 0 && (
                    <div className="mb-6">
                        <SummarizeSection meetingId={meetingId} />
                    </div>
                )}
            </div>
        </main>
    )
}
