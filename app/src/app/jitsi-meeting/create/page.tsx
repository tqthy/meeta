'use client'

import React, { useState } from 'react'
import { Video } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function JitsiMeetingCreatePage() {
    const router = useRouter()
    const [roomName, setRoomName] = useState('')

    const handleJoinRoom = () => {
        if (!roomName) return
        router.push(`/jitsi-meeting/${encodeURIComponent(roomName)}`)
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
                        disabled={!roomName}
                        className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition ${
                            !roomName
                                ? 'dark:bg-gray-600 dark:text-gray-400 dark:cursor-not-allowed bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    >
                        Enter Room
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
