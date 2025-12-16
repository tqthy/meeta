'use client'

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

export function SummarizeSection() {
    const handleSummarizeClick = () => {
        console.log('Summarize clicked')
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Meeting Summary
                </CardTitle>
                <CardDescription>
                    Generate a summary of your recent meetings
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button
                    onClick={handleSummarizeClick}
                    className="w-full md:w-auto"
                >
                    Summarize
                </Button>
                <div className="min-h-32 p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                        Summary output will appear here...
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
