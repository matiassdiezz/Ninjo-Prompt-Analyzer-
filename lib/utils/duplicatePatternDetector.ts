/**
 * Duplicate Pattern Detector - Detects if a learning from chat response
 * already exists in the knowledge base
 */

import type { KnowledgeEntry } from '@/types/prompt';
import type { ExtractedLearning } from './learningExtractor';

export interface DuplicateMatch {
  existingLearning: KnowledgeEntry;
  newLearning: ExtractedLearning;
  similarity: number;
  reason: string;
}

/**
 * Extracts keywords from text for comparison
 */
function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\sáéíóúñ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);
  
  const stopWords = new Set(['para', 'que', 'con', 'por', 'como', 'este', 'esta', 'esto', 'the', 'and', 'for', 'with', 'self', 'serve']);
  return words.filter(w => !stopWords.has(w));
}

/**
 * Calculates similarity between two text strings
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);
  
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  // Count matching keywords
  const matches = keywords1.filter(k1 => 
    keywords2.some(k2 => k1.includes(k2) || k2.includes(k1))
  );
  
  // Jaccard similarity
  const union = new Set([...keywords1, ...keywords2]);
  return matches.length / union.size;
}

/**
 * Checks if a new learning is similar to an existing one
 */
function areLearningsSimilar(
  newLearning: ExtractedLearning,
  existingLearning: KnowledgeEntry,
  threshold: number = 0.5
): { similar: boolean; similarity: number; reason: string } {
  // Compare patterns/descriptions
  const patternSimilarity = calculateTextSimilarity(
    newLearning.pattern,
    existingLearning.title + ' ' + existingLearning.description
  );
  
  const suggestionSimilarity = calculateTextSimilarity(
    newLearning.suggestion,
    existingLearning.description
  );
  
  const maxSimilarity = Math.max(patternSimilarity, suggestionSimilarity);
  
  if (maxSimilarity >= threshold) {
    let reason = '';
    if (patternSimilarity >= threshold) {
      reason = `El patrón detectado es muy similar al existente "${existingLearning.title}"`;
    } else {
      reason = `La sugerencia es muy similar a "${existingLearning.title}"`;
    }
    
    return {
      similar: true,
      similarity: maxSimilarity,
      reason,
    };
  }
  
  // Check for exact category matches with high keyword overlap
  if (newLearning.category && existingLearning.tags.includes(newLearning.category)) {
    const combinedSimilarity = (patternSimilarity + suggestionSimilarity) / 2;
    if (combinedSimilarity >= 0.3) {
      return {
        similar: true,
        similarity: combinedSimilarity,
        reason: `Mismo tipo de problema (${newLearning.category}) con contenido similar`,
      };
    }
  }
  
  return {
    similar: false,
    similarity: maxSimilarity,
    reason: '',
  };
}

/**
 * Detects duplicate patterns in extracted learnings
 */
export function detectDuplicatePatterns(
  newLearnings: ExtractedLearning[],
  existingKnowledge: KnowledgeEntry[],
  threshold: number = 0.5
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];
  
  for (const newLearning of newLearnings) {
    for (const existing of existingKnowledge) {
      const { similar, similarity, reason } = areLearningsSimilar(
        newLearning,
        existing,
        threshold
      );
      
      if (similar) {
        duplicates.push({
          existingLearning: existing,
          newLearning,
          similarity,
          reason,
        });
        break; // Only match to first duplicate found
      }
    }
  }
  
  return duplicates;
}

/**
 * Generates testing suggestions based on historical decisions
 */
export function generateTestingSuggestions(
  currentPrompt: string,
  decisions: Array<{
    decision: 'accepted' | 'rejected' | 'modified';
    category: string;
    originalText: string;
    suggestedText: string;
    justification: string;
  }>,
  limit: number = 5
): Array<{
  category: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  basedOn: string;
}> {
  const suggestions: Array<{
    category: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    basedOn: string;
  }> = [];
  
  // Group decisions by category
  const decisionsByCategory = new Map<string, typeof decisions>();
  for (const decision of decisions) {
    if (!decisionsByCategory.has(decision.category)) {
      decisionsByCategory.set(decision.category, []);
    }
    decisionsByCategory.get(decision.category)!.push(decision);
  }
  
  // Generate suggestions based on rejected decisions (common mistakes)
  for (const [category, categoryDecisions] of decisionsByCategory) {
    const rejected = categoryDecisions.filter(d => d.decision === 'rejected');
    
    if (rejected.length >= 2) {
      // This is a common mistake
      const commonIssue = rejected[0].justification;
      suggestions.push({
        category,
        suggestion: `Verificar que no ocurra: ${commonIssue}`,
        priority: 'high',
        basedOn: `${rejected.length} veces rechazado en proyectos anteriores`,
      });
    }
  }
  
  // Generate suggestions based on frequently modified decisions
  for (const [category, categoryDecisions] of decisionsByCategory) {
    const modified = categoryDecisions.filter(d => d.decision === 'modified');
    
    if (modified.length >= 2) {
      suggestions.push({
        category,
        suggestion: `Revisar cuidadosamente la sección de ${category} - suele necesitar ajustes`,
        priority: 'medium',
        basedOn: `${modified.length} veces modificado en proyectos anteriores`,
      });
    }
  }
  
  // Check if current prompt might have similar issues
  const promptKeywords = extractKeywords(currentPrompt);
  for (const decision of decisions) {
    if (decision.decision === 'rejected') {
      const issueKeywords = extractKeywords(decision.originalText);
      const overlap = promptKeywords.filter(pk => 
        issueKeywords.some(ik => pk.includes(ik) || ik.includes(pk))
      );
      
      if (overlap.length >= 2) {
        suggestions.push({
          category: decision.category,
          suggestion: `Posible problema detectado: ${decision.justification}`,
          priority: 'high',
          basedOn: 'Patrón similar a error previo',
        });
      }
    }
  }
  
  // Sort by priority and limit
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return suggestions
    .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
    .slice(0, limit);
}
