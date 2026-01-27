export type SectionType = 'xml_tag' | 'markdown_header' | 'colon_header' | 'paragraph' | 'list' | 'code_block';
export type InferredPurpose = 'instructions' | 'examples' | 'persona' | 'constraints' | 'context' | 'output_format' | 'unknown';

export interface SemanticSection {
  id: string;
  type: SectionType;
  title: string;
  tagName?: string; // For XML tags
  inferredPurpose: InferredPurpose;
  startLine: number;
  endLine: number;
  startIndex: number;
  endIndex: number;
  content: string;
  suggestionCount: number;
  highestSeverity?: 'critical' | 'high' | 'medium' | 'low';
}

// Keywords for inferring section purpose
const PURPOSE_KEYWORDS: Record<InferredPurpose, string[]> = {
  instructions: ['instructions', 'instrucciones', 'task', 'tarea', 'steps', 'pasos', 'do', 'hacer', 'rules', 'reglas'],
  examples: ['example', 'ejemplo', 'sample', 'muestra', 'demo', 'case', 'caso'],
  persona: ['persona', 'role', 'rol', 'character', 'personaje', 'identity', 'identidad', 'you are', 'eres'],
  constraints: ['constraint', 'restriccion', 'limit', 'limite', 'boundary', 'guardrail', 'never', 'nunca', 'dont', 'no debes'],
  context: ['context', 'contexto', 'background', 'antecedentes', 'information', 'informacion', 'about', 'sobre'],
  output_format: ['output', 'salida', 'format', 'formato', 'response', 'respuesta', 'return', 'retorna', 'structure', 'estructura'],
  unknown: [],
};

function inferPurpose(title: string, content: string): InferredPurpose {
  const searchText = `${title} ${content.substring(0, 200)}`.toLowerCase();

  for (const [purpose, keywords] of Object.entries(PURPOSE_KEYWORDS)) {
    if (purpose === 'unknown') continue;
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return purpose as InferredPurpose;
      }
    }
  }
  return 'unknown';
}

function formatTitle(text: string): string {
  // Remove markdown symbols and clean up
  return text
    .replace(/^#+\s*/, '') // Remove markdown headers
    .replace(/^\*\*(.+)\*\*:?$/, '$1') // Remove bold markers
    .replace(/:$/, '') // Remove trailing colon
    .trim();
}

interface LineInfo {
  lineIndex: number;
  startIndex: number;
  endIndex: number;
  content: string;
}

function buildLineInfo(text: string): LineInfo[] {
  const lines = text.split('\n');
  const info: LineInfo[] = [];
  let charIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    info.push({
      lineIndex: i,
      startIndex: charIndex,
      endIndex: charIndex + lines[i].length,
      content: lines[i],
    });
    charIndex += lines[i].length + 1; // +1 for newline
  }

  return info;
}

/**
 * Parses a prompt text and extracts semantic sections.
 * Detects: XML tags, Markdown headers, colon headers, and paragraph blocks.
 */
export function parseSemanticSections(text: string): SemanticSection[] {
  const sections: SemanticSection[] = [];
  const lineInfo = buildLineInfo(text);
  const usedLineRanges: Set<number> = new Set();
  let sectionCounter = 0;

  // 1. Detect code blocks (highest priority - they can contain anything)
  const codeBlockSections = detectCodeBlocks(text, lineInfo, sectionCounter);
  for (const section of codeBlockSections) {
    sections.push(section);
    for (let l = section.startLine; l <= section.endLine; l++) {
      usedLineRanges.add(l);
    }
    sectionCounter++;
  }

  // 2. Detect XML tags
  const xmlSections = detectXmlSections(text, lineInfo, sectionCounter);
  for (const section of xmlSections) {
    // Skip if any line is already used (e.g., inside a code block)
    const overlap = Array.from({ length: section.endLine - section.startLine + 1 })
      .some((_, i) => usedLineRanges.has(section.startLine + i));
    if (overlap) continue;

    sections.push(section);
    for (let l = section.startLine; l <= section.endLine; l++) {
      usedLineRanges.add(l);
    }
    sectionCounter++;
  }

  // 3. Detect Markdown headers
  const mdSections = detectMarkdownHeaders(text, lineInfo, sectionCounter, usedLineRanges);
  for (const section of mdSections) {
    sections.push(section);
    for (let l = section.startLine; l <= section.endLine; l++) {
      usedLineRanges.add(l);
    }
    sectionCounter++;
  }

  // 3. Detect colon headers (e.g., "Instructions:")
  const colonSections = detectColonHeaders(text, lineInfo, sectionCounter, usedLineRanges);
  for (const section of colonSections) {
    sections.push(section);
    for (let l = section.startLine; l <= section.endLine; l++) {
      usedLineRanges.add(l);
    }
    sectionCounter++;
  }

  // 4. Detect remaining paragraph blocks (separated by 2+ newlines)
  const paragraphSections = detectParagraphBlocks(text, lineInfo, sectionCounter, usedLineRanges);
  for (const section of paragraphSections) {
    sections.push(section);
    sectionCounter++;
  }

  // Sort by start line
  sections.sort((a, b) => a.startLine - b.startLine);

  // Re-assign IDs after sorting
  return sections.map((s, i) => ({
    ...s,
    id: `section-${i + 1}`,
  }));
}

