/**
 * Change Applier - Pure functions for applying parsed changes to a prompt.
 * Each action type has its own function returning a consistent ApplyResult.
 */

import type { ParsedChange } from '@/lib/utils/changeParser';
import { findTextInPrompt, resolveInsertionPoint } from '@/lib/utils/textMatcher';
import { parseSemanticSections } from '@/lib/semanticParser';

export interface ApplyResult {
  success: boolean;
  newPrompt: string;
  message: string;
}

/**
 * Find a section by name using fuzzy matching on section titles/tags.
 */
function findSectionByName(prompt: string, sectionName: string) {
  const sections = parseSemanticSections(prompt);
  const sectionLower = sectionName.toLowerCase()
    .replace(/\s*\(.*\)\s*/g, '')
    .trim();

  return sections.find(s => {
    const titleLower = s.title.toLowerCase();
    const tagLower = s.tagName?.toLowerCase() || '';
    if (titleLower === sectionLower || tagLower === sectionLower) return true;
    if (titleLower.includes(sectionLower) && sectionLower.length > 3) return true;
    if (sectionLower.includes(titleLower) && titleLower.length > 3) return true;
    return false;
  });
}

export function applyReplace(prompt: string, change: ParsedChange): ApplyResult {
  if (!change.beforeText || !change.afterText) {
    return { success: false, newPrompt: prompt, message: 'Faltan textos para reemplazar' };
  }

  const match = findTextInPrompt(prompt, change.beforeText);

  // Direct match with good confidence
  if (match.found && match.confidence >= 0.85) {
    const newPrompt =
      prompt.substring(0, match.startIndex) +
      change.afterText +
      prompt.substring(match.endIndex);
    return { success: true, newPrompt, message: 'Cambio aplicado' };
  }

  // Fallback: find section by name and replace its content
  if (change.section) {
    const matchingSection = findSectionByName(prompt, change.section);
    if (matchingSection) {
      const newPrompt =
        prompt.substring(0, matchingSection.startIndex) +
        change.afterText +
        prompt.substring(matchingSection.endIndex);
      return { success: true, newPrompt, message: 'Sección reemplazada completa' };
    }
  }

  return { success: false, newPrompt: prompt, message: 'No se encontró el texto original en el prompt' };
}

export function applyInsert(prompt: string, change: ParsedChange): ApplyResult {
  if (!change.afterText) {
    return { success: false, newPrompt: prompt, message: 'Falta texto para insertar' };
  }
  if (change.location) {
    const insertResult = resolveInsertionPoint(prompt, change.location, change.section);
    if (!insertResult.found) {
      return { success: false, newPrompt: prompt, message: 'No se encontró la ubicación para insertar' };
    }
    const newPrompt =
      prompt.substring(0, insertResult.insertionIndex) +
      '\n' + change.afterText +
      prompt.substring(insertResult.insertionIndex);
    return { success: true, newPrompt, message: 'Texto insertado' };
  }
  // Fallback: append to end
  return { success: true, newPrompt: prompt + '\n' + change.afterText, message: 'Texto insertado al final' };
}

export function applyDelete(prompt: string, change: ParsedChange): ApplyResult {
  if (!change.beforeText) {
    return { success: false, newPrompt: prompt, message: 'Falta texto a eliminar' };
  }

  const match = findTextInPrompt(prompt, change.beforeText);

  // Direct match with good confidence
  if (match.found && match.confidence >= 0.85) {
    const newPrompt =
      prompt.substring(0, match.startIndex) +
      prompt.substring(match.endIndex);
    return { success: true, newPrompt, message: 'Texto eliminado' };
  }

  // Fallback: find section by name and delete it
  if (change.section) {
    const matchingSection = findSectionByName(prompt, change.section);
    if (matchingSection) {
      const newPrompt =
        prompt.substring(0, matchingSection.startIndex) +
        prompt.substring(matchingSection.endIndex);
      return { success: true, newPrompt, message: 'Sección eliminada completa' };
    }
  }

  return { success: false, newPrompt: prompt, message: 'No se encontró el texto a eliminar' };
}

export function applyMove(prompt: string, change: ParsedChange): ApplyResult {
  if (!change.beforeText || !change.location) {
    return { success: false, newPrompt: prompt, message: 'Faltan datos para mover el bloque' };
  }
  const blockMatch = findTextInPrompt(prompt, change.beforeText);
  if (!blockMatch.found) {
    return { success: false, newPrompt: prompt, message: 'No se encontró el bloque a mover' };
  }
  // Step 1: Remove from original position
  const withoutBlock =
    prompt.substring(0, blockMatch.startIndex) +
    prompt.substring(blockMatch.endIndex);
  // Step 2: Find new location in modified prompt
  const locationResult = resolveInsertionPoint(withoutBlock, change.location, change.section);
  if (!locationResult.found) {
    return { success: false, newPrompt: prompt, message: 'No se encontró la nueva ubicación' };
  }
  const newPrompt =
    withoutBlock.substring(0, locationResult.insertionIndex) +
    '\n' + change.beforeText +
    withoutBlock.substring(locationResult.insertionIndex);
  return { success: true, newPrompt, message: 'Bloque movido' };
}

/**
 * Dispatch a single change to the appropriate handler.
 */
export function applyChange(prompt: string, change: ParsedChange): ApplyResult {
  switch (change.action) {
    case 'replace':
      return applyReplace(prompt, change);
    case 'insert':
      return applyInsert(prompt, change);
    case 'delete':
      return applyDelete(prompt, change);
    case 'move':
      return applyMove(prompt, change);
    case 'keep':
      return { success: true, newPrompt: prompt, message: 'Sección mantenida' };
    default:
      return { success: false, newPrompt: prompt, message: 'Acción desconocida' };
  }
}

/**
 * Apply multiple changes sequentially, accumulating results.
 */
export function applyAllChanges(
  prompt: string,
  changes: ParsedChange[]
): { newPrompt: string; appliedCount: number; failedCount: number } {
  let updatedPrompt = prompt;
  let appliedCount = 0;
  let failedCount = 0;

  for (const change of changes) {
    const result = applyChange(updatedPrompt, change);
    if (result.success) {
      updatedPrompt = result.newPrompt;
      appliedCount++;
    } else {
      failedCount++;
    }
  }

  return { newPrompt: updatedPrompt, appliedCount, failedCount };
}
