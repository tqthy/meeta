'use client'

import React, { useState, useEffect } from 'react'
import { Video, Mic, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NewMeetingPage() {
    const router = useRouter()
    const [roomName, setRoomName] = useState('')
    const [userName, setUserName] = useState('')
    const [cameraPermission, setCameraPermission] = useState<string | null>(
        null
    )
    const [micPermission, setMicPermission] = useState<string | null>(null)
    const [isRequesting, setIsRequesting] = useState(false)

    // Cleanup media streams khi component bị unmount (người dùng rời khỏi trang)
    useEffect(() => {
        return () => {
            console.log('[NewMeeting] Cleaning up media permissions on unmount')
            // Ngắt kết nối bất kỳ media stream nào đang hoạt động
            if (navigator.mediaDevices) {
                navigator.mediaDevices.enumerateDevices().then((devices) => {
                    devices.forEach((device) => {
                        if (
                            device.kind === 'videoinput' ||
                            device.kind === 'audioinput'
                        ) {
                            console.log(
                                '[NewMeeting] Device available:',
                                device.label
                            )
                        }
                    })
                })
            }
        }
    }, [])

    const requestCameraPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            })
            stream.getTracks().forEach((track) => track.stop())
            setCameraPermission('granted')
            return true
        } catch (error) {
            console.error('Camera permission denied:', error)
            setCameraPermission('denied')
            return false
        }
    }

    const requestMicPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            })
            stream.getTracks().forEach((track) => track.stop())
            setMicPermission('granted')
            return true
        } catch (error) {
            console.error('Microphone permission denied:', error)
            setMicPermission('denied')
            return false
        }
    }

    const handleRequestCameraOnly = async () => {
        setIsRequesting(true)
        try {
            await requestCameraPermission()
        } finally {
            setIsRequesting(false)
        }
    }

    const handleRequestMicOnly = async () => {
        setIsRequesting(true)
        try {
            await requestMicPermission()
        } finally {
            setIsRequesting(false)
        }
    }

    const handleRequestAllPermissions = async () => {
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
            // Try to request individually
            if (error instanceof Error && error.name === 'NotAllowedError') {
                // User denied, try individual requests
                await requestCameraPermission()
                await requestMicPermission()
            }
        } finally {
            setIsRequesting(false)
        }
    }

    const handleJoinRoom = () => {
        if (!roomName || !userName) {
            return
        }

        // Store user preferences in sessionStorage
        sessionStorage.setItem('userName', userName)
        sessionStorage.setItem(
            'cameraEnabled',
            String(cameraPermission === 'granted')
        )
        sessionStorage.setItem(
            'micEnabled',
            String(micPermission === 'granted')
        )
        sessionStorage.setItem(
            'cameraPermission',
            cameraPermission || 'not-requested'
        )
        sessionStorage.setItem(
            'micPermission',
            micPermission || 'not-requested'
        )

        console.log(
            '[NewMeeting] Joining room with permissions - Camera:',
            cameraPermission,
            'Mic:',
            micPermission
        )

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

                        {/* Request Permissions Buttons */}
                        <div className="flex gap-2">
                            {cameraPermission !== 'granted' && (
                                <button
                                    type="button"
                                    onClick={handleRequestCameraOnly}
                                    disabled={isRequesting}
                                    className={`flex-1 py-2 px-4 rounded-lg transition font-medium ${
                                        isRequesting
                                            ? 'dark:bg-indigo-700 dark:text-indigo-300 bg-indigo-200 text-indigo-600 cursor-wait'
                                            : 'dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                    }`}
                                >
                                    {isRequesting
                                        ? 'Requesting Camera...'
                                        : 'Request Camera'}
                                </button>
                            )}
                            {micPermission !== 'granted' && (
                                <button
                                    type="button"
                                    onClick={handleRequestMicOnly}
                                    disabled={isRequesting}
                                    className={`flex-1 py-2 px-4 rounded-lg transition font-medium ${
                                        isRequesting
                                            ? 'dark:bg-indigo-700 dark:text-indigo-300 bg-indigo-200 text-indigo-600 cursor-wait'
                                            : 'dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                    }`}
                                >
                                    {isRequesting
                                        ? 'Requesting Mic...'
                                        : 'Request Microphone'}
                                </button>
                            )}
                        </div>

                        {/* Request Both Button */}
                        {(cameraPermission !== 'granted' ||
                            micPermission !== 'granted') && (
                            <button
                                type="button"
                                onClick={handleRequestAllPermissions}
                                disabled={isRequesting}
                                className={`w-full py-2 px-4 rounded-lg transition font-medium ${
                                    isRequesting
                                        ? 'dark:bg-indigo-700 dark:text-indigo-300 bg-indigo-200 text-indigo-600 cursor-wait'
                                        : 'dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                }`}
                            >
                                {isRequesting
                                    ? 'Requesting...'
                                    : 'Request All Permissions'}
                            </button>
                        )}
                    </div>

                    {/* Join Button */}
                    <button
                        type="button"
                        onClick={handleJoinRoom}
                        disabled={!roomName || !userName}
                        className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition ${
                            !roomName || !userName
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
                    {roomName && userName && (
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