function detectCodeBlocks(text: string, lineInfo: LineInfo[], startId: number): SemanticSection[] {
  const sections: SemanticSection[] = [];
  const lines = text.split('\n');

  let id = startId;
  let inCodeBlock = false;
  let codeBlockStart = -1;
  let codeBlockLang = '';

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const trimmedLine = line.trim();

    // Check for code block start/end (```)
    if (trimmedLine.startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        codeBlockStart = lineIndex;
        // Extract language if specified (e.g., ```javascript)
        codeBlockLang = trimmedLine.slice(3).trim();
      } else {
        // End of code block
        const content = lines.slice(codeBlockStart, lineIndex + 1).join('\n');
        const title = codeBlockLang
          ? `Código (${codeBlockLang})`
          : 'Bloque de código';

        sections.push({
          id: `section-${id++}`,
          type: 'code_block',
          title,
          inferredPurpose: 'examples',
          startLine: codeBlockStart + 1,
          endLine: lineIndex + 1,
          startIndex: lineInfo[codeBlockStart].startIndex,
          endIndex: lineInfo[lineIndex].endIndex,
          content,
          suggestionCount: 0,
        });

        inCodeBlock = false;
        codeBlockStart = -1;
        codeBlockLang = '';
      }
    }
  }

  return sections;
}

function detectXmlSections(text: string, lineInfo: LineInfo[], startId: number): SemanticSection[] {
  const sections: SemanticSection[] = [];
  const lines = text.split('\n');

  // Pattern for XML opening tags - more flexible to handle inline content
  // Matches: <tag>, <tag attr="value">, <tag>content, etc.
  const xmlOpenTagRegex = /^<([a-zA-Z_][a-zA-Z0-9_-]*)(?:\s[^>]*)?>(.*)$/;
  // Pattern for self-closing or single-line tags: <tag>content</tag>
  const singleLineTagRegex = /^<([a-zA-Z_][a-zA-Z0-9_-]*)(?:\s[^>]*)?>(.+)<\/\1>$/;

  let id = startId;
  const processedLines = new Set<number>();

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    if (processedLines.has(lineIndex)) continue;

    const line = lines[lineIndex].trim();

    // Check for single-line tags first (e.g., <tag>content</tag>)
    const singleLineMatch = line.match(singleLineTagRegex);
    if (singleLineMatch) {
      const tagName = singleLineMatch[1];
      const title = tagName.charAt(0).toUpperCase() + tagName.slice(1).replace(/_/g, ' ');

      sections.push({
        id: `section-${id++}`,
        type: 'xml_tag',
        title,
        tagName,
        inferredPurpose: inferPurpose(tagName, line),
        startLine: lineIndex + 1,
        endLine: lineIndex + 1,
        startIndex: lineInfo[lineIndex].startIndex,
        endIndex: lineInfo[lineIndex].endIndex,
        content: line,
        suggestionCount: 0,
      });
      processedLines.add(lineIndex);
      continue;
    }

    // Check for multi-line tags
    const xmlMatch = line.match(xmlOpenTagRegex);
    if (xmlMatch) {
      const tagName = xmlMatch[1];
      const closingTag = `</${tagName}>`;
      const closingTagLower = closingTag.toLowerCase();

      // Check if the closing tag is on the same line (after the opening)
      const restOfLine = xmlMatch[2] || '';
      if (restOfLine.toLowerCase().includes(closingTagLower)) {
        const title = tagName.charAt(0).toUpperCase() + tagName.slice(1).replace(/_/g, ' ');
        sections.push({
          id: `section-${id++}`,
          type: 'xml_tag',
          title,
          tagName,
          inferredPurpose: inferPurpose(tagName, line),
          startLine: lineIndex + 1,
          endLine: lineIndex + 1,
          startIndex: lineInfo[lineIndex].startIndex,
          endIndex: lineInfo[lineIndex].endIndex,
          content: line,
          suggestionCount: 0,
        });
        processedLines.add(lineIndex);
        continue;
      }

      // Find the closing tag on subsequent lines
      let endLineIndex = lineIndex;
      let foundClosing = false;

      for (let j = lineIndex + 1; j < lines.length; j++) {
        const searchLine = lines[j].toLowerCase();
        // Check if line contains the closing tag (anywhere in the line)
        if (searchLine.includes(closingTagLower)) {
          endLineIndex = j;
          foundClosing = true;
          break;
        }
      }

      if (foundClosing) {
        const content = lines.slice(lineIndex, endLineIndex + 1).join('\n');
        const title = tagName.charAt(0).toUpperCase() + tagName.slice(1).replace(/_/g, ' ');

        sections.push({
          id: `section-${id++}`,
          type: 'xml_tag',
          title,
          tagName,
          inferredPurpose: inferPurpose(tagName, content),
          startLine: lineIndex + 1,
          endLine: endLineIndex + 1,
          startIndex: lineInfo[lineIndex].startIndex,
          endIndex: lineInfo[endLineIndex].endIndex,
          content,
          suggestionCount: 0,
        });

        // Mark all lines as processed
        for (let k = lineIndex; k <= endLineIndex; k++) {
          processedLines.add(k);
        }
      }
    }
  }

  return sections;
}

