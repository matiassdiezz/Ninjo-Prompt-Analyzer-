'use client';

import { useState, useCallback, useRef } from 'react';
import type { OptimizationResult, CompressionState } from '@/types/optimization';
import type { TokenUsage } from '@/types/tokens';

interface OptimizationState {
  isOptimizing: boolean;
  result: OptimizationResult | null;
  tokenUsage: TokenUsage | null;
  compressionStates: Record<string, CompressionState>;
  error: string | null;
}

export function useOptimization() {
  const [state, setState] = useState<OptimizationState>({
    isOptimizing: false,
    result: null,
    tokenUsage: null,
    compressionStates: {},
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const optimize = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      setState((prev) => ({ ...prev, error: 'El prompt no puede estar vacío.' }));
      return;
    }

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState({
      isOptimizing: true,
      result: null,
      tokenUsage: null,
      compressionStates: {},
      error: null,
    });

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al optimizar');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No se pudo iniciar el stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'done') {
              // Initialize compression states
              const compressionStates: Record<string, CompressionState> = {};
              if (data.result?.suggestions) {
                for (const suggestion of data.result.suggestions) {
                  compressionStates[suggestion.id] = {
                    suggestionId: suggestion.id,
                    status: 'pending',
                  };
                }
              }

              setState((prev) => ({
                ...prev,
                isOptimizing: false,
                result: data.result,
                tokenUsage: data.tokenUsage,
                compressionStates,
              }));
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (parseError) {
            // Ignore SSE parse errors
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState((prev) => ({ ...prev, isOptimizing: false, error: 'Optimización cancelada' }));
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setState((prev) => ({ ...prev, isOptimizing: false, error: errorMessage }));
      }
    }
  }, []);

  const applySuggestion = useCallback((suggestionId: string) => {
    setState((prev) => ({
      ...prev,
      compressionStates: {
        ...prev.compressionStates,
        [suggestionId]: { suggestionId, status: 'applied' },
      },
    }));
  }, []);

  const rejectSuggestion = useCallback((suggestionId: string) => {
    setState((prev) => ({
      ...prev,
      compressionStates: {
        ...prev.compressionStates,
        [suggestionId]: { suggestionId, status: 'rejected' },
      },
    }));
  }, []);

  const cancelOptimization = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isOptimizing: false,
      result: null,
      tokenUsage: null,
      compressionStates: {},
      error: null,
    });
  }, []);

  return {
    ...state,
    optimize,
    applySuggestion,
    rejectSuggestion,
    cancelOptimization,
    reset,
  };
}
