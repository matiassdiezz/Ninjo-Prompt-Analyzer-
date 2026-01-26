export interface ParsedSection {
  id: string;
  title: string;
  tagName: string;
  startLine: number;
  startIndex: number;
  endLine: number;
  endIndex: number;
}

/**
 * Parses a prompt text and extracts sections based on XML-style tags.
 * Only detects opening tags like <tag_name> and finds their closing </tag_name>
 */
export function parsePromptSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = text.split('\n');

  // Track character index for each line start
  let charIndex = 0;
  const lineStartIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    lineStartIndices.push(charIndex);
    charIndex += lines[i].length + 1; // +1 for newline
  }

  // Pattern for XML opening tags - captures the tag name
  // Matches: <tag_name> or <tag_name attr="value">
  const xmlOpenTagRegex = /^<([a-zA-Z_][a-zA-Z0-9_-]*)(?:\s[^>]*)?>$/;

  let sectionCounter = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex].trim();

    // Check if line is an XML opening tag
    const xmlMatch = line.match(xmlOpenTagRegex);
    if (xmlMatch) {
      const tagName = xmlMatch[1];
      const closingTag = `</${tagName}>`;

      // Find the closing tag
      let endLine = lineIndex;
      let endIndex = lineStartIndices[lineIndex] + lines[lineIndex].length;
      let foundClosing = false;

      for (let j = lineIndex + 1; j < lines.length; j++) {
        const searchLine = lines[j].trim().toLowerCase();
        if (searchLine === closingTag.toLowerCase() || searchLine.endsWith(closingTag.toLowerCase())) {
          endLine = j;
          endIndex = lineStartIndices[j] + lines[j].length;
          foundClosing = true;
          break;
        }
      }

      // Only add if we found a closing tag (valid XML section)
      if (foundClosing) {
        sectionCounter++;

        // Create display title with capitalized tag name
        const displayTitle = tagName.charAt(0).toUpperCase() + tagName.slice(1).replace(/_/g, ' ');

        sections.push({
          id: `section-${sectionCounter}`,
          title: displayTitle,
          tagName: tagName,
          startLine: lineIndex + 1, // 1-indexed for display
          startIndex: lineStartIndices[lineIndex],
          endLine: endLine + 1,
          endIndex,
        });
      }
    }
  }

  return sections;
}

/**
 * Get line number from character index
 */
export function getLineFromIndex(text: string, index: number): number {
  const substring = text.substring(0, index);
  return (substring.match(/\n/g) || []).length + 1;
}

/**
 * Get character index from line number (1-indexed line, returns start of line)
 */
export function getIndexFromLine(text: string, lineNumber: number): number {
  const lines = text.split('\n');
  let index = 0;
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
    index += lines[i].length + 1;
  }
  return index;
}
