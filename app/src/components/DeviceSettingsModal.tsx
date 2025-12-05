/**
 * DeviceSettingsModal - UI component for device selection
 */

'use client'

import { useState, useEffect } from 'react'

interface DeviceSettingsModalProps {
    mediaManager?: unknown
    isOpen: boolean
    onClose: () => void
}

export function DeviceSettingsModal({
    isOpen,
    onClose,
}: DeviceSettingsModalProps) {
    // Local state for devices
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
    const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([])
    const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([])
    const [error, setError] = useState<string | null>(null)
    const [selectedCameraId, setSelectedCameraId] = useState<string>('')
    const [selectedMicId, setSelectedMicId] = useState<string>('')
    const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('')

    // Load available devices
    useEffect(() => {
        if (!isOpen) return

        const loadDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices()
                setCameras(devices.filter((d) => d.kind === 'videoinput'))
                setMicrophones(devices.filter((d) => d.kind === 'audioinput'))
                setSpeakers(devices.filter((d) => d.kind === 'audiooutput'))
            } catch (err) {
                console.error('Failed to load devices:', err)
                setError('Failed to load devices')
            }
        }

        loadDevices()

        // Listen for device changes
        const handleDeviceChange = () => {
            loadDevices()
        }

        navigator.mediaDevices.addEventListener(
            'devicechange',
            handleDeviceChange
        )

        return () => {
            navigator.mediaDevices.removeEventListener(
                'devicechange',
                handleDeviceChange
            )
        }
    }, [isOpen])

    // Handle camera selection
    const handleCameraSelect = (deviceId: string) => {
        setSelectedCameraId(deviceId)
        setError(null)
    }

    // Handle microphone selection
    const handleMicSelect = (deviceId: string) => {
        setSelectedMicId(deviceId)
        setError(null)
    }

    // Handle speaker selection
    const handleSpeakerSelect = (deviceId: string) => {
        setSelectedSpeakerId(deviceId)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-semibold mb-4">Device Settings</h2>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {/* Camera Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                        Camera
                    </label>
                    <select
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={selectedCameraId}
                        onChange={(e) => handleCameraSelect(e.target.value)}
                    >
                        <option value="">Select Camera</option>
                        {cameras.map((camera) => (
                            <option
                                key={camera.deviceId}
                                value={camera.deviceId}
                            >
                                {camera.label ||
                                    `Camera ${camera.deviceId.slice(0, 8)}`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Microphone Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                        Microphone
                    </label>
                    <select
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={selectedMicId}
                        onChange={(e) => handleMicSelect(e.target.value)}
                    >
                        <option value="">Select Microphone</option>
                        {microphones.map((mic) => (
                            <option key={mic.deviceId} value={mic.deviceId}>
                                {mic.label ||
                                    `Microphone ${mic.deviceId.slice(0, 8)}`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Speaker Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                        Speaker
                    </label>
                    <select
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={selectedSpeakerId}
                        onChange={(e) => handleSpeakerSelect(e.target.value)}
                    >
                        <option value="">Select Speaker</option>
                        {speakers.map((speaker) => (
                            <option
                                key={speaker.deviceId}
                                value={speaker.deviceId}
                            >
                                {speaker.label ||
                                    `Speaker ${speaker.deviceId.slice(0, 8)}`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Device Info */}
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 mb-4 text-sm">
                    <p className="mb-1">
                        <strong>Cameras:</strong> {cameras.length}
                    </p>
                    <p className="mb-1">
                        <strong>Microphones:</strong> {microphones.length}
                    </p>
                    <p>
                        <strong>Speakers:</strong> {speakers.length}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

/**
 * Usage Example:
 *
 * ```tsx
 * function MyComponent() {
 *     const [showSettings, setShowSettings] = useState(false)
 *     const dispatch = useAppDispatch()
 *     const mediaManager = useMemo(() => new MediaManager(dispatch), [dispatch])
 *
 *     return (
 *         <>
 *             <button onClick={() => setShowSettings(true)}>
 *                 Device Settings
 *             </button>
 *
 *             <DeviceSettingsModal
 *                 mediaManager={mediaManager}
 *                 isOpen={showSettings}
 *                 onClose={() => setShowSettings(false)}
 *             />
 *         </>
 *     )
 * }
 * ```
 */
