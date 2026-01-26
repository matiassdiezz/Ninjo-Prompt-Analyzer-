export interface RedundantPhrase {
  id: string;
  phrase: string;
  occurrences: number;
  locations: number[]; // line numbers
  estimatedTokens: number;
}

export interface RedundancyResult {
  phrases: RedundantPhrase[];
  totalRedundantTokens: number;
  redundancyScore: number; // 0-10, lower is better
}

export interface CompressionSuggestion {
  id: string;
  originalText: string;
  compressedText: string;
  tokenSavings: number;
  clarityImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  category: 'verbose' | 'redundant' | 'filler' | 'restructure';
  startIndex: number;
  endIndex: number;
}

export interface OptimizationResult {
  suggestions: CompressionSuggestion[];
  totalPotentialSavings: number;
  originalTokenCount: number;
  optimizedTokenCount: number;
}

export type CompressionStatus = 'pending' | 'applied' | 'rejected';

export interface CompressionState {
  suggestionId: string;
  status: CompressionStatus;
}
