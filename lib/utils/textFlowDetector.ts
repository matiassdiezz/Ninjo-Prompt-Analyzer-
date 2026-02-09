import { hasFlowInPrompt } from '@/lib/utils/flowParser';
import { detectAsciiFlow } from '@/lib/utils/asciiFlowParser';

export interface TextFlowDetection {
  name: string;           // "RESOURCE_FLOW", "DIRECT_FLOW"
  rawText: string;        // Texto completo de la seccion
  startLine: number;
  endLine: number;
  confidence: number;     // 0-1
  stepCount: number;      // Pasos numerados detectados
}

// Header patterns that indicate a flow section
const FLOW_HEADER_PATTERN = /^(#{1,3})\s+(.+)$/;
const FLOW_NAME_KEYWORDS = /\b(flow|flujo|funnel|secuencia|embudo|sequence)\b/i;
const FLOW_SUFFIX_PATTERN = /[_-](FLOW|FLUJO)\b/i;
const FLOW_PREFIX_PATTERN = /\b(FLOW|FLUJO)[_-]/i;

// Content scoring patterns - EXPANDED for more flexibility
const NUMBERED_STEP = /^\s*(\d+[\.\)\-:\s]|\d+\s*[\.\)\-])\s+/;
const LETTER_STEP = /^\s*([a-zA-Z][\.\)\-]|[ivxIVX]+[\.\)\-])\s+/;
const BULLET_STEP = /^\s*[\-\*•▸▹▶]\s+/;
const BOLD_LABEL = /\*\*[^*]+\*\*\s*[:\-]/;
const CONDITIONAL = /\b(si |si\/no|if |else|entonces|otherwise|cuando|depende|seg[úu]n|en caso de)\b/i;
const ARROW_CONNECTOR = /[→➡—>▸▹▶➜⇒⟶←↔⇢]/;
const FLOW_REFERENCE = /\b(move to|ir a|pasar a|go to|continuar con|switch to|redirigir|transferir)\s+\w*[_-]?(flow|flujo|step|paso|stage|etapa)\b/i;
const QUALIFICATION_KEYWORDS = /\b(califica|cualifica|qualify|descalifica|disqualify|lead|prospect|venta|sale|cierre|close|seguimiento|follow.?up|conversion|convertir|objeci[oó]n|objection|inter[eé]s|interested)\b/i;
const TRANSITION_WORDS = /\b(primero|segundo|tercero|luego|despu[eé]s|a continuaci[oó]n|finalmente|por [úu]ltimo|iniciar|comenzar|empezar|terminar|finalizar)\b/i;
const EMOJI_INDICATORS = /[✅❌✓✗⬇️⬆️➡️↘️⚡🔥⭐💡📝🔍]/u;

// Guards: skip sections that already have structured flow
const FLOW_TAG_PATTERN = /<flow>/i;
const ASCII_BOX_CHARS = /[┌┐└┘│─╔╗╚╝║═]|(\+[-=]+\+)/;

/**
 * Detects text-based flow sections in a prompt.
 * Returns array of detected flows sorted by confidence (desc).
 */
export function detectTextFlows(prompt: string): TextFlowDetection[] {
  if (!prompt || prompt.length < 20) return [];

  // Guard: if prompt already has <flow> JSON tags, skip entirely
  if (hasFlowInPrompt(prompt)) return [];

  const lines = prompt.split('\n');
  const sections = extractFlowSections(lines);

  return sections
    .map(section => scoreSection(section, lines))
    .filter(detection => detection.confidence > 0.5)
    .sort((a, b) => b.confidence - a.confidence);
}

interface RawSection {
  name: string;
  headerLevel: number;
  startLine: number;
  endLine: number;
}

/**
 * Finds markdown headers that look like flow sections and extracts their content boundaries.
 */
