import React from 'react'
import { X, Mic, Video, Monitor, ChevronRight } from 'lucide-react'

interface SettingsMenuProps {
    isOpen: boolean
    onClose: () => void
}

export function SettingsMenu({ isOpen, onClose }: SettingsMenuProps) {
    if (!isOpen) return null

    const settingsCategories = [
        {
            id: 'audio',
            name: 'Audio',
            icon: Mic,
            options: ['Microphone', 'Speakers', 'Audio processing'],
        },
        {
            id: 'video',
            name: 'Video',
            icon: Video,
            options: ['Camera', 'Video quality', 'Virtual background'],
        },
        {
            id: 'general',
            name: 'General',
            icon: Monitor,
            options: ['Language', 'Notifications', 'Keyboard shortcuts'],
        },
    ]

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => {
                    console.log('Settings menu closed')
                    onClose()
                }}
            />

            {/* Settings modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-gray-900 text-xl">Settings</h2>
                        <button
                            onClick={() => {
                                console.log('Settings menu closed')
                                onClose()
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="Close settings"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>

                    {/* Settings content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            {settingsCategories.map((category) => {
                                const Icon = category.icon
                                return (
                                    <div
                                        key={category.id}
                                        className="border border-gray-200 rounded-lg overflow-hidden"
                                    >
                                        <div className="bg-gray-50 p-4 flex items-center gap-3">
                                            <Icon className="w-5 h-5 text-gray-700" />
                                            <h3 className="text-gray-900">
                                                {category.name}
                                            </h3>
                                        </div>
                                        <div className="divide-y divide-gray-200">
                                            {category.options.map(
                                                (option, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() =>
                                                            console.log(
                                                                `Settings option clicked: ${category.name} - ${option}`
                                                            )
                                                        }
                                                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <span className="text-gray-700">
                                                            {option}
                                                        </span>
                                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Additional settings */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-gray-900 mb-3">
                                    Quick Settings
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between">
                                        <span className="text-gray-700">
                                            Mirror my video
                                        </span>
                                        <input
                                            type="checkbox"
                                            onChange={(e) =>
                                                console.log(
                                                    'Mirror video:',
                                                    e.target.checked
                                                )
                                            }
                                            className="w-5 h-5 text-blue-600 rounded"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between">
                                        <span className="text-gray-700">
                                            Show captions
                                        </span>
                                        <input
                                            type="checkbox"
                                            onChange={(e) =>
                                                console.log(
                                                    'Show captions:',
                                                    e.target.checked
                                                )
                                            }
                                            className="w-5 h-5 text-blue-600 rounded"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between">
                                        <span className="text-gray-700">
                                            HD video
                                        </span>
                                        <input
                                            type="checkbox"
                                            defaultChecked
                                            onChange={(e) =>
                                                console.log(
                                                    'HD video:',
                                                    e.target.checked
                                                )
                                            }
                                            className="w-5 h-5 text-blue-600 rounded"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
