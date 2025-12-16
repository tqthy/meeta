'use client'

import { useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
    ArrowLeft, 
    Mail, 
    User, 
    Calendar, 
    CheckCircle2,
    XCircle,
    Loader2
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function ProfilePage() {
    const { data: session, isPending } = useSession()
    const router = useRouter()
    const user = session?.user

    useEffect(() => {
        if (!isPending && !user) {
            router.push('/login')
        }
    }, [isPending, user, router])

    if (isPending) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!user) {
        return null
    }

    const initials = user.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'

    return (
        <main className="flex-1 overflow-auto bg-background">
            <div className="max-w-2xl mx-auto px-6 py-12">
                {/* Back Button */}
                <Button variant="ghost" asChild className="mb-6">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>

                {/* Profile Header */}
                <div className="text-center mb-8">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                        <AvatarImage src={user.image || ''} alt={user.name || ''} />
                        <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                    </Avatar>
                    <h1 className="text-3xl font-bold text-foreground mb-1">
                        {user.name || 'User'}
                    </h1>
                    <p className="text-muted-foreground">{user.email}</p>
                </div>

                {/* Profile Information */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                            <CardDescription>Your personal account details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Name */}
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                <User className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground">Full Name</p>
                                    <p className="font-medium">{user.name || 'Not set'}</p>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                <Mail className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground">Email Address</p>
                                    <p className="font-medium">{user.email}</p>
                                </div>
                            </div>

                            {/* Email Verified */}
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                {user.emailVerified ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-amber-600" />
                                )}
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground">Email Status</p>
                                    <p className="font-medium">
                                        {user.emailVerified ? 'Verified' : 'Not Verified'}
                                    </p>
                                </div>
                            </div>

                            {/* Created At */}
                            {user.createdAt && (
                                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Member Since</p>
                                        <p className="font-medium">
                                            {format(new Date(user.createdAt), 'MMMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Account Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Actions</CardTitle>
                            <CardDescription>Manage your account</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button variant="outline" className="w-full justify-start" disabled>
                                <User className="mr-2 h-4 w-4" />
                                Edit Profile (Coming Soon)
                            </Button>
                            <Button variant="outline" className="w-full justify-start" disabled>
                                <Mail className="mr-2 h-4 w-4" />
                                Change Email (Coming Soon)
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    )
}
