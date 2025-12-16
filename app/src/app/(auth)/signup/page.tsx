import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { EmailSignupForm } from '@/components/auth/email-signup-form'
import { Video } from 'lucide-react'
import Link from 'next/link'

export default async function SignupPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (session && session?.user) {
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary rounded-lg">
                                <Video className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <span className="text-2xl font-bold">Meeta</span>
                        </div>
                    </div>
                    <CardTitle className="text-2xl">
                        Create an account
                    </CardTitle>
                    <CardDescription>
                        Enter your details to get started
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <EmailSignupForm />
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>
                    <OAuthButtons />
                    <p className="text-center text-sm text-muted-foreground">
                        By continuing, you agree to our{' '}
                        <Link
                            href="/terms"
                            className="underline hover:text-primary"
                        >
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link
                            href="/privacy"
                            className="underline hover:text-primary"
                        >
                            Privacy Policy
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
