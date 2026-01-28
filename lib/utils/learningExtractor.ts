/**
 * Learning Extractor - Parses chat responses for "📝 PARA DOCUMENTAR" sections
 * and extracts structured learning data for the Ninjo Memory system.
 */

export interface ExtractedLearning {
  pattern: string;
  suggestion: string;
  priority: 'Alta' | 'Media' | 'Baja';
  frequency: 'Único' | 'Ocasional' | 'Recurrente';
  category?: string;
  sourceMessageId?: string;
  projectId?: string;
}

/**
 * Extracts learnings from a chat response that contains "PARA DOCUMENTAR" sections.
 *
 * Expected format in response:
 * ## 📝 PARA DOCUMENTAR (Self-Serve)
 * ### Patrón detectado:
 * [description]
 * ### Sugerencia para Self-Serve:
 * [suggestion]
 * ### Prioridad: [Alta/Media/Baja]
 * ### Frecuencia: [Único/Ocasional/Recurrente]
 */
export function extractLearningsFromChatResponse(response: string): ExtractedLearning[] {
  const learnings: ExtractedLearning[] = [];

  // Find all "PARA DOCUMENTAR" sections (with or without emoji, with variations)
  const documentarRegex = /##\s*📝?\s*PARA DOCUMENTAR[^\n]*\n([\s\S]*?)(?=(?:^##[^#]|^---|\*{3,}|$))/gmi;

  let match;
  while ((match = documentarRegex.exec(response)) !== null) {
    const sectionContent = match[1];

    const learning = parseLearningSection(sectionContent);
    if (learning) {
      learnings.push(learning);
    }
  }

  // Also try to find inline patterns in QA output format
  // ### 📝 Para documentar (mejoras al Self-Serve)
  const qaDocumentarRegex = /###\s*📝?\s*Para documentar[^\n]*\n([\s\S]*?)(?=(?:^##[^#]|^###[^#]|^---|\*{3,}|$))/gmi;

  while ((match = qaDocumentarRegex.exec(response)) !== null) {
    const sectionContent = match[1];

    // QA format is simpler - just bullet points
    const bulletPoints = sectionContent.match(/^[-•*]\s*(.+)$/gm);
    if (bulletPoints && bulletPoints.length > 0) {
      const pattern = bulletPoints.map(b => b.replace(/^[-•*]\s*/, '')).join('. ');
      learnings.push({
        pattern: pattern,
        suggestion: 'Mejorar el Self-Serve para evitar este patrón',
        priority: 'Media',
        frequency: 'Ocasional',
        category: 'qa_feedback',
      });
    }
  }

  return learnings;
}

/**
 * Parses a single "PARA DOCUMENTAR" section content into an ExtractedLearning object.
 */
function parseLearningSection(content: string): ExtractedLearning | null {
  // Extract pattern
  const patternMatch = content.match(/###?\s*Patrón(?:\s+detectado)?:\s*\n?([\s\S]*?)(?=###|\*{3,}|$)/i);
  const pattern = patternMatch ? cleanText(patternMatch[1]) : '';

  // Extract suggestion
  const suggestionMatch = content.match(/###?\s*Sugerencia(?:\s+para\s+Self-Serve)?:\s*\n?([\s\S]*?)(?=###|\*{3,}|$)/i);
  const suggestion = suggestionMatch ? cleanText(suggestionMatch[1]) : '';

  // Extract priority
  const priorityMatch = content.match(/###?\s*Prioridad:\s*\[?(Alta|Media|Baja)\]?/i);
  const priority = priorityMatch
    ? (priorityMatch[1].charAt(0).toUpperCase() + priorityMatch[1].slice(1).toLowerCase()) as 'Alta' | 'Media' | 'Baja'
    : 'Media';

  // Extract frequency
  const frequencyMatch = content.match(/###?\s*Frecuencia:\s*\[?(Único|Ocasional|Recurrente)\]?/i);
  const frequency = frequencyMatch
    ? (frequencyMatch[1].charAt(0).toUpperCase() + frequencyMatch[1].slice(1).toLowerCase()) as 'Único' | 'Ocasional' | 'Recurrente'
    : 'Ocasional';

  // Only return if we have at least a pattern or suggestion
  if (!pattern && !suggestion) {
    return null;
  }

  return {
    pattern: pattern || 'Patrón no especificado',
    suggestion: suggestion || 'Sin sugerencia específica',
    priority,
    frequency,
  };
}

/**
 * Cleans extracted text by removing extra whitespace, markdown formatting, etc.
 */
function cleanText(text: string): string {
  return text
    .replace(/^\s*[-•*]\s*/gm, '') // Remove bullet points at start of lines
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/\n{2,}/g, '\n') // Collapse multiple newlines
    .trim();
}

/**
 * Detects the category of a learning based on its content.
 */
export function detectCategory(learning: ExtractedLearning): string {
  const text = `${learning.pattern} ${learning.suggestion}`.toLowerCase();

  if (text.includes('tono') || text.includes('formal') || text.includes('casual') || text.includes('personalidad')) {
    return 'tono';
  }
  if (text.includes('saludo') || text.includes('greeting') || text.includes('bienvenida')) {
    return 'saludo';
  }
  if (text.includes('keyword') || text.includes('trigger') || text.includes('palabra clave')) {
    return 'keywords';
  }
  if (text.includes('calificación') || text.includes('lead') || text.includes('pregunta')) {
    return 'calificacion';
  }
  if (text.includes('objeción') || text.includes('precio') || text.includes('costo')) {
    return 'objeciones';
  }
  if (text.includes('flujo') || text.includes('conversación') || text.includes('happy path')) {
    return 'flujo';
  }
  if (text.includes('cierre') || text.includes('agenda') || text.includes('llamada') || text.includes('vsl')) {
    return 'conversion';
  }
  if (text.includes('emoji') || text.includes('formato') || text.includes('mensaje')) {
    return 'formato';
  }
  if (text.includes('knowledge') || text.includes('base') || text.includes('información')) {
    return 'knowledge_base';
  }

  return 'general';
}

/**
 * Checks if a chat response contains any documentable learnings.
 */
export function hasLearnings(response: string): boolean {
  return /📝\s*PARA DOCUMENTAR|Para documentar.*Self-Serve/i.test(response);
}