function extractFlowSections(lines: string[]): RawSection[] {
  const sections: RawSection[] = [];

  for (let i = 0; i < lines.length; i++) {
    const headerMatch = lines[i].match(FLOW_HEADER_PATTERN);
    if (!headerMatch) continue;

    const level = headerMatch[1].length;
    const title = headerMatch[2].trim();

    // Check if this header looks like a flow
    const isFlowHeader =
      FLOW_NAME_KEYWORDS.test(title) ||
      FLOW_SUFFIX_PATTERN.test(title) ||
      FLOW_PREFIX_PATTERN.test(title);

    if (!isFlowHeader) continue;

    // Find end of section: next header of same or higher level, or end of text
    let endLine = lines.length - 1;
    for (let j = i + 1; j < lines.length; j++) {
      const nextHeader = lines[j].match(FLOW_HEADER_PATTERN);
      if (nextHeader && nextHeader[1].length <= level) {
        endLine = j - 1;
        break;
      }
    }

    // Trim trailing empty lines
    while (endLine > i && lines[endLine].trim() === '') {
      endLine--;
    }

    // Need at least some content after the header
    if (endLine <= i) continue;

    // Extract clean name from title
    const name = title
      .replace(/^#+\s*/, '')
      .replace(/[:\-–—]\s*$/, '')
      .trim();

    sections.push({
      name,
      headerLevel: level,
      startLine: i,
      endLine,
    });
  }

  return sections;
}

/**
 * Scores a section for confidence that it contains a conversational flow.
 * IMPROVED: More flexible pattern matching with multiple step formats
 */
function scoreSection(section: RawSection, lines: string[]): TextFlowDetection {
  const sectionLines = lines.slice(section.startLine + 1, section.endLine + 1);
  const sectionText = sectionLines.join('\n');

  let confidence = 0;
  let stepCount = 0;

  // Guard: skip if section contains <flow> tags or ASCII art
  if (FLOW_TAG_PATTERN.test(sectionText)) {
    return { name: section.name, rawText: '', startLine: section.startLine, endLine: section.endLine, confidence: 0, stepCount: 0 };
  }

  const hasAscii = sectionLines.some(line => ASCII_BOX_CHARS.test(line));
  if (hasAscii) {
    const asciiLineCount = sectionLines.filter(line => ASCII_BOX_CHARS.test(line)).length;
    if (asciiLineCount >= 3) {
      return { name: section.name, rawText: '', startLine: section.startLine, endLine: section.endLine, confidence: 0, stepCount: 0 };
    }
  }

  // Count steps in ANY format (numbered, letter, bullet)
  const numberedSteps = sectionLines.filter(line => NUMBERED_STEP.test(line)).length;
  const letterSteps = sectionLines.filter(line => LETTER_STEP.test(line)).length;
  const bulletSteps = sectionLines.filter(line => BULLET_STEP.test(line)).length;
  stepCount = Math.max(numberedSteps, letterSteps, bulletSteps);

  // Score based on step format (more weight to clear sequential formats)
  if (numberedSteps >= 2) confidence += 0.35;
  else if (numberedSteps >= 1) confidence += 0.15;
  else if (letterSteps >= 2) confidence += 0.25;
  else if (bulletSteps >= 2) confidence += 0.20;

  // Bonus for mixed formats (indicates structured content)
  if ((numberedSteps > 0 && letterSteps > 0) || (numberedSteps > 0 && bulletSteps > 0)) {
    confidence += 0.05;
  }

  // Bold labels (e.g. **Step 1**: ...)
  const boldLabels = sectionLines.filter(line => BOLD_LABEL.test(line)).length;
  if (boldLabels >= 1) confidence += 0.15;

  // Conditionals and decision points
  const hasConditionals = sectionLines.some(line => CONDITIONAL.test(line));
  if (hasConditionals) confidence += 0.15;

  // Arrow connectors (visual flow indicators)
  const hasArrows = sectionLines.some(line => ARROW_CONNECTOR.test(line));
  if (hasArrows) confidence += 0.10;

  // References to other flows/stages
  const hasFlowRefs = sectionLines.some(line => FLOW_REFERENCE.test(line));
  if (hasFlowRefs) confidence += 0.10;

  // Qualification/action keywords
  const hasQualKeywords = sectionLines.some(line => QUALIFICATION_KEYWORDS.test(line));
  if (hasQualKeywords) confidence += 0.10;

  // Transition words (first, then, finally)
  const hasTransitions = sectionLines.some(line => TRANSITION_WORDS.test(line));
  if (hasTransitions) confidence += 0.08;

  // Emoji indicators (modern prompts)
  const hasEmojis = sectionLines.some(line => EMOJI_INDICATORS.test(line));
  if (hasEmojis) confidence += 0.05;

  // Bonus: 3+ sequential steps of any format
  if (stepCount >= 3) confidence += 0.05;
  if (stepCount >= 5) confidence += 0.05; // Extra bonus for substantial flows

  // Cap at 1.0
  confidence = Math.min(confidence, 1.0);

  // Build raw text including the header
  const rawText = lines.slice(section.startLine, section.endLine + 1).join('\n');

  return {
    name: section.name,
    rawText,
    startLine: section.startLine,
    endLine: section.endLine,
    confidence,
    stepCount,
  };
}
