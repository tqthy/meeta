'use client'

import React, { useEffect, useState } from 'react'
import { JitsiMeeting } from '@jitsi/react-sdk'
import { useParams, useRouter } from 'next/navigation'

export default function JitsiMeetingPage() {
    const domain = 'localhost:8443' //'meet.jitsi'
    const params = useParams()
    const router = useRouter()
    const meetingId = (params as { meetingId?: string })?.meetingId || ''

    const [displayName] = useState(
        () => `Guest-${Math.random().toString(36).slice(2, 8)}`
    )

    useEffect(() => {
        if (!meetingId) {
            // If no meeting id present, redirect to create page
            router.replace('/dashboard')
        }
    }, [meetingId, router])

    return (
        <div style={{ height: '100vh', width: '100%' }} className="text-black">
            <JitsiMeeting
                domain={domain}
                roomName={meetingId}
                configOverwrite={{
                    startWithAudioMuted: false,
                    disableModeratorIndicator: false,
                    startScreenSharing: false,
                    enableEmailInStats: false,
                }}
                interfaceConfigOverwrite={{
                    DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
                }}
                userInfo={{
                    email: `${displayName.replace(/\s+/g, '').toLowerCase()}@example.com`,
                    displayName: displayName,
                }}
                onApiReady={(externalApi) => {
                    console.log('Jitsi Meet API ready')

                    externalApi.addListener('readyToClose', () => {
                        // navigate back to create page after meeting closes
                        router.push('/jitsi-meeting/create')
                    })
                }}
                getIFrameRef={(iframeRef) => {
                    if (iframeRef) {
                        iframeRef.style.height = '100vh'
                        iframeRef.style.width = '100%'
                    }
                }}
            />
        </div>
    )
}
