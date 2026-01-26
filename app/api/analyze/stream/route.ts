import { NextRequest } from 'next/server';
import { AnthropicClient } from '@/lib/anthropic/client';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from '@/lib/anthropic/prompts';
import { AnalyzeRequestSchema } from '@/lib/utils/validation';
import type { ImageFeedback } from '@/types/feedback';
import type { TokenUsage } from '@/types/tokens';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = AnalyzeRequestSchema.parse(body);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const imageFeedback = validatedData.feedback.filter(
      (item): item is ImageFeedback => item.type === 'image'
    );
    const textFeedback = validatedData.feedback
      .filter((item) => item.type === 'text')
      .map((item) => item.content);

    const userPrompt = buildAnalysisUserPrompt(validatedData.prompt, textFeedback);
    const client = new AnthropicClient(apiKey);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let tokenUsage: TokenUsage | null = null;

        try {
          for await (const event of client.analyzePromptStream(
            ANALYSIS_SYSTEM_PROMPT,
            userPrompt,
            imageFeedback
          )) {
            if (event.type === 'chunk') {
              // Send each chunk as a Server-Sent Event
              const data = JSON.stringify({ type: 'chunk', content: event.content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            } else if (event.type === 'usage') {
              // Capture the latest usage data
              tokenUsage = event.usage;
            }
          }

          // Send completion event with token usage
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', tokenUsage })}\n\n`));
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to start analysis stream',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
