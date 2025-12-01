# Sửa lỗi Device Permissions (Chập chờn truy cập Mic/Camera)

## 🔧 Vấn đề hiện tại

1. ❌ Request permissions trước khi user interaction (Safari/iOS chặn)
2. ❌ Không handle permission denied properly
3. ❌ Race condition giữa permission request và track creation
4. ❌ Mỗi lần reload lại request permission

---

## ✅ Giải pháp

### Bước 1: Fix Permission Flow trong `new/page.tsx`

**Vấn đề hiện tại:**

```typescript
// ❌ SAI - Dùng navigator.mediaDevices.getUserMedia trực tiếp
const handleRequestPermissions = async () => {
    setIsRequesting(true)
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        })
        setCameraPermission('granted')
        setMicPermission('granted')
        stream.getTracks().forEach((track) => track.stop())
    } catch (error) {
        // Handle error...
    }
}
```

**Giải pháp đúng:**

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Video, Mic, MicOff, VideoOff, Check, X, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

// ✅ Add permission state type
type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking' | null

export default function NewMeetingPage() {
    const router = useRouter()
    const [roomName, setRoomName] = useState('')
    const [userName, setUserName] = useState('')
    const [cameraPermission, setCameraPermission] = useState<PermissionState>(null)
    const [micPermission, setMicPermission] = useState<PermissionState>(null)
    const [cameraEnabled, setCameraEnabled] = useState(true)
    const [micEnabled, setMicEnabled] = useState(true)
    const [isRequesting, setIsRequesting] = useState(false)
    const [permissionError, setPermissionError] = useState<string | null>(null)

    // ✅ Check existing permissions on mount (không request nếu chưa được granted)
    useEffect(() => {
        const checkPermissions = async () => {
            if (!navigator.permissions) {
                // Permissions API not supported (Safari)
                setCameraPermission('prompt')
                setMicPermission('prompt')
                return
            }

            try {
                // Check camera permission
                const cameraStatus = await navigator.permissions.query({
                    name: 'camera' as PermissionName,
                })
                setCameraPermission(cameraStatus.state as PermissionState)

                // Listen for permission changes
                cameraStatus.addEventListener('change', () => {
                    setCameraPermission(cameraStatus.state as PermissionState)
                })

                // Check microphone permission
                const micStatus = await navigator.permissions.query({
                    name: 'microphone' as PermissionName,
                })
                setMicPermission(micStatus.state as PermissionState)

                micStatus.addEventListener('change', () => {
                    setMicPermission(micStatus.state as PermissionState)
                })
            } catch (error) {
                // Permissions API not fully supported
                console.log('[Permissions] API not fully supported:', error)
                setCameraPermission('prompt')
                setMicPermission('prompt')
            }
        }

        checkPermissions()
    }, [])

    // ✅ ĐÚNG - Request permissions với proper error handling
    const handleRequestPermissions = async () => {
        setIsRequesting(true)
        setPermissionError(null)
        setCameraPermission('checking')
        setMicPermission('checking')

        try {
            // Request both permissions
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            })

            // Success - permissions granted
            setCameraPermission('granted')
            setMicPermission('granted')
            console.log('[Permissions] Granted successfully')

            // Stop the tracks immediately - we just needed to check permissions
            stream.getTracks().forEach((track) => {
                track.stop()
                console.log(`[Permissions] Stopped ${track.kind} track`)
            })
        } catch (error) {
            console.error('[Permissions] Error requesting permissions:', error)

            if (error instanceof Error) {
                // ✅ Handle specific error types
                if (error.name === 'NotAllowedError') {
                    setCameraPermission('denied')
                    setMicPermission('denied')
                    setPermissionError(
                        'Camera and microphone access denied. Please allow access in your browser settings.'
                    )
                } else if (error.name === 'NotFoundError') {
                    setCameraPermission('denied')
                    setMicPermission('denied')
                    setPermissionError(
                        'No camera or microphone found. Please connect a device and try again.'
                    )
                } else if (error.name === 'NotReadableError') {
                    setCameraPermission('denied')
                    setMicPermission('denied')
                    setPermissionError(
                        'Camera or microphone is already in use by another application.'
                    )
                } else if (error.name === 'OverconstrainedError') {
                    // Try again with basic constraints
                    try {
                        const basicStream = await navigator.mediaDevices.getUserMedia({
                            video: true,
                            audio: true,
                        })
                        setCameraPermission('granted')
                        setMicPermission('granted')
                        basicStream.getTracks().forEach((track) => track.stop())
                    } catch (retryError) {
                        setCameraPermission('denied')
                        setMicPermission('denied')
                        setPermissionError(
                            'Unable to access camera or microphone with the requested settings.'
                        )
                    }
                } else {
                    setCameraPermission('denied')
                    setMicPermission('denied')
                    setPermissionError(
                        `Permission error: ${error.message}`
                    )
                }
            } else {
                setCameraPermission('denied')
                setMicPermission('denied')
                setPermissionError('An unknown error occurred while requesting permissions.')
            }
        } finally {
            setIsRequesting(false)
        }
    }

    // ✅ Validate before joining
    const canJoinRoom = () => {
        return (
            roomName.trim() !== '' &&
            userName.trim() !== '' &&
            cameraPermission === 'granted' &&
            micPermission === 'granted'
        )
    }

    const handleJoinRoom = () => {
        if (!canJoinRoom()) {
            return
        }

        // Store user preferences in sessionStorage
        sessionStorage.setItem('userName', userName)
        sessionStorage.setItem('cameraEnabled', String(cameraEnabled))
        sessionStorage.setItem('micEnabled', String(micEnabled))

        // Navigate to the room
        router.push(`/room/${encodeURIComponent(roomName)}`)
    }

    // ✅ Add permission status indicator component
    const PermissionStatus = ({
        permission,
        deviceName,
    }: {
        permission: PermissionState
        deviceName: string
    }) => {
        if (permission === 'granted') {
            return (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check className="w-5 h-5" />
                    <span className="text-sm">{deviceName} access granted</span>
                </div>
            )
        }

        if (permission === 'denied') {
            return (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <X className="w-5 h-5" />
                    <span className="text-sm">{deviceName} access denied</span>
                </div>
            )
        }

        if (permission === 'checking') {
            return (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Checking {deviceName}...</span>
                </div>
            )
        }

        return (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{deviceName} permission required</span>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300 bg-gradient-to-br from-blue-50 to-indigo-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800">
            <div className="rounded-2xl shadow-2xl max-w-2xl w-full p-8 transition-colors duration-300 bg-white dark:bg-gray-800">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-indigo-600 dark:bg-indigo-500">
                        <Video className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 dark:text-white text-gray-800">
                        Create New Meeting
                    </h1>
                    <p className="dark:text-gray-400 text-gray-600">
                        Set up your video conference room
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Room Name Input */}
                    <div>
                        <label
                            htmlFor="roomName"
                            className="block text-sm font-medium mb-2 dark:text-gray-300 text-gray-700"
                        >
                            Room Name
                        </label>
                        <input
                            id="roomName"
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="Enter room name"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* User Name Input */}
                    <div>
                        <label
                            htmlFor="userName"
                            className="block text-sm font-medium mb-2 dark:text-gray-300 text-gray-700"
                        >
                            Your Name
                        </label>
                        <input
                            id="userName"
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* ✅ Permission Request Section */}
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-800">
                            Device Permissions
                        </h3>

                        <div className="space-y-3 mb-4">
                            <PermissionStatus permission={cameraPermission} deviceName="Camera" />
                            <PermissionStatus permission={micPermission} deviceName="Microphone" />
                        </div>

                        {/* ✅ Error message */}
                        {permissionError && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    {permissionError}
                                </p>
                            </div>
                        )}

                        {/* ✅ Request button - only show if not granted */}
                        {(cameraPermission !== 'granted' || micPermission !== 'granted') && (
                            <button
                                onClick={handleRequestPermissions}
                                disabled={isRequesting}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isRequesting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Requesting Permissions...
                                    </>
                                ) : (
                                    <>
                                        <Video className="w-5 h-5" />
                                        Grant Camera & Microphone Access
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* ✅ Device toggles - only show if permissions granted */}
                    {cameraPermission === 'granted' && micPermission === 'granted' && (
                        <div className="flex gap-4">
                            <button
                                onClick={() => setCameraEnabled(!cameraEnabled)}
                                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                    cameraEnabled
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
                                }`}
                            >
                                {cameraEnabled ? (
                                    <>
                                        <Video className="w-5 h-5" />
                                        Camera On
                                    </>
                                ) : (
                                    <>
                                        <VideoOff className="w-5 h-5" />
                                        Camera Off
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => setMicEnabled(!micEnabled)}
                                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                    micEnabled
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
                                }`}
                            >
                                {micEnabled ? (
                                    <>
                                        <Mic className="w-5 h-5" />
                                        Mic On
                                    </>
                                ) : (
                                    <>
                                        <MicOff className="w-5 h-5" />
                                        Mic Off
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* ✅ Join button - only enabled when everything is ready */}
                    <button
                        onClick={handleJoinRoom}
                        disabled={!canJoinRoom()}
                        className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg font-semibold text-lg transition-colors disabled:cursor-not-allowed"
                    >
                        {canJoinRoom()
                            ? 'Join Meeting'
                            : 'Complete all steps to join'}
                    </button>
                </div>
            </div>
        </div>
    )
}
```

---

### Bước 2: Fix Track Creation trong `useJitsiConnection.tsx`

**Đảm bảo tracks chỉ được tạo SAU KHI đã có permissions:**

```typescript
// Create local tracks
useEffect(() => {
    if (!JitsiMeetJS || !roomName || typeof window === 'undefined') {
        return
    }

    // ✅ Skip nếu đang trong quá trình khác
    if (localTracks.length > 0) {
        return
    }

    const createTracks = async () => {
        try {
            console.log('[Jitsi] Creating local tracks...')

            // ✅ Tạo tracks với proper error handling
            const tracks = await JitsiMeetJS.createLocalTracks({
                devices: ['audio', 'video'],
                constraints: {
                    video: {
                        width: { ideal: 1280, max: 1920 },
                        height: { ideal: 720, max: 1080 },
                        frameRate: { ideal: 30 },
                        facingMode: 'user',
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                },
            })

            if (tracks.length === 0) {
                throw new Error('No tracks created')
            }

            setLocalTracks(tracks)
            console.log('[Jitsi] Local tracks created:', tracks.length)

            // Set initial mute states
            tracks.forEach((track: any) => {
                if (track.getType() === 'video') {
                    if (!cameraEnabled) {
                        track.mute()
                    }
                } else if (track.getType() === 'audio') {
                    if (!micEnabled) {
                        track.mute()
                    }
                }
            })
        } catch (error) {
            console.error('[Jitsi] Failed to create local tracks:', error)

            // ✅ Try to create with fallback constraints
            try {
                console.log('[Jitsi] Trying fallback constraints...')
                const fallbackTracks = await JitsiMeetJS.createLocalTracks({
                    devices: ['audio', 'video'],
                })
                setLocalTracks(fallbackTracks)
            } catch (fallbackError) {
                console.error('[Jitsi] Fallback also failed:', fallbackError)
            }
        }
    }

    createTracks()

    return () => {
        // Cleanup local tracks
        localTracks.forEach((track) => {
            try {
                track.dispose()
            } catch (error) {
                console.error('[Jitsi] Failed to dispose track:', error)
            }
        })
    }
    // ✅ Remove cameraEnabled, micEnabled from dependencies to prevent recreation
}, [roomName, JitsiMeetJS])
```

---

## 🐛 Common Issues

### Issue 1: "NotAllowedError" on Safari/iOS

**Nguyên nhân:** Safari yêu cầu user gesture

**Giải pháp:** Đã implement - button click là user gesture

### Issue 2: Permission request popup không xuất hiện

**Nguyên nhân:** Browser đã deny permissions

**Giải pháp:** Hướng dẫn user vào settings:

- Chrome: `chrome://settings/content/camera`
- Firefox: `about:preferences#privacy`
- Safari: Settings > Safari > Camera/Microphone

### Issue 3: Tracks tạo lại liên tục

**Nguyên nhân:** Dependencies trong useEffect không đúng

**Giải pháp:** Remove `cameraEnabled`, `micEnabled` khỏi dependencies

---

## 📚 Next Steps

1. ✅ Đọc `6-best-practices.md` để optimize performance
2. ✅ Test trên nhiều browsers (Chrome, Firefox, Safari)
3. ✅ Test trên mobile devices
