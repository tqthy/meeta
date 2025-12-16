'use client'

import React, { useState } from 'react'
import { Video, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function JitsiMeetingCreatePage() {
    const router = useRouter()
    const [roomName, setRoomName] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    const handleJoinRoom = async () => {
        if (!roomName || isCreating) return
        
        setIsCreating(true)
        
        try {
            // Create or find meeting and get the database meetingId
            const response = await fetch('/api/meetings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName, title: roomName })
            })
            
            if (!response.ok) {
                throw new Error('Failed to create meeting')
            }
            
            const { meetingId } = await response.json()
            
            // Navigate with the database meetingId
            router.push(`/jitsi-meeting/${meetingId}`)
        } catch (error) {
            console.error('Error creating meeting:', error)
            alert('Failed to create meeting. Please try again.')
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div
            className={
                'min-h-screen flex items-center justify-center p-4 transition-colors duration-300 bg-gradient-to-br from-blue-50 to-indigo-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800'
            }
        >
            <div
                className={
                    'rounded-2xl shadow-2xl max-w-2xl w-full p-8 transition-colors duration-300 bg-white dark:bg-gray-800'
                }
            >
                <div className="text-center mb-8">
                    <div
                        className={
                            'inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-indigo-600 dark:bg-indigo-500'
                        }
                    >
                        <Video className="w-8 h-8 text-white" />
                    </div>
                    <h1
                        className={`text-3xl font-bold mb-2 dark:text-white text-gray-800`}
                    >
                        Create New Meeting
                    </h1>
                    <p className={'dark:text-gray-400 text-gray-600'}>
                        Set up your video conference room
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label
                            htmlFor="roomName"
                            className={`block text-sm font-medium mb-2 dark:text-gray-300 text-gray-700`}
                        >
                            Room Name
                        </label>
                        <input
                            type="text"
                            id="roomName"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && roomName) {
                                    handleJoinRoom()
                                }
                            }}
                            placeholder="Enter room name"
                            className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 bg-white border border-gray-300 text-gray-900`}
                            required
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleJoinRoom}
                        disabled={!roomName || isCreating}
                        className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition flex items-center justify-center gap-2 ${
                            !roomName || isCreating
                                ? 'dark:bg-gray-600 dark:text-gray-400 dark:cursor-not-allowed bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Enter Room'
                        )}
                    </button>

                    {!roomName && (
                        <p
                            className={
                                'text-sm text-center dark:text-gray-400 text-gray-500'
                            }
                        >
                            Please enter a room name to continue
                        </p>
                    )}
                    {roomName && (
                        <p
                            className={
                                'text-sm text-center dark:text-gray-400 text-gray-500'
                            }
                        >
                            Note: Media permissions are optional. You can join
                            without camera or microphone.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
