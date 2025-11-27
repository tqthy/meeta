import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Video, Shield, FileText, Sparkles, ArrowRight } from 'lucide-react'

export default async function HomePage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    })
    if (session?.user) {
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Header */}
            <header className="container mx-auto px-6 py-6">
                <nav className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary rounded-lg">
                            <Video className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <span className="text-2xl font-bold">Meeta</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" asChild>
                            <Link href="/login">Sign in</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/login">Get Started</Link>
                        </Button>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <main className="container mx-auto px-6 py-24 text-center">
                <div className="max-w-4xl mx-auto space-y-8">
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-blue-800 to-blue-600 dark:from-white dark:via-blue-200 dark:to-blue-400 bg-clip-text text-transparent pb-1">
                        Video Meetings with AI-Powered Insights
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Self-hosted video conferencing with real-time
                        transcription and intelligent meeting summaries. Own
                        your data, understand your conversations.
                    </p>
                    <div className="flex items-center justify-center gap-4 pt-4">
                        <Button size="lg" asChild>
                            <Link href="/login">
                                Start Free{' '}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link
                                href="https://github.com/tqthy/meeta"
                                target="_blank"
                            >
                                View on GitHub
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
                    <div className="p-6 rounded-xl bg-card border shadow-sm">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
                            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                            Self-Hosted & Secure
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            Deploy on your own infrastructure. Your meetings,
                            your data, your control.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl bg-card border shadow-sm">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
                            <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                            Real-Time Transcription
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            Automatic speech-to-text with speaker
                            identification. Never miss a word.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl bg-card border shadow-sm">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
                            <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                            AI Meeting Summaries
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            Get action items, key decisions, and comprehensive
                            summaries automatically.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="container mx-auto px-6 py-8 mt-24 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <p>© 2025 Meeta. Open source under MIT License.</p>
                    <div className="flex items-center gap-4">
                        <Link
                            href="https://github.com/tqthy/meeta"
                            className="hover:text-foreground"
                        >
                            GitHub
                        </Link>
                        <Link href="/privacy" className="hover:text-foreground">
                            Privacy
                        </Link>
                        <Link href="/terms" className="hover:text-foreground">
                            Terms
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
