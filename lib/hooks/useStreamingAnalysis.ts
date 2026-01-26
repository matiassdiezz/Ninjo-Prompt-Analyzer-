'use client';

import { useState, useCallback, useRef } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import type { AnalysisResult, AnalysisSection } from '@/types/analysis';
import type { FeedbackItem } from '@/types/feedback';

interface StreamingState {
  isStreaming: boolean;
  rawText: string;
  sectionsFound: number;
  currentSection: string | null;
  error: string | null;
}

// Extract complete sections from partial JSON
function extractCompleteSections(text: string): AnalysisSection[] {
  const sections: AnalysisSection[] = [];

  // Look for the sections array
  const sectionsMatch = text.match(/"sections"\s*:\s*\[/);
  if (!sectionsMatch) return sections;

  const startIdx = sectionsMatch.index! + sectionsMatch[0].length;
  let depth = 1;
  let sectionStart = startIdx;
  let inString = false;
  let escapeNext = false;

  for (let i = startIdx; i < text.length && depth > 0; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      if (depth === 1) sectionStart = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 1) {
        // Found a complete section object
        const sectionText = text.substring(sectionStart, i + 1);
        try {
          const section = JSON.parse(sectionText);
          if (section.id && section.originalText) {
            sections.push(section);
          }
        } catch {
          // Not a valid JSON yet, skip
        }
      }
    } else if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
    }
  }

  return sections;
}

