import React from 'react'
import { Grid3x3, LayoutGrid, User, Users } from 'lucide-react'

interface GridLayoutSelectorProps {
    isOpen: boolean
    onClose: () => void
    currentLayout: 'auto' | 'grid' | 'sidebar' | 'spotlight'
    onLayoutChange: (layout: 'auto' | 'grid' | 'sidebar' | 'spotlight') => void
}

export function GridLayoutSelector({
    isOpen,
    onClose,
    currentLayout,
    onLayoutChange,
}: GridLayoutSelectorProps) {
    if (!isOpen) return null

    const layouts = [
        {
            id: 'auto' as const,
            name: 'Auto',
            icon: LayoutGrid,
            description: 'Automatically adjust layout',
        },
        {
            id: 'grid' as const,
            name: 'Tiled',
            icon: Grid3x3,
            description: 'Everyone in equal tiles',
        },
        {
            id: 'sidebar' as const,
            name: 'Sidebar',
            icon: Users,
            description: 'Speaker with sidebar',
        },
        {
            id: 'spotlight' as const,
            name: 'Spotlight',
            icon: User,
            description: 'Focus on speaker',
        },
    ]

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

            {/* Popup menu */}
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl z-50 w-80 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="text-gray-900">Change layout</h3>
                </div>

                <div className="p-2">
                    {layouts.map((layout) => {
                        const Icon = layout.icon
                        const isSelected = currentLayout === layout.id

                        return (
                            <button
                                key={layout.id}
                                onClick={() => {
                                    console.log(
                                        `Layout changed to: ${layout.id}`
                                    )
                                    onLayoutChange(layout.id)
                                    onClose()
                                }}
                                className={`w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors ${
                                    isSelected ? 'bg-blue-50' : ''
                                }`}
                            >
                                <div
                                    className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                                >
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div
                                        className={`${isSelected ? 'text-blue-600' : 'text-gray-900'}`}
                                    >
                                        {layout.name}
                                    </div>
                                    <div className="text-gray-600 text-sm">
                                        {layout.description}
                                    </div>
                                </div>
                                {isSelected && (
                                    <div className="text-blue-600">✓</div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </>
    )
}
