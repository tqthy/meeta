'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    Video,
    Home,
    Calendar,
    History,
    Settings,
    Plus,
    FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Meetings', href: '/dashboard/meetings', icon: Calendar },
    { name: 'History', href: '/dashboard/history', icon: History },
    { name: 'Transcripts', href: '/dashboard/transcripts', icon: FileText },
]

const secondaryNavigation = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
                <div className="p-1.5 bg-sidebar-primary rounded-lg">
                    <Video className="h-5 w-5 text-sidebar-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-sidebar-foreground">
                    Meeta
                </span>
            </div>

            {/* New Meeting Button */}
            <div className="p-4">
                <Button asChild className="w-full" size="lg">
                    <Link href="/meeting/create">
                        <Plus className="mr-2 h-4 w-4" />
                        New Meeting
                    </Link>
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3">
                {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            {/* Secondary Navigation */}
            <div className="px-3 pb-4">
                <Separator className="mb-4" />
                {secondaryNavigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