// Extract partial analysis data
function extractPartialAnalysis(text: string): Partial<AnalysisResult> {
  const result: Partial<AnalysisResult> = {};

  // Try to extract agentProfile
  try {
    const profileMatch = text.match(/"agentProfile"\s*:\s*(\{[^}]+\})/s);
    if (profileMatch) {
      // Find the complete object by counting braces
      const startIdx = text.indexOf('"agentProfile"');
      if (startIdx !== -1) {
        const colonIdx = text.indexOf(':', startIdx);
        const objStart = text.indexOf('{', colonIdx);
        if (objStart !== -1) {
          let depth = 1;
          let i = objStart + 1;
          let inString = false;
          let escapeNext = false;

          while (i < text.length && depth > 0) {
            const char = text[i];
            if (escapeNext) {
              escapeNext = false;
              i++;
              continue;
            }
            if (char === '\\') {
              escapeNext = true;
              i++;
              continue;
            }
            if (char === '"') {
              inString = !inString;
            } else if (!inString) {
              if (char === '{') depth++;
              else if (char === '}') depth--;
            }
            i++;
          }

          if (depth === 0) {
            try {
              result.agentProfile = JSON.parse(text.substring(objStart, i));
            } catch {
              // Not complete yet
            }
          }
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }

  // Extract sections
  result.sections = extractCompleteSections(text);

  // Try to extract scores
  try {
    const scoresMatch = text.match(/"scores"\s*:\s*\{([^}]+)\}/);
    if (scoresMatch) {
      const scoresText = '{' + scoresMatch[1] + '}';
      result.scores = JSON.parse(scoresText);
    }
  } catch {
    // Not complete yet
  }

  // Try to extract overallFeedback
  try {
    const feedbackMatch = text.match(/"overallFeedback"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (feedbackMatch) {
      result.overallFeedback = JSON.parse('"' + feedbackMatch[1] + '"');
    }
  } catch {
    // Not complete yet
  }

  // Try to extract topPriorities
  try {
    const prioritiesMatch = text.match(/"topPriorities"\s*:\s*\[((?:[^\[\]]|\[(?:[^\[\]])*\])*)\]/);
    if (prioritiesMatch) {
      result.topPriorities = JSON.parse('[' + prioritiesMatch[1] + ']');
    }
  } catch {
    // Not complete yet
  }

  return result;
}

export function useStreamingAnalysis() {
  const { setAnalysis, setAnalysisProgress, startAnalysis, completeAnalysis, setError, setTokenUsage } = useAnalysisStore();

  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    rawText: '',
    sectionsFound: 0,
    currentSection: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSectionCountRef = useRef(0);

  const startStreaming = useCallback(async (prompt: string, feedback: FeedbackItem[]) => {
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    lastSectionCountRef.current = 0;

    setState({
      isStreaming: true,
      rawText: '',
      sectionsFound: 0,
      currentSection: 'Iniciando análisis...',
      error: null,
    });

    startAnalysis();
    setAnalysisProgress({
      step: 0,
      stepName: 'Conectando con Claude...',
      percentage: 5,
      startTime: Date.now(),
      estimatedTotal: 40,
    });

    try {
      const response = await fetch('/api/analyze/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, feedback }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al iniciar el análisis');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No se pudo iniciar el stream');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'chunk') {
              accumulatedText += data.content;

              // Try to extract partial analysis
              const partial = extractPartialAnalysis(accumulatedText);
              const sectionCount = partial.sections?.length || 0;

              // Update progress based on what we've found
              let percentage = 10;
              let stepName = 'Analizando prompt...';

              if (partial.agentProfile) {
                percentage = 20;
                stepName = 'Perfil del agente detectado';
              }

              if (sectionCount > 0) {
                percentage = 20 + Math.min(sectionCount * 10, 50);
                stepName = `${sectionCount} sugerencia${sectionCount > 1 ? 's' : ''} encontrada${sectionCount > 1 ? 's' : ''}`;

                // Update analysis with partial results if we found new sections
                if (sectionCount > lastSectionCountRef.current) {
                  lastSectionCountRef.current = sectionCount;
                  setAnalysis({
                    agentProfile: partial.agentProfile || {
                      detectedMission: '',
                      targetAudience: '',
                      tone: '',
                      strengths: [],
                      concerns: [],
                    },
                    sections: partial.sections || [],
                    inconsistencies: [],
                    missingElements: [],
                    scores: partial.scores || {
                      clarity: 0,
                      consistency: 0,
                      completeness: 0,
                      engagement: 0,
                      safety: 0,
                      overall: 0,
                    },
                    overallFeedback: partial.overallFeedback || 'Analizando...',
                    topPriorities: partial.topPriorities || [],
                    timestamp: Date.now(),
                  });
                }
              }

              if (partial.scores) {
                percentage = 85;
                stepName = 'Calculando puntuaciones...';
              }

              if (partial.overallFeedback) {
                percentage = 95;
                stepName = 'Finalizando análisis...';
              }

              setAnalysisProgress({
                step: Math.floor(percentage / 15),
                stepName,
                percentage,
                startTime: Date.now(),
                estimatedTotal: 40,
              });

              setState(prev => ({
                ...prev,
                rawText: accumulatedText,
                sectionsFound: sectionCount,
                currentSection: stepName,
              }));
            } else if (data.type === 'done') {
              // Final parsing
              const finalPartial = extractPartialAnalysis(accumulatedText);

              // Try to parse the complete JSON
              let finalResult: AnalysisResult;
              try {
                // Extract JSON from the accumulated text
                const jsonMatch = accumulatedText.match(/```json\s*([\s\S]*?)\s*```/) ||
                                  accumulatedText.match(/```\s*([\s\S]*?)\s*```/) ||
                                  [null, accumulatedText];

                let jsonText = jsonMatch[1] || accumulatedText;
                const startIdx = jsonText.indexOf('{');
                const endIdx = jsonText.lastIndexOf('}');
                if (startIdx !== -1 && endIdx !== -1) {
                  jsonText = jsonText.substring(startIdx, endIdx + 1);
                }

                finalResult = JSON.parse(jsonText);
              } catch {
                // Use partial result
                finalResult = {
                  agentProfile: finalPartial.agentProfile || {
                    detectedMission: '',
                    targetAudience: '',
                    tone: '',
                    strengths: [],
                    concerns: [],
                  },
                  sections: finalPartial.sections || [],
                  inconsistencies: [],
                  missingElements: [],
                  scores: finalPartial.scores || {
                    clarity: 5,
                    consistency: 5,
                    completeness: 5,
                    engagement: 5,
                    safety: 5,
                    overall: 5,
                  },
                  overallFeedback: finalPartial.overallFeedback || 'Análisis completado.',
                  topPriorities: finalPartial.topPriorities || [],
                  timestamp: Date.now(),
                };
              }

              setAnalysis(finalResult);

              // Save token usage if available
              if (data.tokenUsage) {
                setTokenUsage(data.tokenUsage);
              }

              setAnalysisProgress({
                step: 6,
                stepName: 'Completado',
                percentage: 100,
                startTime: Date.now(),
                estimatedTotal: 0,
              });

              setState(prev => ({
                ...prev,
                isStreaming: false,
                currentSection: 'Completado',
              }));
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (parseError) {
            // Ignore SSE parse errors for incomplete chunks
            if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') {
              console.warn('SSE parse warning:', parseError);
            }
          }
        }
      }

      completeAnalysis();
      setAnalysisProgress(null);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState(prev => ({ ...prev, isStreaming: false, error: 'Análisis cancelado' }));
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setState(prev => ({ ...prev, isStreaming: false, error: errorMessage }));
        setError(errorMessage);
      }
      completeAnalysis();
      setAnalysisProgress(null);
    }
  }, [setAnalysis, setAnalysisProgress, startAnalysis, completeAnalysis, setError, setTokenUsage]);

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    ...state,
    startStreaming,
    cancelStreaming,
  };
}
