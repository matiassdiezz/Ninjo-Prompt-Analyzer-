import type { AnalysisSection, SeverityLevel } from '@/types/analysis';
import type { SemanticSection } from './semanticParser';

export interface SectionWithSuggestions {
  section: SemanticSection;
  suggestions: AnalysisSection[];
  highestSeverity: SeverityLevel | null;
}

/**
 * Maps suggestions (AnalysisSection) to semantic sections based on character indices overlap.
 * A suggestion belongs to a section if their ranges overlap.
 */
export function mapSuggestionsToSections(
  suggestions: AnalysisSection[],
  sections: SemanticSection[]
): Map<string, AnalysisSection[]> {
  const mapping = new Map<string, AnalysisSection[]>();

  // Initialize empty arrays for each section
  for (const section of sections) {
    mapping.set(section.id, []);
  }

  // Map each suggestion to overlapping sections
  for (const suggestion of suggestions) {
    for (const section of sections) {
      // Check if suggestion range overlaps with section range
      if (rangesOverlap(
        suggestion.startIndex,
        suggestion.endIndex,
        section.startIndex,
        section.endIndex
      )) {
        const existing = mapping.get(section.id) || [];
        existing.push(suggestion);
        mapping.set(section.id, existing);
      }
    }
  }

  return mapping;
}

/**
 * Check if two ranges overlap
 */
function rangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && end1 > start2;
}

/**
 * Get the highest severity from a list of suggestions
 */
export function getHighestSeverity(suggestions: AnalysisSection[]): SeverityLevel | null {
  if (suggestions.length === 0) return null;

  const severityOrder: SeverityLevel[] = ['critical', 'high', 'medium', 'low'];

  for (const severity of severityOrder) {
    if (suggestions.some(s => s.severity === severity)) {
      return severity;
    }
  }

  return 'low';
}

/**
 * Get sections enriched with their mapped suggestions
 */
export function enrichSectionsWithSuggestions(
  sections: SemanticSection[],
  suggestions: AnalysisSection[]
): SectionWithSuggestions[] {
  const mapping = mapSuggestionsToSections(suggestions, sections);

  return sections.map(section => {
    const sectionSuggestions = mapping.get(section.id) || [];
    return {
      section: {
        ...section,
        suggestionCount: sectionSuggestions.length,
        highestSeverity: getHighestSeverity(sectionSuggestions) ?? undefined,
      },
      suggestions: sectionSuggestions,
      highestSeverity: getHighestSeverity(sectionSuggestions),
    };
  });
}

/**
 * Find which section a cursor position falls within
 */
export function findSectionAtPosition(
  sections: SemanticSection[],
  charIndex: number
): SemanticSection | null {
  for (const section of sections) {
    if (charIndex >= section.startIndex && charIndex <= section.endIndex) {
      return section;
    }
  }
  return null;
}

/**
 * Get unmapped suggestions (suggestions that don't fall within any section)
 */
export function getUnmappedSuggestions(
  suggestions: AnalysisSection[],
  sections: SemanticSection[]
): AnalysisSection[] {
  return suggestions.filter(suggestion => {
    return !sections.some(section =>
      rangesOverlap(
        suggestion.startIndex,
        suggestion.endIndex,
        section.startIndex,
        section.endIndex
      )
    );
  });
}

/**
 * Get severity badge color
 */
export function getSeverityColor(severity: SeverityLevel | null): {
  bg: string;
  text: string;
  border: string;
} {
  switch (severity) {
    case 'critical':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
    case 'high':
      return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' };
    case 'medium':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' };
    case 'low':
      return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
  }
}

/**
 * Sort suggestions by severity (most critical first)
 */
export function sortBySeverity(suggestions: AnalysisSection[]): AnalysisSection[] {
  const severityOrder: Record<SeverityLevel, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...suggestions].sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity]
  );
}
