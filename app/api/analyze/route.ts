import { NextRequest, NextResponse } from 'next/server';
import { AnthropicClient, parseAnalysisResponse, RETRY_SYSTEM_PROMPT } from '@/lib/anthropic/client';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from '@/lib/anthropic/prompts';
import {
  AnalyzeRequestSchema,
  AnalysisResultSchema,
  validateOriginalTextMatches,
} from '@/lib/utils/validation';
import type { ImageFeedback } from '@/types/feedback';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for analysis

// Valid categories as defined in the schema
const VALID_CATEGORIES = [
  'mission',
  'persona',
  'flow',
  'guardrails',
  'engagement',
  'examples',
  'efficiency',
  'hallucination',
] as const;

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

/**
 * Sanitizes analysis data to fix common issues before Zod validation
 */
function sanitizeAnalysisData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;

  const obj = data as Record<string, unknown>;

  // Sanitize sections array
  if (Array.isArray(obj.sections)) {
    obj.sections = obj.sections
      .filter((section): section is Record<string, unknown> =>
        section !== null && typeof section === 'object'
      )
      .map((section) => {
        // Fix invalid category
        if (section.category && !VALID_CATEGORIES.includes(section.category as typeof VALID_CATEGORIES[number])) {
          console.warn(`Invalid category "${section.category}" mapped to "efficiency"`);
          section.category = 'efficiency';
        }

        // Fix invalid severity
        if (section.severity && !VALID_SEVERITIES.includes(section.severity as typeof VALID_SEVERITIES[number])) {
          console.warn(`Invalid severity "${section.severity}" mapped to "medium"`);
          section.severity = 'medium';
        }

        // Ensure required fields exist
        if (!section.id) section.id = crypto.randomUUID();
        if (!section.issues) section.issues = [];
        if (!Array.isArray(section.issues)) section.issues = [String(section.issues)];

        return section;
      });
  }

  // Sanitize missingElements array
  if (Array.isArray(obj.missingElements)) {
    obj.missingElements = obj.missingElements
      .filter((el): el is Record<string, unknown> => el !== null && typeof el === 'object')
      .map((el) => {
        if (el.importance && !VALID_SEVERITIES.includes(el.importance as typeof VALID_SEVERITIES[number])) {
          el.importance = 'medium';
        }
        return el;
      });
  }

  // Ensure scores exist and are within bounds
  if (obj.scores && typeof obj.scores === 'object') {
    const scores = obj.scores as Record<string, unknown>;
    const scoreFields = ['clarity', 'consistency', 'completeness', 'engagement', 'safety', 'overall'];
    for (const field of scoreFields) {
      if (typeof scores[field] !== 'number' || scores[field] < 1 || scores[field] > 10) {
        scores[field] = 5;
      }
    }
  }

  // Sanitize topPriorities - must be array of strings
  if (Array.isArray(obj.topPriorities)) {
    obj.topPriorities = obj.topPriorities
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          // Try to extract a string from the object
          const itemObj = item as Record<string, unknown>;
          return itemObj.priority || itemObj.description || itemObj.text || itemObj.title || JSON.stringify(item);
        }
        return String(item);
      })
      .filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  // Sanitize agentProfile
  if (obj.agentProfile && typeof obj.agentProfile === 'object') {
    const profile = obj.agentProfile as Record<string, unknown>;

    // Ensure strengths is array of strings
    if (Array.isArray(profile.strengths)) {
      profile.strengths = profile.strengths
        .map((s) => typeof s === 'string' ? s : (s && typeof s === 'object' ? JSON.stringify(s) : String(s)))
        .filter((s): s is string => typeof s === 'string' && s.length > 0);
    } else {
      profile.strengths = [];
    }

    // Ensure concerns is array of strings
    if (Array.isArray(profile.concerns)) {
      profile.concerns = profile.concerns
        .map((c) => typeof c === 'string' ? c : (c && typeof c === 'object' ? JSON.stringify(c) : String(c)))
        .filter((c): c is string => typeof c === 'string' && c.length > 0);
    } else {
      profile.concerns = [];
    }

    // Ensure string fields exist
    if (typeof profile.detectedMission !== 'string') profile.detectedMission = '';
    if (typeof profile.targetAudience !== 'string') profile.targetAudience = '';
    if (typeof profile.tone !== 'string') profile.tone = '';
  }

  // Sanitize inconsistencies
  if (Array.isArray(obj.inconsistencies)) {
    obj.inconsistencies = obj.inconsistencies
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .map((item) => {
        if (!item.id) item.id = crypto.randomUUID();
        if (typeof item.description !== 'string') item.description = '';
        if (typeof item.suggestion !== 'string') item.suggestion = '';
        if (Array.isArray(item.locations)) {
          item.locations = item.locations.map((l) => typeof l === 'string' ? l : String(l));
        } else {
          item.locations = [];
        }
        return item;
      });
  }

  // Ensure overallFeedback is a string
  if (typeof obj.overallFeedback !== 'string') {
    obj.overallFeedback = typeof obj.overallFeedback === 'object'
      ? JSON.stringify(obj.overallFeedback)
      : String(obj.overallFeedback || '');
  }

  return obj;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = AnalyzeRequestSchema.parse(body);

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Separate image and text feedback
    const imageFeedback = validatedData.feedback.filter(
      (item): item is ImageFeedback => item.type === 'image'
    );
    const textFeedback = validatedData.feedback
      .filter((item) => item.type === 'text')
      .map((item) => item.content);

    // Build user prompt
    const userPrompt = buildAnalysisUserPrompt(validatedData.prompt, textFeedback);

    // Initialize Anthropic client
    const client = new AnthropicClient(apiKey);

    // Call Claude API with retry logic
    const rawAnalysisData = await client.analyzePromptWithRetry(
      ANALYSIS_SYSTEM_PROMPT,
      RETRY_SYSTEM_PROMPT,
      userPrompt,
      imageFeedback,
      parseAnalysisResponse
    );

    // Sanitize data before Zod validation (fix invalid categories, etc.)
    const sanitizedData = sanitizeAnalysisData(rawAnalysisData);

    // Validate with Zod
    const zodValidatedAnalysis = AnalysisResultSchema.parse(sanitizedData);

    // Validate that originalText matches exist in the prompt
    const { validatedAnalysis, filteredCount, filteredSections } = validateOriginalTextMatches(
      validatedData.prompt,
      zodValidatedAnalysis
    );

    // Log if sections were filtered
    if (filteredCount > 0) {
      console.log(`Filtered ${filteredCount} sections with invalid originalText`);
    }

    // Add timestamp and metadata
    const result = {
      ...validatedAnalysis,
      timestamp: Date.now(),
      _meta: {
        filteredSectionsCount: filteredCount,
        filteredSections: filteredSections,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis error:', error);

    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to analyze prompt',
      },
      { status: 500 }
    );
  }
}
