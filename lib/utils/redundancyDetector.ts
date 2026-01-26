import type { RedundancyResult, RedundantPhrase } from '@/types/optimization';
import { estimateTokens } from '@/lib/hooks/useTokenEstimation';

const MIN_PHRASE_WORDS = 3;
const MIN_OCCURRENCES = 2;

/**
 * Splits text into phrases (sentences or meaningful segments)
 */
function splitIntoPhrases(text: string): string[] {
  // Split by sentence-ending punctuation and newlines
  const rawPhrases = text
    .split(/[.\n!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return rawPhrases;
}

/**
 * Normalizes a phrase for comparison (lowercase, trim, collapse whitespace)
 */
function normalizePhrase(phrase: string): string {
  return phrase.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Counts words in a phrase
 */
function countWords(phrase: string): number {
  return phrase.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Finds the line number where a phrase appears in the text
 */
function findLineNumber(text: string, phrase: string, startFrom: number = 0): number {
  const lowerText = text.toLowerCase();
  const lowerPhrase = normalizePhrase(phrase);

  const index = lowerText.indexOf(lowerPhrase, startFrom);
  if (index === -1) return -1;

  const textBeforePhrase = text.substring(0, index);
  const lineNumber = textBeforePhrase.split('\n').length;

  return lineNumber;
}

/**
 * Finds all line numbers where a phrase appears
 */
function findAllLineNumbers(text: string, phrase: string): number[] {
  const lines: number[] = [];
  const lowerText = text.toLowerCase();
  const lowerPhrase = normalizePhrase(phrase);

  let startIndex = 0;
  while (true) {
    const index = lowerText.indexOf(lowerPhrase, startIndex);
    if (index === -1) break;

    const textBeforePhrase = text.substring(0, index);
    const lineNumber = textBeforePhrase.split('\n').length;
    lines.push(lineNumber);

    startIndex = index + lowerPhrase.length;
  }

  return lines;
}

/**
 * Detects redundant phrases in a prompt
 */
export function detectRedundancy(prompt: string): RedundancyResult {
  const phrases = splitIntoPhrases(prompt);
  const phraseCount = new Map<string, { original: string; count: number }>();

  // Count phrase occurrences
  for (const phrase of phrases) {
    if (countWords(phrase) < MIN_PHRASE_WORDS) continue;

    const normalized = normalizePhrase(phrase);
    const existing = phraseCount.get(normalized);

    if (existing) {
      existing.count++;
    } else {
      phraseCount.set(normalized, { original: phrase, count: 1 });
    }
  }

  // Find redundant phrases (appearing 2+ times)
  const redundantPhrases: RedundantPhrase[] = [];
  let totalRedundantTokens = 0;

  phraseCount.forEach((data, normalized) => {
    if (data.count >= MIN_OCCURRENCES) {
      const locations = findAllLineNumbers(prompt, data.original);
      const tokensPerOccurrence = estimateTokens(data.original);
      const redundantTokens = tokensPerOccurrence * (data.count - 1);

      redundantPhrases.push({
        id: crypto.randomUUID(),
        phrase: data.original,
        occurrences: data.count,
        locations,
        estimatedTokens: redundantTokens,
      });

      totalRedundantTokens += redundantTokens;
    }
  });

  // Sort by token impact (highest first)
  redundantPhrases.sort((a, b) => b.estimatedTokens - a.estimatedTokens);

  // Calculate redundancy score (0-10, lower is better)
  const totalTokens = estimateTokens(prompt);
  const redundancyRatio = totalTokens > 0 ? totalRedundantTokens / totalTokens : 0;
  const redundancyScore = Math.min(10, redundancyRatio * 100);

  return {
    phrases: redundantPhrases,
    totalRedundantTokens,
    redundancyScore: Math.round(redundancyScore * 10) / 10,
  };
}

/**
 * Hook-friendly function to detect redundancy with memoization potential
 */
export function analyzeRedundancy(prompt: string): RedundancyResult {
  if (!prompt || prompt.trim().length === 0) {
    return {
      phrases: [],
      totalRedundantTokens: 0,
      redundancyScore: 0,
    };
  }

  return detectRedundancy(prompt);
}

/**
 * Gets a human-readable description of the redundancy level
 */
export function getRedundancyLevel(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score <= 1) {
    return {
      label: 'Excelente',
      color: 'green',
      description: 'Tu prompt tiene muy poca o ninguna redundancia.',
    };
  }
  if (score <= 3) {
    return {
      label: 'Bueno',
      color: 'blue',
      description: 'Hay algunas repeticiones menores que podrían optimizarse.',
    };
  }
  if (score <= 5) {
    return {
      label: 'Moderado',
      color: 'yellow',
      description: 'Se detectaron varias frases repetidas. Considera consolidarlas.',
    };
  }
  if (score <= 7) {
    return {
      label: 'Alto',
      color: 'orange',
      description: 'Hay mucha redundancia que está desperdiciando tokens.',
    };
  }
  return {
    label: 'Muy Alto',
    color: 'red',
    description: 'El prompt tiene redundancia significativa. Optimizar es recomendable.',
  };
}
