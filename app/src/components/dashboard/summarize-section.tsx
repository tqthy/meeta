'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    FileText,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ListChecks,
    Target,
    ArrowRight,
    RefreshCw,
} from 'lucide-react'

interface SummarizeSectionProps {
    meetingId: string
}

interface ActionItem {
    task: string
    assignee?: string
    dueDate?: string
    completed: boolean
}

interface Summary {
    id: string
    title: string
    overview: string
    keyPoints: string[]
    actionItems: ActionItem[]
    decisions: string[]
    nextSteps: string[]
    model: string
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    error?: string
    tokensUsed?: number
    createdAt: string
    updatedAt: string
}

interface SummaryResponse {
    summary: Summary
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SummarizeSection({ meetingId }: SummarizeSectionProps) {
    const [isGenerating, setIsGenerating] = useState(false)
    const [generateError, setGenerateError] = useState<string | null>(null)

    // Fetch existing summary
    const {
        data,
        error: fetchError,
        isLoading,
        mutate,
    } = useSWR<SummaryResponse>(
        meetingId ? `/api/meetings/${meetingId}/summary` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    )

    const summary = data?.summary
    const hasSummary = summary && summary.status === 'COMPLETED'

    const handleSummarizeClick = async () => {
        setIsGenerating(true)
        setGenerateError(null)

        try {
            const response = await fetch(`/api/meetings/${meetingId}/summary`, {
                method: 'POST',
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate summary')
            }

            // Refresh the summary data
            await mutate()
        } catch (error) {
            setGenerateError(
                error instanceof Error
                    ? error.message
                    : 'Failed to generate summary'
            )
        } finally {
            setIsGenerating(false)
        }
    }

    const renderSummaryContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )
        }

        if (summary?.status === 'PROCESSING') {
            return (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                    <span className="text-sm text-muted-foreground">
                        Generating summary...
                    </span>
                </div>
            )
        }

        if (summary?.status === 'FAILED') {
            return (
                <div className="flex items-center justify-center py-8 text-destructive">
                    <AlertCircle className="h-6 w-6 mr-2" />
                    <span className="text-sm">
                        Failed to generate summary: {summary.error}
                    </span>
                </div>
            )
        }

        if (!hasSummary) {
            return (
                <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                        No summary generated yet. Click the button above to
                        generate one.
                    </p>
                </div>
            )
        }

        return (
            <div className="space-y-6">
                {/* Title and Overview */}
                <div>
                    <h3 className="text-lg font-semibold mb-2">
                        {summary.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {summary.overview}
                    </p>
                </div>

                {/* Key Points */}
                {summary.keyPoints && summary.keyPoints.length > 0 && (
                    <div>
                        <h4 className="flex items-center gap-2 font-medium mb-2">
                            <ListChecks className="h-4 w-4 text-primary" />
                            Key Points
                        </h4>
                        <ul className="space-y-1 ml-6">
                            {summary.keyPoints.map((point, index) => (
                                <li
                                    key={index}
                                    className="text-sm list-disc text-muted-foreground"
                                >
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Action Items */}
                {summary.actionItems && summary.actionItems.length > 0 && (
                    <div>
                        <h4 className="flex items-center gap-2 font-medium mb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Action Items
                        </h4>
                        <ul className="space-y-2 ml-6">
                            {summary.actionItems.map((item, index) => (
                                <li
                                    key={index}
                                    className="text-sm border-l-2 border-green-200 pl-3"
                                >
                                    <span className="font-medium">
                                        {item.task}
                                    </span>
                                    {item.assignee && (
                                        <span className="text-muted-foreground">
                                            {' '}
                                            — {item.assignee}
                                        </span>
                                    )}
                                    {item.dueDate && (
                                        <span className="text-xs text-muted-foreground block">
                                            Due: {item.dueDate}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Decisions */}
                {summary.decisions && summary.decisions.length > 0 && (
                    <div>
                        <h4 className="flex items-center gap-2 font-medium mb-2">
                            <Target className="h-4 w-4 text-blue-500" />
                            Decisions Made
                        </h4>
                        <ul className="space-y-1 ml-6">
                            {summary.decisions.map((decision, index) => (
                                <li
                                    key={index}
                                    className="text-sm list-disc text-muted-foreground"
                                >
                                    {decision}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Next Steps */}
                {summary.nextSteps && summary.nextSteps.length > 0 && (
                    <div>
                        <h4 className="flex items-center gap-2 font-medium mb-2">
                            <ArrowRight className="h-4 w-4 text-orange-500" />
                            Next Steps
                        </h4>
                        <ul className="space-y-1 ml-6">
                            {summary.nextSteps.map((step, index) => (
                                <li
                                    key={index}
                                    className="text-sm list-disc text-muted-foreground"
                                >
                                    {step}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t text-xs text-muted-foreground">
                    <span>Generated by {summary.model}</span>
                    {summary.tokensUsed && (
                        <span className="ml-2">
                            • {summary.tokensUsed} tokens used
                        </span>
                    )}
                </div>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Meeting Summary
                </CardTitle>
                <CardDescription>
                    AI-generated summary of the meeting transcript
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Button
                        onClick={handleSummarizeClick}
                        disabled={isGenerating || isLoading}
                        className="w-full md:w-auto"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : hasSummary ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Regenerate Summary
                            </>
                        ) : (
                            'Generate Summary'
                        )}
                    </Button>
                </div>

                {generateError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {generateError}
                    </div>
                )}

                {fetchError && !summary && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        No summary available
                    </div>
                )}

                <div className="min-h-32 p-4 border rounded-lg bg-muted/30">
                    {renderSummaryContent()}
                </div>
            </CardContent>
        </Card>
    )
}
