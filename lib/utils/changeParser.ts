/**
 * Parser for structured changes from Claude's "MODIFICACIONES SECCIÓN POR SECCIÓN" output.
 * Extracts individual changes into structured objects for rendering as ChangeCards.
 */

export type ChangeAction = 'replace' | 'insert' | 'delete' | 'move' | 'keep';

export interface ParsedChange {
  id: string;
  index: number;
  title: string;
  section: string;
  action: ChangeAction;
  beforeText?: string;
  afterText?: string;
  location?: string;
  reason: string;
}

export interface ParseResult {
  changes: ParsedChange[];
  remainingContent: string;
}

// Map Spanish action names to typed actions
const ACTION_MAP: Record<string, ChangeAction> = {
  'reemplazar': 'replace',
  'insertar': 'insert',
  'insertar nueva regla': 'insert',
  'eliminar': 'delete',
  'mover': 'move',
  'mover bloque': 'move',
  'mantener': 'keep',
  'mantener como está': 'keep',
  'mantener como esta': 'keep',
};

function mapAction(raw: string): ChangeAction {
  const normalized = raw.trim().toLowerCase();
  return ACTION_MAP[normalized] || 'replace';
}

/**
 * Extract quoted text or code block content from a field value.
 * Handles: "texto", `texto`, ```texto```, or plain text.
 */
function extractTextContent(raw: string): string {
  let text = raw.trim();

  // Remove surrounding double quotes
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1);
  }
  // Remove surrounding single quotes
  else if (text.startsWith("'") && text.endsWith("'")) {
    text = text.slice(1, -1);
  }
  // Remove surrounding backtick code block
  else if (text.startsWith('```')) {
    text = text.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
  }
  // Remove surrounding inline backticks
  else if (text.startsWith('`') && text.endsWith('`')) {
    text = text.slice(1, -1);
  }

  return text.trim();
}

/**
 * Extract a field value from a change block.
 * Handles multiline values that span until the next **Field:** or end of block.
 */
function extractField(block: string, fieldNames: string[]): string | undefined {
  for (const fieldName of fieldNames) {
    // Match **FieldName:** followed by content (single or multiline)
    const pattern = new RegExp(
      `\\*\\*${fieldName}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*[A-Za-zÁáÉéÍíÓóÚúÑñ\\s]+:\\*\\*|$)`,
      'i'
    );
    const match = block.match(pattern);
    if (match && match[1].trim()) {
      return extractTextContent(match[1]);
    }
  }
  return undefined;
}

/**
 * Parse a single change block (content after ### N. header)
 */
function parseSingleChange(block: string, index: number): ParsedChange | null {
  const section = extractField(block, ['Sección', 'Seccion']);
  const actionRaw = extractField(block, ['Acción', 'Accion']);
  const reason = extractField(block, ['Razón', 'Razon']);

  if (!section || !reason) return null;

  const action = actionRaw ? mapAction(actionRaw) : 'replace';

  // Extract title from the ### header line
  const headerMatch = block.match(/^(.+?)(?:\n|$)/);
  const title = headerMatch ? headerMatch[1].trim() : `Cambio ${index}`;

  const beforeText = extractField(block, [
    'Antes',
    'Texto a eliminar',
    'Línea a eliminar',
    'Linea a eliminar',
    'Bloque a mover',
  ]);

  const afterText = extractField(block, [
    'Después',
    'Despues',
    'Texto a insertar',
    'Nueva regla',
  ]);

  const location = extractField(block, [
    'Ubicación',
    'Ubicacion',
    'Nueva ubicación',
    'Nueva ubicacion',
  ]);

  return {
    id: `change-${Date.now()}-${index}`,
    index,
    title: title.replace(/^\d+\.\s*/, '').replace(/^\[|\]$/g, ''),
    section,
    action,
    beforeText,
    afterText,
    location,
    reason,
  };
}

/**
 * Check if a response contains structured changes in the expected format.
 */
export function hasStructuredChanges(content: string): boolean {
  return /##\s*MODIFICACIONES\s+SECCI[OÓ]N\s+POR\s+SECCI[OÓ]N/i.test(content);
}

/**
 * Parse structured changes from Claude's response.
 * Returns the extracted changes and any remaining content that should render as markdown.
 */
export function parseChanges(content: string): ParseResult {
  if (!hasStructuredChanges(content)) {
    return { changes: [], remainingContent: content };
  }

  // Find the start of the modifications block
  const modHeaderMatch = content.match(
    /##\s*MODIFICACIONES\s+SECCI[OÓ]N\s+POR\s+SECCI[OÓ]N/i
  );
  if (!modHeaderMatch || modHeaderMatch.index === undefined) {
    return { changes: [], remainingContent: content };
  }

  const modStart = modHeaderMatch.index;
  const beforeBlock = content.substring(0, modStart).trim();

  // Get everything after the header
  const modContent = content.substring(modStart + modHeaderMatch[0].length);

  // Find where the modifications block ends (at PARA DOCUMENTAR or end of content)
  const docSectionMatch = modContent.match(
    /\n##\s*(?:📝\s*)?PARA\s+DOCUMENTAR/i
  );
  const modEnd = docSectionMatch?.index ?? modContent.length;
  const modificationsBlock = modContent.substring(0, modEnd);
  const afterBlock = docSectionMatch
    ? modContent.substring(docSectionMatch.index!).trim()
    : '';

  // Split by ### N. pattern to get individual changes
  const changeSections = modificationsBlock.split(/\n###\s+\d+\.\s*/);

  // First element is empty or whitespace before the first ###
  const changes: ParsedChange[] = [];
  for (let i = 1; i < changeSections.length; i++) {
    const parsed = parseSingleChange(changeSections[i].trim(), i);
    if (parsed) {
      changes.push(parsed);
    }
  }

  // Build remaining content: everything before modifications + PARA DOCUMENTAR section
  const remainingParts: string[] = [];
  if (beforeBlock) remainingParts.push(beforeBlock);
  if (afterBlock) remainingParts.push(afterBlock);

  return {
    changes,
    remainingContent: remainingParts.join('\n\n'),
  };
}
