'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'

interface DashboardShellProps {
    children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar */}
            <Sidebar isCollapsed={isSidebarCollapsed} />

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <DashboardHeader 
                    onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                />
                <main className="flex-1 overflow-y-auto bg-muted/30">
                    {children}
                </main>
            </div>
        </div>
    )
}
