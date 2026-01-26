import { z } from 'zod';
import { validateAllOriginalTexts } from './textMatcher';
import type { AnalysisSection } from '@/types/analysis';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

export const ImageFeedbackSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  url: z.string(),
  name: z.string(),
  size: z.number().max(MAX_FILE_SIZE, 'Image must be less than 5MB'),
  base64: z.string().optional(),
  timestamp: z.number(),
});

export const TextFeedbackSchema = z.object({
  id: z.string(),
  type: z.literal('text'),
  content: z.string().min(1, 'Feedback content is required'),
  timestamp: z.number(),
});

export const FeedbackItemSchema = z.discriminatedUnion('type', [
  ImageFeedbackSchema,
  TextFeedbackSchema,
]);

export const AnalyzeRequestSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  feedback: z.array(FeedbackItemSchema),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// Agent Profile Schema
export const AgentProfileSchema = z.object({
  detectedMission: z.string(),
  targetAudience: z.string(),
  tone: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
});

// Analysis Section Schema
export const AnalysisSectionSchema = z.object({
  id: z.string(),
  originalText: z.string(),
  startIndex: z.number(),
  endIndex: z.number(),
  category: z.enum([
    'mission',
    'persona',
    'flow',
    'guardrails',
    'engagement',
    'examples',
    'efficiency',
    'hallucination',
  ]),
  issues: z.array(z.string()),
  suggestedRewrite: z.string(),
  explanation: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  impact: z.string(),
});

// Inconsistency Schema
export const InconsistencySchema = z.object({
  id: z.string(),
  description: z.string(),
  locations: z.array(z.string()),
  suggestion: z.string(),
});

// Missing Element Schema
export const MissingElementSchema = z.object({
  element: z.string(),
  importance: z.enum(['critical', 'high', 'medium', 'low']),
  suggestion: z.string(),
});

// Scores Schema
export const AnalysisScoresSchema = z.object({
  clarity: z.number().min(1).max(10),
  consistency: z.number().min(1).max(10),
  completeness: z.number().min(1).max(10),
  engagement: z.number().min(1).max(10),
  safety: z.number().min(1).max(10),
  overall: z.number().min(1).max(10),
});

// Full Analysis Result Schema
export const AnalysisResultSchema = z.object({
  agentProfile: AgentProfileSchema,
  sections: z.array(AnalysisSectionSchema),
  inconsistencies: z.array(InconsistencySchema),
  missingElements: z.array(MissingElementSchema),
  scores: AnalysisScoresSchema,
  overallFeedback: z.string(),
  topPriorities: z.array(z.string()),
});

/**
 * Validates image file type
 */
export function isValidImageType(base64String: string): boolean {
  for (const type of ALLOWED_IMAGE_TYPES) {
    if (base64String.startsWith(`data:${type}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Validates image file size from base64 string
 */
export function getBase64FileSize(base64String: string): number {
  // Remove data URL prefix if present
  const base64Data = base64String.split(',')[1] || base64String;

  // Calculate size: (base64 length * 3/4) to get approximate byte size
  const padding = (base64Data.match(/=/g) || []).length;
  return (base64Data.length * 3) / 4 - padding;
}

/**
 * Validates and sanitizes base64 image
 */
export function validateBase64Image(base64String: string): {
  valid: boolean;
  error?: string;
} {
  if (!isValidImageType(base64String)) {
    return {
      valid: false,
      error: 'Invalid image type. Only PNG, JPEG, GIF, and WebP are allowed.',
    };
  }

  const size = getBase64FileSize(base64String);
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Image size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds the maximum allowed size of 5MB.`,
    };
  }

  return { valid: true };
}

/**
 * Validates that all originalText fields in analysis sections match the prompt
 * Filters out sections with invalid originalText
 */
export function validateOriginalTextMatches(
  prompt: string,
  analysis: z.infer<typeof AnalysisResultSchema>
): {
  validatedAnalysis: z.infer<typeof AnalysisResultSchema>;
  filteredCount: number;
  filteredSections: Array<{ id: string; reason: string }>;
} {
  const { validSections, invalidSections } = validateAllOriginalTexts(
    prompt,
    analysis.sections.map((s) => ({ id: s.id, originalText: s.originalText }))
  );

  // Filter to only valid sections
  const validatedSections = analysis.sections.filter((section) =>
    validSections.includes(section.id)
  );

  // Log filtered sections for debugging
  if (invalidSections.length > 0) {
    console.warn(
      `Filtered ${invalidSections.length} sections with invalid originalText:`,
      invalidSections.map((s) => ({
        id: s.id,
        reason: s.reason,
        confidence: s.match.confidence,
      }))
    );
  }

  return {
    validatedAnalysis: {
      ...analysis,
      sections: validatedSections,
    },
    filteredCount: invalidSections.length,
    filteredSections: invalidSections.map((s) => ({ id: s.id, reason: s.reason })),
  };
}
