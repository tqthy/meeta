'use client'

import { Menu } from 'lucide-react'
import { UserMenu } from './user-menu'

interface DashboardHeaderProps {
    onMenuClick: () => void
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
    return (
        <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-background">
            {/* Left side - Menu toggle and branding */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                    aria-label="Toggle menu"
                >
                    <Menu className="w-6 h-6 text-muted-foreground" />
                </button>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-1">
                <div className="ml-2">
                    <UserMenu />
                </div>
            </div>
        </header>
    )
}
