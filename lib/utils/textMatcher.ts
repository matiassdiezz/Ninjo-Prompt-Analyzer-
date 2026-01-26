/**
 * Text Matcher - Finds text in prompts using multiple strategies
 */

export type MatchStrategy = 'exact' | 'normalized' | 'fuzzy';

export interface TextMatchResult {
  found: boolean;
  startIndex: number;
  endIndex: number;
  matchedText: string;
  strategy: MatchStrategy;
  confidence: number;
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates similarity ratio between two strings (0-1)
 */
function similarityRatio(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

/**
 * Normalizes text by collapsing whitespace
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Strategy 1: Exact match using indexOf
 */
function exactMatch(prompt: string, searchText: string): TextMatchResult | null {
  const index = prompt.indexOf(searchText);
  if (index !== -1) {
    return {
      found: true,
      startIndex: index,
      endIndex: index + searchText.length,
      matchedText: searchText,
      strategy: 'exact',
      confidence: 1.0,
    };
  }
  return null;
}

/**
 * Strategy 2: Normalized match ignoring whitespace differences
 */
function normalizedMatch(prompt: string, searchText: string): TextMatchResult | null {
  const normalizedSearch = normalizeWhitespace(searchText);
  const normalizedPrompt = normalizeWhitespace(prompt);

  const normalizedIndex = normalizedPrompt.indexOf(normalizedSearch);
  if (normalizedIndex === -1) return null;

  // Find the actual position in the original prompt
  // We need to map the normalized index back to the original
  const escapedSearch = searchText
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');

  const regex = new RegExp(escapedSearch);
  const match = prompt.match(regex);

  if (match && match.index !== undefined) {
    return {
      found: true,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      matchedText: match[0],
      strategy: 'normalized',
      confidence: 0.95,
    };
  }

  return null;
}

/**
 * Strategy 3: Fuzzy match using sliding window and Levenshtein
 */
function fuzzyMatch(
  prompt: string,
  searchText: string,
  threshold: number = 0.85
): TextMatchResult | null {
  const searchLen = searchText.length;
  const windowSize = Math.floor(searchLen * 1.2); // Allow 20% size difference
  const minWindowSize = Math.floor(searchLen * 0.8);

  let bestMatch: TextMatchResult | null = null;
  let bestSimilarity = threshold;

  // Slide window across prompt
  for (let i = 0; i <= prompt.length - minWindowSize; i++) {
    // Try different window sizes
    for (let wSize = minWindowSize; wSize <= windowSize && i + wSize <= prompt.length; wSize++) {
      const window = prompt.substring(i, i + wSize);
      const similarity = similarityRatio(searchText, window);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = {
          found: true,
          startIndex: i,
          endIndex: i + wSize,
          matchedText: window,
          strategy: 'fuzzy',
          confidence: similarity,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Main function: Find text in prompt using all strategies
 */
export function findTextInPrompt(
  prompt: string,
  searchText: string,
  options: {
    enableFuzzy?: boolean;
    fuzzyThreshold?: number;
  } = {}
): TextMatchResult {
  const { enableFuzzy = true, fuzzyThreshold = 0.85 } = options;

  // Strategy 1: Exact match
  const exact = exactMatch(prompt, searchText);
  if (exact) return exact;

  // Also try with trimmed text
  const trimmedSearchText = searchText.trim();
  if (trimmedSearchText !== searchText) {
    const exactTrimmed = exactMatch(prompt, trimmedSearchText);
    if (exactTrimmed) return exactTrimmed;
  }

  // Strategy 2: Normalized match
  const normalized = normalizedMatch(prompt, searchText);
  if (normalized) return normalized;

  // Strategy 3: Fuzzy match (optional)
  if (enableFuzzy) {
    const fuzzy = fuzzyMatch(prompt, searchText, fuzzyThreshold);
    if (fuzzy) return fuzzy;
  }

  // Not found
  return {
    found: false,
    startIndex: -1,
    endIndex: -1,
    matchedText: '',
    strategy: 'exact',
    confidence: 0,
  };
}

/**
 * Validates that originalText exists in prompt
 */
export function validateOriginalText(
  prompt: string,
  originalText: string
): { valid: boolean; match: TextMatchResult } {
  const match = findTextInPrompt(prompt, originalText, {
    enableFuzzy: true,
    fuzzyThreshold: 0.90, // Higher threshold for validation
  });

  return {
    valid: match.found && match.confidence >= 0.90,
    match,
  };
}

/**
 * Batch validate all sections in an analysis result
 */
export function validateAllOriginalTexts(
  prompt: string,
  sections: Array<{ id: string; originalText: string }>
): {
  validSections: string[];
  invalidSections: Array<{ id: string; reason: string; match: TextMatchResult }>;
} {
  const validSections: string[] = [];
  const invalidSections: Array<{ id: string; reason: string; match: TextMatchResult }> = [];

  for (const section of sections) {
    const { valid, match } = validateOriginalText(prompt, section.originalText);

    if (valid) {
      validSections.push(section.id);
    } else {
      let reason = 'Text not found in prompt';
      if (match.found && match.confidence < 0.90) {
        reason = `Low confidence match (${(match.confidence * 100).toFixed(0)}%)`;
      }
      invalidSections.push({ id: section.id, reason, match });
    }
  }

  return { validSections, invalidSections };
}
