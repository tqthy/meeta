'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Video, Keyboard, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { checkMeetingExists } from '@/domains/meeting/hooks/useFetchingMeeting'

export default function DashboardPage() {
    const [meetingCode, setMeetingCode] = useState('')
    const [isChecking, setIsChecking] = useState(false)
    const router = useRouter()
    const handleJoinMeeting = async () => {
        if (!meetingCode.trim()) return

        // Extract meeting ID from URL if full URL pasted
        let meetingId = meetingCode.trim()

        // Handle full URLs
        if (meetingId.includes('/')) {
            const parts = meetingId.split('/')
            meetingId = parts[parts.length - 1]
        }

        setIsChecking(true)

        try {
            const result = await checkMeetingExists(meetingId)

            if (result.exists) {
                router.push(`/jitsi-meeting/${result.roomName || meetingId}`)
            } else {
                alert(
                    'Meeting not found. Please check the meeting code and try again.'
                )
            }
        } catch {
            alert('Failed to check meeting. Please try again.')
        } finally {
            setIsChecking(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isChecking) {
            handleJoinMeeting()
        }
    }

    return (
        <main className="flex-1 overflow-auto bg-background">
            <div className="max-w-3xl mx-auto px-6 py-12">
                {/* Hero Section - Matching Sidebar UI MainContent */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl text-foreground mb-3">
                        Premium video meetings
                        <br />
                        for everyone
                    </h1>
                    <p className="text-muted-foreground">
                        Connect, collaborate and celebrate from anywhere with
                        Meeta.
                    </p>
                </div>

                {/* Action Buttons - Matching Sidebar UI layout */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                    <Button asChild size="lg">
                        <Link href="/jitsi-meeting/create">
                            <Video className="mr-2 h-5 w-5" />
                            New meeting
                        </Link>
                    </Button>

                    {/* Meeting Code Input */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Keyboard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Enter a code or link"
                                value={meetingCode}
                                onChange={(e) => setMeetingCode(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-9 w-64"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleJoinMeeting}
                            disabled={!meetingCode.trim() || isChecking}
                        >
                            {isChecking ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Join'
                            )}
                        </Button>
                    </div>
                </div>

                <hr className="border-border mb-12" />

                {/* Learn More Footer */}
                <div className="text-center mt-8">
                    <Link
                        href="/dashboard/history"
                        className="text-primary hover:underline"
                    >
                        View all your meetings
                    </Link>
                    <span className="text-muted-foreground"> in history</span>
                </div>
            </div>
        </main>
    )
}
