'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJitsiConnection } from '@/hooks/useJitsiConnection'

export default function RoomPage() {
    const params = useParams()
    const router = useRouter()
    const roomName = params.id as string

    const [userName, setUserName] = useState('')
    const [cameraEnabled, setCameraEnabled] = useState(true)
    const [micEnabled, setMicEnabled] = useState(true)

    useEffect(() => {
        const storedUserName = sessionStorage.getItem('userName') || 'Guest'
        const storedCameraEnabled =
            sessionStorage.getItem('cameraEnabled') === 'true'
        const storedMicEnabled = sessionStorage.getItem('micEnabled') === 'true'

        setUserName(storedUserName)
        setCameraEnabled(storedCameraEnabled)
        setMicEnabled(storedMicEnabled)
    }, [])

    const { isConnected, isJoined, disconnect } = useJitsiConnection({
        roomName: roomName || '',
        userName,
        cameraEnabled,
        micEnabled,
        onConferenceJoined: (room) => {
            console.log('[Room] Joined conference:', room)
        },
        onConferenceLeft: () => {
            console.log('[Room] Left conference')
            router.push('/dashboard/meetings')
        },
        onConferenceFailed: (error) => {
            console.error('[Room] Conference failed:', error)
            alert('Failed to join meeting: ' + error.message)
            router.push('/dashboard/meetings')
        },
    })

    const handleLeave = async () => {
        await disconnect()
    }

    return (
        <div className="flex flex-col h-screen bg-gray-900">
            <div className="flex-1 bg-gray-800">
                <div className="w-full h-full flex items-center justify-center">
                    {isJoined ? (
                        <div className="text-white text-center">
                            <h1 className="text-3xl font-bold mb-4">
                                Room: {roomName}
                            </h1>
                            <p className="mb-2">Connected as: {userName}</p>
                            <p className="text-sm text-gray-400">
                                Camera:{' '}
                                {cameraEnabled ? 'ON' : 'OFF'} | Mic:{' '}
                                {micEnabled ? 'ON' : 'OFF'}
                            </p>
                        </div>
                    ) : (
                        <div className="text-white text-center">
                            <p className="text-xl">
                                {isConnected
                                    ? 'Joining meeting...'
                                    : 'Connecting...'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gray-800 border-t border-gray-700 p-4 flex justify-center gap-4">
                <button
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    className={`px-4 py-2 rounded ${'bg-blue-600 hover:bg-blue-700'} text-white`}
                >
                    {cameraEnabled ? 'Camera ON' : 'Camera OFF'}
                </button>
                <button
                    onClick={() => setMicEnabled(!micEnabled)}
                    className={`px-4 py-2 rounded ${'bg-blue-600 hover:bg-blue-700'} text-white`}
                >
                    {micEnabled ? 'Mic ON' : 'Mic OFF'}
                </button>
                <button
                    onClick={handleLeave}
                    className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                >
                    Leave
                </button>
            </div>
        </div>
    )
}