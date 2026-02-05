/**
 * Knowledge Categories - Constants and utilities for categorizing learnings
 */

import type { KnowledgeCategory } from '@/types/prompt';

export const KNOWLEDGE_CATEGORIES: Record<
  KnowledgeCategory,
  { label: string; color: string; icon: string }
> = {
  tono: { label: 'Tono', color: '#8B5CF6', icon: 'Smile' },
  saludo: { label: 'Saludos', color: '#EC4899', icon: 'MessageCircle' },
  keywords: { label: 'Keywords', color: '#F59E0B', icon: 'Key' },
  calificacion: { label: 'Calificación', color: '#10B981', icon: 'CheckCircle' },
  objeciones: { label: 'Objeciones', color: '#EF4444', icon: 'ShieldAlert' },
  flujo: { label: 'Flujo', color: '#3B82F6', icon: 'GitBranch' },
  conversion: { label: 'Conversión', color: '#14B8A6', icon: 'Target' },
  formato: { label: 'Formato', color: '#6366F1', icon: 'Layout' },
  knowledge_base: { label: 'Knowledge Base', color: '#A855F7', icon: 'Database' },
  general: { label: 'General', color: '#6B7280', icon: 'Tag' },
} as const;

/**
 * Infers a category from existing tags
 */
export function inferCategoryFromTags(tags: string[]): KnowledgeCategory {
  const lowerTags = tags.map((t) => t.toLowerCase());

  for (const cat of Object.keys(KNOWLEDGE_CATEGORIES) as KnowledgeCategory[]) {
    if (lowerTags.includes(cat)) {
      return cat;
    }
  }

  // Also check for common tag variations
  if (lowerTags.some((t) => t.includes('tono') || t.includes('personalidad'))) {
    return 'tono';
  }
  if (lowerTags.some((t) => t.includes('saludo') || t.includes('greeting'))) {
    return 'saludo';
  }
  if (lowerTags.some((t) => t.includes('keyword') || t.includes('trigger'))) {
    return 'keywords';
  }
  if (lowerTags.some((t) => t.includes('calificacion') || t.includes('lead'))) {
    return 'calificacion';
  }
  if (lowerTags.some((t) => t.includes('objecion') || t.includes('precio'))) {
    return 'objeciones';
  }
  if (lowerTags.some((t) => t.includes('flujo') || t.includes('conversacion'))) {
    return 'flujo';
  }
  if (lowerTags.some((t) => t.includes('conversion') || t.includes('cierre'))) {
    return 'conversion';
  }
  if (lowerTags.some((t) => t.includes('formato') || t.includes('emoji'))) {
    return 'formato';
  }
  if (lowerTags.some((t) => t.includes('knowledge') || t.includes('base'))) {
    return 'knowledge_base';
  }

  return 'general';
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: KnowledgeCategory) {
  return KNOWLEDGE_CATEGORIES[category] || KNOWLEDGE_CATEGORIES.general;
}

/**
 * Get all category keys in display order
 */
export function getCategoryKeys(): KnowledgeCategory[] {
  return Object.keys(KNOWLEDGE_CATEGORIES) as KnowledgeCategory[];
}