function detectMarkdownHeaders(
  text: string,
  lineInfo: LineInfo[],
  startId: number,
  usedLines: Set<number>
): SemanticSection[] {
  const sections: SemanticSection[] = [];
  const lines = text.split('\n');

  // Pattern for markdown headers: ## Title or **Title:**
  const mdHeaderRegex = /^(#{1,6})\s+(.+)$|^\*\*(.+?)\*\*:?\s*$/;

  let id = startId;
  let currentSection: Partial<SemanticSection> | null = null;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineNum = lineIndex + 1;
    if (usedLines.has(lineNum)) continue;

    const line = lines[lineIndex];
    const match = line.trim().match(mdHeaderRegex);

    if (match) {
      // Close previous section if exists
      if (currentSection) {
        currentSection.endLine = lineIndex;
        currentSection.endIndex = lineInfo[lineIndex - 1]?.endIndex ?? lineInfo[lineIndex].startIndex;
        currentSection.content = lines.slice(
          (currentSection.startLine ?? 1) - 1,
          currentSection.endLine
        ).join('\n');
        sections.push(currentSection as SemanticSection);
      }

      const title = formatTitle(match[2] || match[3]);
      currentSection = {
        id: `section-${id++}`,
        type: 'markdown_header',
        title,
        inferredPurpose: inferPurpose(title, ''),
        startLine: lineNum,
        endLine: lineNum,
        startIndex: lineInfo[lineIndex].startIndex,
        endIndex: lineInfo[lineIndex].endIndex,
        content: '',
        suggestionCount: 0,
      };
    }
  }

  // Close last section
  if (currentSection) {
    currentSection.endLine = lines.length;
    currentSection.endIndex = lineInfo[lines.length - 1]?.endIndex ?? text.length;
    currentSection.content = lines.slice(
      (currentSection.startLine ?? 1) - 1,
      currentSection.endLine
    ).join('\n');
    sections.push(currentSection as SemanticSection);
  }

  return sections;
}

