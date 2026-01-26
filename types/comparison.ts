import type { AnalysisResult, AnalysisScores } from './analysis';
import type { TokenUsage } from './tokens';

export interface ScoreDifference {
  metric: keyof AnalysisScores;
  label: string;
  original: number;
  modified: number;
  difference: number;
  improved: boolean;
}

export interface ComparisonResult {
  originalAnalysis: AnalysisResult;
  modifiedAnalysis: AnalysisResult;
  scoreDifferences: ScoreDifference[];
  originalTokens: TokenUsage | null;
  modifiedTokens: TokenUsage | null;
  tokenDifference: {
    inputDiff: number;
    outputDiff: number;
    totalDiff: number;
    percentageChange: number;
  } | null;
  summary: {
    improved: number;
    worsened: number;
    unchanged: number;
  };
}

export type ComparisonMode = 'analyze' | 'compare';

export const SCORE_LABELS: Record<keyof AnalysisScores, string> = {
  clarity: 'Claridad',
  consistency: 'Consistencia',
  completeness: 'Completitud',
  engagement: 'Engagement',
  safety: 'Seguridad',
  overall: 'General'
};
