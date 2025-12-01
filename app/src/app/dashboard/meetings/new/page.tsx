'use client'

import React, { useState } from 'react'
import { Video, Mic, MicOff, VideoOff, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NewMeetingPage() {
    const router = useRouter()
    const [roomName, setRoomName] = useState('')
    const [userName, setUserName] = useState('')
    const [cameraPermission, setCameraPermission] = useState<string | null>(
        null
    )
    const [micPermission, setMicPermission] = useState<string | null>(null)
    const [cameraEnabled, setCameraEnabled] = useState(true)
    const [micEnabled, setMicEnabled] = useState(true)
    const [isRequesting, setIsRequesting] = useState(false)

    const handleRequestPermissions = async () => {
        setIsRequesting(true)
        try {
            // Request camera and microphone permissions using browser API
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            })

            // If we get here, permissions were granted
            setCameraPermission('granted')
            setMicPermission('granted')

            // Stop the tracks as we just needed to check permissions
            stream.getTracks().forEach((track) => track.stop())
        } catch (error) {
            console.error('Permission denied:', error)
            // Check which permissions were denied
            if (error instanceof Error) {
                if (error.name === 'NotAllowedError') {
                    setCameraPermission('denied')
                    setMicPermission('denied')
                } else {
                    // Other errors (e.g., no devices found)
                    setCameraPermission('denied')
                    setMicPermission('denied')
                }
            }
        } finally {
            setIsRequesting(false)
        }
    }

    const handleJoinRoom = () => {
        if (!roomName || !userName || !cameraPermission || !micPermission) {
            return
        }

        // Store user preferences in sessionStorage
        sessionStorage.setItem('userName', userName)
        sessionStorage.setItem('cameraEnabled', String(cameraEnabled))
        sessionStorage.setItem('micEnabled', String(micEnabled))

        // Navigate to the room
        router.push(`/room/${encodeURIComponent(roomName)}`)
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
                    {/* Room Name Input */}
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
                                if (
                                    e.key === 'Enter' &&
                                    roomName &&
                                    userName &&
                                    cameraPermission &&
                                    micPermission
                                ) {
                                    handleJoinRoom()
                                }
                            }}
                            placeholder="Enter room name"
                            className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 bg-white border border-gray-300 text-gray-900`}
                            required
                        />
                    </div>

                    {/* User Name Input */}
                    <div>
                        <label
                            htmlFor="userName"
                            className={`block text-sm font-medium mb-2 dark:text-gray-300 text-gray-700`}
                        >
                            Your Name
                        </label>
                        <input
                            type="text"
                            id="userName"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Enter your name"
                            className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 bg-white border border-gray-300 text-gray-900`}
                            required
                        />
                    </div>

                    {/* Permissions Section */}
                    <div
                        className={`rounded-lg p-6 space-y-4 dark:bg-gray-700 bg-gray-50`}
                    >
                        <h3
                            className={
                                'text-lg font-semibold mb-4 dark:text-white text-gray-800'
                            }
                        >
                            Media Permissions
                        </h3>

                        {/* Permission Status */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Video
                                        className={`w-5 h-5 dark:text-gray-300 text-gray-600`}
                                    />
                                    <span
                                        className={`text-sm font-medium dark:text-gray-200 text-gray-700`}
                                    >
                                        Camera
                                    </span>
                                </div>
                                {cameraPermission === 'granted' ? (
                                    <span className="flex items-center text-green-500 text-sm">
                                        <Check className="w-4 h-4 mr-1" />
                                        Granted
                                    </span>
                                ) : cameraPermission === 'denied' ? (
                                    <span className="flex items-center text-red-500 text-sm">
                                        <X className="w-4 h-4 mr-1" />
                                        Denied
                                    </span>
                                ) : (
                                    <span
                                        className={`text-sm dark:text-gray-400 text-gray-500`}
                                    >
                                        Not requested
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Mic
                                        className={`w-5 h-5 dark:text-gray-300 text-gray-600`}
                                    />
                                    <span
                                        className={`text-sm font-medium dark:text-gray-200 text-gray-700`}
                                    >
                                        Microphone
                                    </span>
                                </div>
                                {micPermission === 'granted' ? (
                                    <span className="flex items-center text-green-500 text-sm">
                                        <Check className="w-4 h-4 mr-1" />
                                        Granted
                                    </span>
                                ) : micPermission === 'denied' ? (
                                    <span className="flex items-center text-red-500 text-sm">
                                        <X className="w-4 h-4 mr-1" />
                                        Denied
                                    </span>
                                ) : (
                                    <span
                                        className={`text-sm dark:text-gray-400 text-gray-500`}
                                    >
                                        Not requested
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Request Permissions Button */}
                        {(!cameraPermission || !micPermission) && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleRequestPermissions}
                                    disabled={isRequesting}
                                    className={`w-full py-2 px-4 rounded-lg transition font-medium ${
                                        isRequesting
                                            ? 'dark:bg-indigo-700 dark:text-indigo-300 bg-indigo-200 text-indigo-600 cursor-wait'
                                            : 'dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                    }`}
                                >
                                    {isRequesting
                                        ? 'Requesting...'
                                        : 'Request Permissions'}
                                </button>
                                {cameraPermission === 'denied' &&
                                    micPermission === 'denied' && (
                                        <p className="text-sm text-red-500 text-center">
                                            Permissions denied. Please enable
                                            camera and microphone in your
                                            browser settings.
                                        </p>
                                    )}
                            </>
                        )}

                        {/* Media Toggle Buttons */}
                        {cameraPermission === 'granted' &&
                            micPermission === 'granted' && (
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCameraEnabled(!cameraEnabled)
                                        }
                                        className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition ${
                                            cameraEnabled
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                : 'dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        {cameraEnabled ? (
                                            <Video className="w-4 h-4" />
                                        ) : (
                                            <VideoOff className="w-4 h-4" />
                                        )}
                                        <span className="text-sm font-medium">
                                            Camera
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMicEnabled(!micEnabled)
                                        }
                                        className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition ${
                                            micEnabled
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                : 'dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        {micEnabled ? (
                                            <Mic className="w-4 h-4" />
                                        ) : (
                                            <MicOff className="w-4 h-4" />
                                        )}
                                        <span className="text-sm font-medium">
                                            Mic
                                        </span>
                                    </button>
                                </div>
                            )}
                    </div>

                    {/* Join Button */}
                    <button
                        type="button"
                        onClick={handleJoinRoom}
                        disabled={
                            !roomName ||
                            !userName ||
                            !cameraPermission ||
                            !micPermission ||
                            cameraPermission === 'denied' ||
                            micPermission === 'denied'
                        }
                        className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition ${
                            !roomName ||
                            !userName ||
                            !cameraPermission ||
                            !micPermission ||
                            cameraPermission === 'denied' ||
                            micPermission === 'denied'
                                ? 'dark:bg-gray-600 dark:text-gray-400 dark:cursor-not-allowed bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    >
                        Enter Room
                    </button>

                    {(!roomName || !userName) && (
                        <p
                            className={
                                'text-sm text-center dark:text-gray-400 text-gray-500'
                            }
                        >
                            Please enter room name and your name to continue
                        </p>
                    )}
                    {roomName &&
                        userName &&
                        (!cameraPermission || !micPermission) && (
                            <p
                                className={
                                    'text-sm text-center dark:text-gray-400 text-gray-500'
                                }
                            >
                                Please grant camera and microphone permissions
                                to continue
                            </p>
                        )}
                    {roomName &&
                        userName &&
                        (cameraPermission === 'denied' ||
                            micPermission === 'denied') && (
                            <p
                                className={
                                    'text-sm text-center text-red-500 dark:text-red-400'
                                }
                            >
                                Camera or microphone access denied. Please
                                enable in browser settings.
                            </p>
                        )}
                </div>
            </div>
        </div>
    )
}
