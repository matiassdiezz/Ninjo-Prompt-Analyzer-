'use client';

import { useMemo } from 'react';
import { calculateCost, type TokenUsage } from '@/types/tokens';

// Approximate ratio: 1 token ≈ 4 characters for most languages
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function useTokenEstimation(text: string): {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotal: number;
  estimatedCost: number;
} {
  return useMemo(() => {
    const inputTokens = estimateTokens(text);
    // Estimate output as roughly 2x input for analysis tasks
    const outputTokens = Math.ceil(inputTokens * 2);
    const total = inputTokens + outputTokens;
    const cost = calculateCost(inputTokens, outputTokens);

    return {
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      estimatedTotal: total,
      estimatedCost: cost,
    };
  }, [text]);
}

export function createTokenUsage(
  inputTokens: number,
  outputTokens: number
): TokenUsage {
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost: calculateCost(inputTokens, outputTokens),
  };
}
