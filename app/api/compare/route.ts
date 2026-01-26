import { NextRequest, NextResponse } from 'next/server';
import { AnthropicClient, parseAnalysisResponse } from '@/lib/anthropic/client';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from '@/lib/anthropic/prompts';
import { z } from 'zod';
import type { FeedbackItem, ImageFeedback, TextFeedback } from '@/types/feedback';
import type { AnalysisResult, AnalysisScores } from '@/types/analysis';
import type { ScoreDifference, ComparisonResult } from '@/types/comparison';
import type { TokenUsage } from '@/types/tokens';
import { SCORE_LABELS } from '@/types/comparison';

export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutes for parallel analysis

const TextFeedbackSchema = z.object({
  id: z.string(),
  type: z.literal('text'),
  content: z.string(),
  timestamp: z.number(),
});

const ImageFeedbackSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  url: z.string(),
  name: z.string(),
  size: z.number(),
  base64: z.string().optional(),
  timestamp: z.number(),
});

const FeedbackItemSchema = z.discriminatedUnion('type', [
  TextFeedbackSchema,
  ImageFeedbackSchema,
]);

const CompareRequestSchema = z.object({
  originalPrompt: z.string().min(1),
  modifiedPrompt: z.string().min(1),
  originalFeedback: z.array(FeedbackItemSchema).default([]),
  modifiedFeedback: z.array(FeedbackItemSchema).default([]),
});

async function analyzePrompt(
  client: AnthropicClient,
  prompt: string,
  feedback: FeedbackItem[]
): Promise<{ analysis: AnalysisResult; usage: TokenUsage | null }> {
  const imageFeedback = feedback.filter(
    (item): item is ImageFeedback => item.type === 'image'
  );
  const textFeedback = feedback
    .filter((item) => item.type === 'text')
    .map((item) => item.content);

  const userPrompt = buildAnalysisUserPrompt(prompt, textFeedback);

  // Collect chunks and get usage
  let accumulatedText = '';
  let tokenUsage: TokenUsage | null = null;

  for await (const event of client.analyzePromptStream(
    ANALYSIS_SYSTEM_PROMPT,
    userPrompt,
    imageFeedback
  )) {
    if (event.type === 'chunk') {
      accumulatedText += event.content;
    } else if (event.type === 'usage') {
      tokenUsage = event.usage;
    }
  }

  // Parse the analysis result
  const analysis = parseAnalysisResponse(accumulatedText) as AnalysisResult;
  analysis.timestamp = Date.now();

  return { analysis, usage: tokenUsage };
}

function calculateScoreDifferences(
  originalScores: AnalysisScores,
  modifiedScores: AnalysisScores
): ScoreDifference[] {
  const metrics: (keyof AnalysisScores)[] = [
    'clarity',
    'consistency',
    'completeness',
    'engagement',
    'safety',
    'overall',
  ];

  return metrics.map((metric) => {
    const original = originalScores[metric];
    const modified = modifiedScores[metric];
    const difference = modified - original;

    return {
      metric,
      label: SCORE_LABELS[metric],
      original,
      modified,
      difference,
      improved: difference > 0,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CompareRequestSchema.parse(body);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const client = new AnthropicClient(apiKey);

    // Analyze both prompts in parallel
    const [originalResult, modifiedResult] = await Promise.all([
      analyzePrompt(client, validatedData.originalPrompt, validatedData.originalFeedback),
      analyzePrompt(client, validatedData.modifiedPrompt, validatedData.modifiedFeedback),
    ]);

    // Calculate score differences
    const scoreDifferences = calculateScoreDifferences(
      originalResult.analysis.scores,
      modifiedResult.analysis.scores
    );

    // Calculate token differences
    let tokenDifference = null;
    if (originalResult.usage && modifiedResult.usage) {
      const inputDiff = modifiedResult.usage.inputTokens - originalResult.usage.inputTokens;
      const outputDiff = modifiedResult.usage.outputTokens - originalResult.usage.outputTokens;
      const totalDiff = modifiedResult.usage.totalTokens - originalResult.usage.totalTokens;
      const percentageChange = originalResult.usage.totalTokens > 0
        ? ((totalDiff / originalResult.usage.totalTokens) * 100)
        : 0;

      tokenDifference = {
        inputDiff,
        outputDiff,
        totalDiff,
        percentageChange: Math.round(percentageChange * 10) / 10,
      };
    }

    // Calculate summary
    const summary = {
      improved: scoreDifferences.filter((d) => d.difference > 0).length,
      worsened: scoreDifferences.filter((d) => d.difference < 0).length,
      unchanged: scoreDifferences.filter((d) => d.difference === 0).length,
    };

    const comparisonResult: ComparisonResult = {
      originalAnalysis: originalResult.analysis,
      modifiedAnalysis: modifiedResult.analysis,
      scoreDifferences,
      originalTokens: originalResult.usage,
      modifiedTokens: modifiedResult.usage,
      tokenDifference,
      summary,
    };

    return NextResponse.json(comparisonResult);
  } catch (error) {
    console.error('Compare error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to compare prompts',
      },
      { status: 500 }
    );
  }
}
