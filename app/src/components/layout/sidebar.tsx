'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    Video,
    Home,
    History,
    Settings,
    Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface SidebarProps {
    isCollapsed?: boolean
}

const navigation = [
    { name: 'Meetings', href: '/dashboard', icon: Home },
    { name: 'History', href: '/dashboard/history', icon: History },
]

export function Sidebar({ isCollapsed = false }: SidebarProps) {
    const pathname = usePathname()

    return (
        <aside
            className={cn(
                'bg-background border-r border-border transition-all duration-300 flex flex-col',
                isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-64 opacity-100'
            )}
        >
            {/* Logo Header */}
            <div className="flex h-16 items-center gap-2 px-4 border-b border-border">
                <div className="p-1.5 bg-primary rounded-lg">
                    <Video className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground whitespace-nowrap">
                    Meeta
                </span>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-2">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || 
                        (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mt-1',
                                isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="whitespace-nowrap">{item.name}</span>
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}
