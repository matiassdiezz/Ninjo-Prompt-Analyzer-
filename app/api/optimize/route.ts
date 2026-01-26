import { NextRequest } from 'next/server';
import { AnthropicClient } from '@/lib/anthropic/client';
import { OPTIMIZATION_SYSTEM_PROMPT, buildOptimizationUserPrompt } from '@/lib/anthropic/prompts';
import { z } from 'zod';
import type { TokenUsage } from '@/types/tokens';
import type { OptimizationResult } from '@/types/optimization';

export const runtime = 'nodejs';
export const maxDuration = 120;

const OptimizeRequestSchema = z.object({
  prompt: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = OptimizeRequestSchema.parse(body);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const client = new AnthropicClient(apiKey);
    const userPrompt = buildOptimizationUserPrompt(validatedData.prompt);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let accumulatedText = '';
        let tokenUsage: TokenUsage | null = null;

        try {
          for await (const event of client.analyzePromptStream(
            OPTIMIZATION_SYSTEM_PROMPT,
            userPrompt,
            []
          )) {
            if (event.type === 'chunk') {
              accumulatedText += event.content;
              const data = JSON.stringify({ type: 'chunk', content: event.content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            } else if (event.type === 'usage') {
              tokenUsage = event.usage;
            }
          }

          // Parse the final result
          let result: OptimizationResult;
          try {
            const jsonMatch = accumulatedText.match(/```json\s*([\s\S]*?)\s*```/) ||
                              accumulatedText.match(/```\s*([\s\S]*?)\s*```/) ||
                              [null, accumulatedText];

            let jsonText = jsonMatch[1] || accumulatedText;
            const startIdx = jsonText.indexOf('{');
            const endIdx = jsonText.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
              jsonText = jsonText.substring(startIdx, endIdx + 1);
            }

            result = JSON.parse(jsonText);

            // Add IDs to suggestions if missing
            result.suggestions = result.suggestions.map((s, i) => ({
              ...s,
              id: s.id || crypto.randomUUID(),
            }));
          } catch (parseError) {
            console.error('Failed to parse optimization result:', parseError);
            result = {
              suggestions: [],
              totalPotentialSavings: 0,
              originalTokenCount: 0,
              optimizedTokenCount: 0,
            };
          }

          // Send completion event with result and usage
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', result, tokenUsage })}\n\n`)
          );
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
    console.error('Optimize error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to start optimization',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