function detectColonHeaders(
  text: string,
  lineInfo: LineInfo[],
  startId: number,
  usedLines: Set<number>
): SemanticSection[] {
  const sections: SemanticSection[] = [];
  const lines = text.split('\n');

  // Pattern for colon headers: "Title:" at the start of a line (capitalized word followed by colon)
  const colonHeaderRegex = /^([A-Z][a-zA-Z\s]{2,30}):$/;

  let id = startId;
  let currentSection: Partial<SemanticSection> | null = null;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineNum = lineIndex + 1;
    if (usedLines.has(lineNum)) continue;

    const line = lines[lineIndex].trim();
    const match = line.match(colonHeaderRegex);

    if (match) {
      // Close previous section if exists
      if (currentSection) {
        currentSection.endLine = lineIndex;
        currentSection.endIndex = lineInfo[lineIndex - 1]?.endIndex ?? lineInfo[lineIndex].startIndex;
        currentSection.content = lines.slice(
          (currentSection.startLine ?? 1) - 1,
          currentSection.endLine
        ).join('\n');
        sections.push(currentSection as SemanticSection);
      }

      const title = match[1].trim();
      currentSection = {
        id: `section-${id++}`,
        type: 'colon_header',
        title,
        inferredPurpose: inferPurpose(title, ''),
        startLine: lineNum,
        endLine: lineNum,
        startIndex: lineInfo[lineIndex].startIndex,
        endIndex: lineInfo[lineIndex].endIndex,
        content: '',
        suggestionCount: 0,
      };
    }
  }

  // Close last section
  if (currentSection) {
    currentSection.endLine = lines.length;
    currentSection.endIndex = lineInfo[lines.length - 1]?.endIndex ?? text.length;
    currentSection.content = lines.slice(
      (currentSection.startLine ?? 1) - 1,
      currentSection.endLine
    ).join('\n');
    sections.push(currentSection as SemanticSection);
  }

  return sections;
}

function detectParagraphBlocks(
  text: string,
  lineInfo: LineInfo[],
  startId: number,
  usedLines: Set<number>
): SemanticSection[] {
  const sections: SemanticSection[] = [];
  const lines = text.split('\n');

  let id = startId;
  let blockStart: number | null = null;
  let blockContent: string[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineNum = lineIndex + 1;
    if (usedLines.has(lineNum)) {
      // Close block if we had one
      if (blockStart !== null && blockContent.length > 0) {
        const content = blockContent.join('\n').trim();
        if (content.length > 20) { // Minimum content length
          sections.push({
            id: `section-${id++}`,
            type: 'paragraph',
            title: generateParagraphTitle(content),
            inferredPurpose: inferPurpose('', content),
            startLine: blockStart,
            endLine: lineIndex,
            startIndex: lineInfo[blockStart - 1].startIndex,
            endIndex: lineInfo[lineIndex - 1].endIndex,
            content,
            suggestionCount: 0,
          });
        }
        blockStart = null;
        blockContent = [];
      }
      continue;
    }

    const line = lines[lineIndex];
    const isEmpty = line.trim() === '';

    if (isEmpty) {
      // End of a potential block
      if (blockStart !== null && blockContent.length > 0) {
        const content = blockContent.join('\n').trim();
        if (content.length > 20) {
          sections.push({
            id: `section-${id++}`,
            type: 'paragraph',
            title: generateParagraphTitle(content),
            inferredPurpose: inferPurpose('', content),
            startLine: blockStart,
            endLine: lineIndex,
            startIndex: lineInfo[blockStart - 1].startIndex,
            endIndex: lineInfo[lineIndex - 1].endIndex,
            content,
            suggestionCount: 0,
          });
        }
        blockStart = null;
        blockContent = [];
      }
    } else {
      // Content line
      if (blockStart === null) {
        blockStart = lineNum;
      }
      blockContent.push(line);
    }
  }

  // Handle last block
  if (blockStart !== null && blockContent.length > 0) {
    const content = blockContent.join('\n').trim();
    if (content.length > 20) {
      sections.push({
        id: `section-${id++}`,
        type: 'paragraph',
        title: generateParagraphTitle(content),
        inferredPurpose: inferPurpose('', content),
        startLine: blockStart,
        endLine: lines.length,
        startIndex: lineInfo[blockStart - 1].startIndex,
        endIndex: lineInfo[lines.length - 1]?.endIndex ?? text.length,
        content,
        suggestionCount: 0,
      });
    }
  }

  return sections;
}

function generateParagraphTitle(content: string): string {
  // Get first line or first N characters as title
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length <= 40) {
    return firstLine;
  }
  return firstLine.substring(0, 37) + '...';
}

/**
 * Get the icon for a section type
 */
export function getSectionIcon(type: SectionType): string {
  switch (type) {
    case 'xml_tag': return 'code';
    case 'markdown_header': return 'heading';
    case 'colon_header': return 'tag';
    case 'paragraph': return 'text';
    case 'list': return 'list';
    case 'code_block': return 'terminal';
    default: return 'file';
  }
}

/**
 * Get display label for section type
 */
export function getSectionTypeLabel(type: SectionType): string {
  switch (type) {
    case 'xml_tag': return 'XML';
    case 'markdown_header': return 'Markdown';
    case 'colon_header': return 'Header';
    case 'paragraph': return 'Texto';
    case 'list': return 'Lista';
    case 'code_block': return 'Código';
    default: return 'Sección';
  }
}
