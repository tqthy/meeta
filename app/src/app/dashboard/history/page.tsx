'use client'

import React, { useState } from 'react'
import {
    useMeetingHistory,
    useUserMeetingStats,
} from '@/domains/meeting/hooks/useFetchingMeeting'
import type { MeetingHistoryFilters } from '@/domains/meeting/hooks/useFetchingMeeting'
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
    Calendar,
    Clock,
    Users,
    Video,
    CheckCircle2,
    XCircle,
    PlayCircle,
    Loader2,
    RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'

type StatusFilter = 'all' | 'ACTIVE' | 'ENDED' | 'SCHEDULED' | 'CANCELLED'
type RoleFilter = 'all' | 'host' | 'participant'

export default function DashboardHistoryPage() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
    const [page, setPage] = useState(0)
    const pageSize = 20

    // Build filters (memoized to avoid unnecessary re-renders)
    const filters: MeetingHistoryFilters = React.useMemo(
        () => ({
            status: statusFilter !== 'all' ? statusFilter : undefined,
            role: roleFilter,
            limit: pageSize,
            offset: page * pageSize,
            filter: statusFilter,
        }),
        [statusFilter, roleFilter, page]
    )

    // Fetch data
    const { meetings, isLoading, error, mutate } = useMeetingHistory(filters, {
        refreshInterval: 10000, // Refresh every 10 seconds
    })
    const { stats, isLoading: statsLoading } = useUserMeetingStats()

    // Debug logging
    React.useEffect(() => {
        console.log('[DashboardHistoryPage] Render state:', {
            isLoading,
            error: error?.message,
            meetingsCount: meetings?.length,
            meetings: meetings,
            // filters,
        })
    }, [isLoading, error, meetings])

    // Format duration
    const formatDuration = (seconds?: number) => {
        if (!seconds) return 'N/A'
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        if (hours > 0) return `${hours}h ${minutes}m`
        return `${minutes}m`
    }

    // Get status badge styling
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Meeting History
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage your past meetings
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => mutate()}
                    disabled={isLoading}
                >
                    <RefreshCw
                        className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                    />
                    Refresh
                </Button>
            </div>

            {/* Statistics */}
            {!statsLoading && stats && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Meetings
                            </CardTitle>
                            <Video className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.totalMeetings}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Hosted
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.hostedMeetings}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Participated
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.participatedMeetings}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Active Now
                            </CardTitle>
                            <PlayCircle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {stats.activeMeetings}
                            </div>
                        </CardContent>
                    </Card>
                    {/* <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Scheduled
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {stats.scheduledMeetings}
                            </div>
                        </CardContent>
                    </Card> */}
                </div>
            )}

            
            {/* <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>
                        Filter meetings by status and role
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3">
                        <div className="flex gap-2">
                            <span className="text-sm font-medium text-muted-foreground self-center">
                                Status:
                            </span>
                            {(
                                [
                                    'all',
                                    'ACTIVE',
                                    'ENDED',
                                    'SCHEDULED',
                                    'CANCELLED',
                                ] as StatusFilter[]
                            ).map((status) => (
                                <Button
                                    key={status}
                                    variant={
                                        statusFilter === status
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => {
                                        setStatusFilter(status)
                                        setPage(0)
                                    }}
                                >
                                    {status === 'all' ? 'All' : status}
                                </Button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <span className="text-sm font-medium text-muted-foreground self-center">
                                Role:
                            </span>
                            {(
                                ['all', 'host', 'participant'] as RoleFilter[]
                            ).map((role) => (
                                <Button
                                    key={role}
                                    variant={
                                        roleFilter === role
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => {
                                        setRoleFilter(role)
                                        setPage(0)
                                    }}
                                >
                                    {role.charAt(0).toUpperCase() +
                                        role.slice(1)}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
                
            </Card> */}

            {/* Meeting List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <p className="text-red-600">
                            Failed to load meetings: {error.message}
                        </p>
                    </CardContent>
                </Card>
            ) : meetings.length === 0 ? (
                <Card>
                    <CardContent className="pt-6 text-center">
                        <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">
                            No meetings found
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {statusFilter !== 'all' || roleFilter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Start by creating your first meeting'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {meetings.map((meeting) => {
                        const statusBadge = getStatusBadge(meeting.status)
                        const StatusIcon = statusBadge.icon
                        const meetingTime =
                            meeting.startedAt ||
                            meeting.scheduledAt ||
                            meeting.createdAt

                        return (
                            <Card
                                key={meeting.id}
                                className="hover:shadow-md transition-shadow"
                            >
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold">
                                                    {meeting.title}
                                                </h3>
                                                <div
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${statusBadge.className}`}
                                                >
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusBadge.label}
                                                </div>
                                                <div className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium dark:text-black">
                                                    {meeting.userRole}
                                                </div>
                                            </div>

                                            {meeting.description && (
                                                <p className="text-sm text-muted-foreground mb-3">
                                                    {meeting.description}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                {/* Host */}
                                                {meeting.host && (
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-5 w-5">
                                                            <Image
                                                                src={
                                                                    meeting.host
                                                                        .image ||
                                                                    `https://api.dicebear.com/7.x/initials/svg?seed=${meeting.host.name || meeting.host.email}`
                                                                }
                                                                alt={
                                                                    meeting.host
                                                                        .name ||
                                                                    'Host'
                                                                }
                                                                width={20}
                                                                height={20}
                                                            />
                                                        </Avatar>
                                                        <span>
                                                            Host:{' '}
                                                            {meeting.host
                                                                .name ||
                                                                meeting.host
                                                                    .email}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Participants */}
                                                <div className="flex items-center gap-1">
                                                    <Users className="h-4 w-4" />
                                                    <span>
                                                        {
                                                            meeting.participantCount
                                                        }{' '}
                                                        participant
                                                        {meeting.participantCount !==
                                                        1
                                                            ? 's'
                                                            : ''}
                                                    </span>
                                                </div>

                                                {/* Time */}
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    <span>
                                                        {formatDistanceToNow(
                                                            new Date(
                                                                meetingTime
                                                            ),
                                                            { addSuffix: true }
                                                        )}
                                                    </span>
                                                </div>

                                                {/* Duration */}
                                                {meeting.duration && (
                                                    <div className="flex items-center gap-1">
                                                        <Video className="h-4 w-4" />
                                                        <span>
                                                            {formatDuration(
                                                                meeting.duration
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Timestamps */}
                                            <div className="mt-3 text-xs text-muted-foreground space-y-1">
                                                {meeting.scheduledAt && (
                                                    <div>
                                                        Scheduled:{' '}
                                                        {format(
                                                            new Date(
                                                                meeting.scheduledAt
                                                            ),
                                                            'PPp'
                                                        )}
                                                    </div>
                                                )}
                                                {meeting.startedAt && (
                                                    <div>
                                                        Started:{' '}
                                                        {format(
                                                            new Date(
                                                                meeting.startedAt
                                                            ),
                                                            'PPp'
                                                        )}
                                                    </div>
                                                )}
                                                {meeting.endedAt && (
                                                    <div>
                                                        Ended:{' '}
                                                        {format(
                                                            new Date(
                                                                meeting.endedAt
                                                            ),
                                                            'PPp'
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="ml-4 flex flex-col gap-2">
                                            {meeting.status === 'ACTIVE' ? (
                                                <Button asChild>
                                                    <Link
                                                        href={`/jitsi-meeting/${meeting.roomName}`}
                                                    >
                                                        Join Meeting
                                                    </Link>
                                                </Button>
                                            ) : meeting.status ===
                                              'SCHEDULED' ? (
                                                <Button
                                                    variant="outline"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/meeting/${meeting.roomName}`}
                                                    >
                                                        Join When Ready
                                                    </Link>
                                                </Button>
                                            ) : meeting.status === 'ENDED' ? (
                                                <Button
                                                    variant="outline"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/dashboard/history/${meeting.id}`}
                                                    >
                                                        View Details
                                                    </Link>
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
            {!isLoading && meetings.length > 0 && (
                <div className="flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page + 1}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={meetings.length < pageSize}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}
