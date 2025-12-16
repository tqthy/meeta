/**
 * summaryService
 *
 * Generates AI-powered meeting summaries using the transcript data.
 * Uses Google Gemini via the AI SDK for structured object generation.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { SummaryStatus } from '@/app/generated/prisma'

// Initialize Google Generative AI with the API key
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export interface SummaryGenerationResult {
    success: boolean
    summaryId?: string
    error?: string
}

export interface GeneratedSummary {
    title: string
    overview: string
    keyPoints: string[]
    actionItems: Array<{
        task: string
        assignee?: string
        dueDate?: string
        completed: boolean
    }>
    decisions: string[]
    nextSteps: string[]
}

// Zod schema for structured output
const summarySchema = z.object({
    title: z
        .string()
        .describe(
            'A concise, descriptive title for the meeting (max 100 characters)'
        ),
    overview: z
        .string()
        .describe(
            'A brief 2-3 sentence overview of what was discussed in the meeting'
        ),
    keyPoints: z
        .array(z.string())
        .describe('Array of 3-7 key discussion points from the meeting'),
    actionItems: z
        .array(
            z.object({
                task: z.string().describe('Description of the action item'),
                assignee: z
                    .string()
                    .optional()
                    .describe('Name of person responsible (if mentioned)'),
                dueDate: z
                    .string()
                    .optional()
                    .describe('Due date if mentioned (ISO format)'),
                completed: z
                    .boolean()
                    .describe('Whether the action item is completed'),
            })
        )
        .describe('Array of action items extracted from the meeting'),
    decisions: z
        .array(z.string())
        .describe('Array of decisions that were made during the meeting'),
    nextSteps: z
        .array(z.string())
        .describe('Array of next steps or follow-up items'),
})

const SUMMARY_SYSTEM_PROMPT = `You are an expert meeting summarizer. Analyze the provided meeting transcript and generate a comprehensive summary.

Rules:
1. Be concise but comprehensive
2. Extract specific action items with assignees when mentioned
3. Identify clear decisions that were made
4. List concrete next steps
5. If no action items, decisions, or next steps were discussed, use empty arrays
6. The title should be descriptive and under 100 characters`

export const summaryService = {
    /**
     * Generate a summary for a meeting using its transcript
     */
    async generateSummary(meetingId: string): Promise<SummaryGenerationResult> {
        try {
            // Check if meeting exists
            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
                include: {
                    transcript: {
                        include: {
                            segments: {
                                where: { isFinal: true },
                                orderBy: { receivedAt: 'asc' },
                            },
                        },
                    },
                    summary: true,
                },
            })

            if (!meeting) {
                return {
                    success: false,
                    error: 'Meeting not found',
                }
            }

            if (!meeting.transcript) {
                return {
                    success: false,
                    error: 'No transcript available for this meeting',
                }
            }

            if (meeting.transcript.segments.length === 0) {
                return {
                    success: false,
                    error: 'Transcript has no segments',
                }
            }

            // Build transcript text from segments
            const transcriptText = meeting.transcript.segments
                .map((segment) => {
                    const speaker =
                        segment.speakerName || `Speaker ${segment.speakerId}`
                    return `${speaker}: ${segment.text}`
                })
                .join('\n')

            // Check if summary already exists
            if (meeting.summary) {
                // Update status to processing
                await prisma.summary.update({
                    where: { id: meeting.summary.id },
                    data: {
                        status: SummaryStatus.PROCESSING,
                    },
                })
            } else {
                // Create a new summary record in PROCESSING state
                await prisma.summary.create({
                    data: {
                        meetingId,
                        title: 'Generating...',
                        overview: '',
                        keyPoints: [],
                        actionItems: [],
                        decisions: [],
                        nextSteps: [],
                        model: 'gemini-2.5-flash',
                        status: SummaryStatus.PROCESSING,
                    },
                })
            }

            // Generate summary using Google Gemini with structured output
            const { object: generatedSummary, usage } = await generateObject({
                model: google('gemini-2.5-flash'),
                schema: summarySchema,
                system: SUMMARY_SYSTEM_PROMPT,
                prompt: `Meeting Transcript:\n${transcriptText}`,
            })

            // Update the summary with generated content
            const updatedSummary = await prisma.summary.update({
                where: { meetingId },
                data: {
                    title: generatedSummary.title,
                    overview: generatedSummary.overview,
                    keyPoints: generatedSummary.keyPoints,
                    actionItems: generatedSummary.actionItems,
                    decisions: generatedSummary.decisions,
                    nextSteps: generatedSummary.nextSteps || [],
                    model: 'gemini-2.5-flash',
                    tokensUsed: usage?.totalTokens || null,
                    status: SummaryStatus.COMPLETED,
                    error: null,
                },
            })

            return {
                success: true,
                summaryId: updatedSummary.id,
            }
        } catch (error) {
            console.error('[summaryService] Error generating summary:', error)

            // Try to update the summary status to FAILED
            try {
                await prisma.summary.update({
                    where: { meetingId },
                    data: {
                        status: SummaryStatus.FAILED,
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Unknown error',
                    },
                })
            } catch {
                // Summary might not exist yet
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    },

    /**
     * Get the summary for a meeting
     */
    async getSummary(meetingId: string) {
        return prisma.summary.findUnique({
            where: { meetingId },
        })
    },
}
