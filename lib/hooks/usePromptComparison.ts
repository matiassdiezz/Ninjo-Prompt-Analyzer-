'use client';

import { useCallback } from 'react';
import { useComparisonStore } from '@/store/comparisonStore';
import type { ComparisonResult } from '@/types/comparison';

export function usePromptComparison() {
  const {
    originalPrompt,
    modifiedPrompt,
    originalFeedback,
    modifiedFeedback,
    comparisonResult,
    isComparing,
    error,
    startComparison,
    setComparisonResult,
    completeComparison,
    setError,
  } = useComparisonStore();

  const compare = useCallback(async () => {
    if (!originalPrompt.trim() || !modifiedPrompt.trim()) {
      setError('Ambos prompts son requeridos para comparar.');
      return;
    }

    startComparison();

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt,
          modifiedPrompt,
          originalFeedback,
          modifiedFeedback,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al comparar prompts');
      }

      const result: ComparisonResult = await response.json();
      setComparisonResult(result);
      completeComparison();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
    }
  }, [
    originalPrompt,
    modifiedPrompt,
    originalFeedback,
    modifiedFeedback,
    startComparison,
    setComparisonResult,
    completeComparison,
    setError,
  ]);

  const canCompare = originalPrompt.trim().length > 0 && modifiedPrompt.trim().length > 0;

  return {
    compare,
    canCompare,
    isComparing,
    comparisonResult,
    error,
  };
}
