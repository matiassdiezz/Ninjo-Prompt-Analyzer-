import type { FlowData, FlowNode, FlowEdge } from '@/types/flow';

// --- Detection types ---

export interface AsciiFlowDetection {
  confidence: number;
  startLine: number;
  endLine: number;
  rawBlock: string;
}

// --- Internal types ---

interface AsciiBox {
  label: string;
  row: number;       // Top line index in the block
  col: number;       // Left column offset
  width: number;     // Box width in characters
  height: number;    // Box height in lines
  centerX: number;   // Horizontal center column
  centerY: number;   // Vertical center row
}

// Unicode box-drawing characters
const UNICODE_BOX_CHARS = /[┌┐└┘│─├┤┬┴┼╔╗╚╝║═╠╣╦╩╬]/;
const UNICODE_BOX_TOP_LEFT = /[┌╔]/;
const UNICODE_BOX_HORIZONTAL = /[─═]/;
const UNICODE_BOX_VERTICAL = /[│║]/;
const UNICODE_BOX_BOTTOM_RIGHT = /[┘╝]/;

// ASCII box characters
const ASCII_BOX_TOP_PATTERN = /\+[-=]+\+/;
const ASCII_BOX_SIDE = '|';

// Arrow/connector characters
const ARROW_CHARS = /[▼▲→←↓↑▸◂►◄⬇⬆⬅➡]/;
const CONNECTOR_CHARS = /[│║|▼▲→←↓↑─═\-]/;

/**
 * Detects if a text contains ASCII flow art and returns detection info.
 * Uses a confidence scoring system based on multiple signals.
 */
export function detectAsciiFlow(text: string): AsciiFlowDetection | null {
  if (!text || text.length < 10) return null;

  const lines = text.split('\n');

  // Find contiguous blocks of lines containing drawing characters
  let bestBlock: { start: number; end: number; score: number } | null = null;

  let blockStart = -1;
  let consecutiveDrawingLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasDrawingChars =
      UNICODE_BOX_CHARS.test(line) ||
      ASCII_BOX_TOP_PATTERN.test(line) ||
      ARROW_CHARS.test(line) ||
      (line.includes(ASCII_BOX_SIDE) && (line.includes('+') || line.includes('─')));

    if (hasDrawingChars) {
      if (blockStart === -1) blockStart = i;
      consecutiveDrawingLines++;
    } else if (line.trim() === '' && blockStart !== -1 && consecutiveDrawingLines > 0) {
      // Allow empty lines within a block
      continue;
    } else {
      if (consecutiveDrawingLines >= 3) {
        const score = scoreBlock(lines, blockStart, i - 1);
        if (!bestBlock || score > bestBlock.score) {
          bestBlock = { start: blockStart, end: i - 1, score };
        }
      }
      blockStart = -1;
      consecutiveDrawingLines = 0;
    }
  }

  // Check the last block
  if (consecutiveDrawingLines >= 3) {
    const end = lines.length - 1;
    const score = scoreBlock(lines, blockStart, end);
    if (!bestBlock || score > bestBlock.score) {
      bestBlock = { start: blockStart, end, score };
    }
  }

  if (!bestBlock || bestBlock.score < 0.5) return null;

  // Trim empty lines at boundaries
  let { start, end } = bestBlock;
  while (start <= end && lines[start].trim() === '') start++;
  while (end >= start && lines[end].trim() === '') end--;

  const rawBlock = lines.slice(start, end + 1).join('\n');

  return {
    confidence: bestBlock.score,
    startLine: start,
    endLine: end,
    rawBlock,
  };
}

/**
 * Scores a block of lines for ASCII flow confidence.
 */
function scoreBlock(lines: string[], start: number, end: number): number {
  let score = 0;
  const block = lines.slice(start, end + 1).join('\n');

  // Signal 1: Unicode box-drawing chars
  if (UNICODE_BOX_CHARS.test(block)) score += 0.4;

  // Signal 2: ASCII box patterns
  if (ASCII_BOX_TOP_PATTERN.test(block)) score += 0.3;

  // Signal 3: Arrow/connector chars
  if (ARROW_CHARS.test(block)) score += 0.2;

  // Signal 4: At least 3 lines with drawing chars
  let drawingLineCount = 0;
  for (let i = start; i <= end; i++) {
    if (UNICODE_BOX_CHARS.test(lines[i]) || ASCII_BOX_TOP_PATTERN.test(lines[i])) {
      drawingLineCount++;
    }
  }
  if (drawingLineCount >= 3) score += 0.1;

  // Cap at 1.0
  return Math.min(score, 1.0);
}

/**
 * Gets the character-level start/end position of the ASCII flow block in the prompt.
 */
export function getAsciiFlowBounds(
  prompt: string
): { start: number; end: number; block: string } | null {
  const detection = detectAsciiFlow(prompt);
  if (!detection) return null;

  const lines = prompt.split('\n');

  // Calculate character offsets
  let charStart = 0;
  for (let i = 0; i < detection.startLine; i++) {
    charStart += lines[i].length + 1; // +1 for newline
  }

  let charEnd = charStart;
  for (let i = detection.startLine; i <= detection.endLine; i++) {
    charEnd += lines[i].length + 1;
  }
  charEnd--; // Remove last newline

  return {
    start: charStart,
    end: charEnd,
    block: detection.rawBlock,
  };
}

/**
 * Parses ASCII art flow diagram into FlowData.
 */
export function parseAsciiFlow(text: string): FlowData | null {
  if (!text || text.trim().length === 0) return null;

  const lines = text.split('\n');

  // Phase 1: Detect all boxes
  const boxes = detectBoxes(lines);
  if (boxes.length === 0) return null;

  // Phase 2: Detect connections between boxes
  const connections = detectConnections(lines, boxes);

  // Phase 3: Infer node types
  const nodeTypes = inferNodeTypes(boxes, connections);

  // Phase 4: Build FlowData
  return buildFlowData(boxes, connections, nodeTypes);
}

// --- Phase 1: Box Detection ---

function detectBoxes(lines: string[]): AsciiBox[] {
  const boxes: AsciiBox[] = [];
  const visited = new Set<string>(); // Track visited top-left corners

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];

    for (let col = 0; col < line.length; col++) {
      const key = `${row},${col}`;
      if (visited.has(key)) continue;

      // Check for Unicode box start
      if (UNICODE_BOX_TOP_LEFT.test(line[col])) {
        const box = extractUnicodeBox(lines, row, col);
        if (box) {
          visited.add(key);
          boxes.push(box);
        }
      }
      // Check for ASCII box start
      else if (line[col] === '+' && col + 2 < line.length && line[col + 1] === '-') {
        const box = extractAsciiBox(lines, row, col);
        if (box) {
          visited.add(key);
          boxes.push(box);
        }
      }
    }
  }

  return boxes;
}

function extractUnicodeBox(lines: string[], startRow: number, startCol: number): AsciiBox | null {
  const topLine = lines[startRow];

  // Find the end of the top edge (─ characters ending with ┐ or ╗)
  let endCol = startCol + 1;
  while (endCol < topLine.length && UNICODE_BOX_HORIZONTAL.test(topLine[endCol])) {
    endCol++;
  }
  // Check for top-right corner
  if (endCol >= topLine.length || !/[┐╗]/.test(topLine[endCol])) return null;

  const width = endCol - startCol + 1;
  if (width < 3) return null;

  // Find the bottom edge
  let bottomRow = startRow + 1;
  while (bottomRow < lines.length) {
    const line = lines[bottomRow];
    if (
      startCol < line.length &&
      /[└╚]/.test(line[startCol])
    ) {
      // Verify it's a complete bottom edge
      let bottomEnd = startCol + 1;
      while (bottomEnd < line.length && UNICODE_BOX_HORIZONTAL.test(line[bottomEnd])) {
        bottomEnd++;
      }
      if (bottomEnd < line.length && UNICODE_BOX_BOTTOM_RIGHT.test(line[bottomEnd])) {
        break;
      }
    }
    bottomRow++;
    if (bottomRow - startRow > 10) return null; // Safety: max 10 lines per box
  }

  if (bottomRow >= lines.length) return null;

  const height = bottomRow - startRow + 1;

  // Extract label text from middle lines
  const labelLines: string[] = [];
  for (let r = startRow + 1; r < bottomRow; r++) {
    const line = lines[r];
    if (startCol < line.length && endCol < line.length) {
      const content = line.substring(startCol + 1, endCol);
      // Strip vertical border chars
      const stripped = content.replace(/^[│║\s]+/, '').replace(/[│║\s]+$/, '').trim();
      if (stripped) labelLines.push(stripped);
    }
  }

  const label = labelLines.join(' ').replace(/["']/g, '').trim();
  if (!label) return null;

  return {
    label,
    row: startRow,
    col: startCol,
    width,
    height,
    centerX: startCol + Math.floor(width / 2),
    centerY: startRow + Math.floor(height / 2),
  };
}

function extractAsciiBox(lines: string[], startRow: number, startCol: number): AsciiBox | null {
  const topLine = lines[startRow];

  // Find end of top edge
  let endCol = startCol + 1;
  while (endCol < topLine.length && topLine[endCol] === '-') {
    endCol++;
  }
  if (endCol >= topLine.length || topLine[endCol] !== '+') return null;

  const width = endCol - startCol + 1;
  if (width < 3) return null;

  // Find bottom edge
  let bottomRow = startRow + 1;
  while (bottomRow < lines.length) {
    const line = lines[bottomRow];
    if (
      startCol < line.length &&
      line[startCol] === '+' &&
      startCol + width - 1 < line.length &&
      line[startCol + width - 1] === '+'
    ) {
      // Verify dashes between
      let allDashes = true;
      for (let c = startCol + 1; c < startCol + width - 1; c++) {
        if (c < line.length && line[c] !== '-') {
          allDashes = false;
          break;
        }
      }
      if (allDashes) break;
    }
    bottomRow++;
    if (bottomRow - startRow > 10) return null;
  }

  if (bottomRow >= lines.length) return null;

  const height = bottomRow - startRow + 1;

  // Extract label
  const labelLines: string[] = [];
  for (let r = startRow + 1; r < bottomRow; r++) {
    const line = lines[r];
    if (startCol < line.length) {
      const content = line.substring(startCol + 1, Math.min(startCol + width - 1, line.length));
      const stripped = content.replace(/^[|\s]+/, '').replace(/[|\s]+$/, '').trim();
      if (stripped) labelLines.push(stripped);
    }
  }

  const label = labelLines.join(' ').replace(/["']/g, '').trim();
  if (!label) return null;

  return {
    label,
    row: startRow,
    col: startCol,
    width,
    height,
    centerX: startCol + Math.floor(width / 2),
    centerY: startRow + Math.floor(height / 2),
  };
}

// --- Phase 2: Connection Detection ---

interface Connection {
  fromIdx: number;
  toIdx: number;
  label?: string;
}

function detectConnections(lines: string[], boxes: AsciiBox[]): Connection[] {
  const connections: Connection[] = [];
  const connected = new Set<string>();

  // For each pair of boxes, check if there's a connector path between them
  for (let i = 0; i < boxes.length; i++) {
    for (let j = 0; j < boxes.length; j++) {
      if (i === j) continue;

      const from = boxes[i];
      const to = boxes[j];
      const key = `${i}->${j}`;
      if (connected.has(key)) continue;

      // Check vertical connection (from is above to)
      if (from.row + from.height <= to.row && Math.abs(from.centerX - to.centerX) < Math.max(from.width, to.width)) {
        if (hasVerticalPath(lines, from, to)) {
          connected.add(key);
          const label = extractPathLabel(lines, from, to, 'vertical');
          connections.push({ fromIdx: i, toIdx: j, label });
          continue;
        }
      }

      // Check horizontal connection (from is left of to)
      if (from.col + from.width <= to.col && Math.abs(from.centerY - to.centerY) < Math.max(from.height, to.height)) {
        if (hasHorizontalPath(lines, from, to)) {
          connected.add(key);
          const label = extractPathLabel(lines, from, to, 'horizontal');
          connections.push({ fromIdx: i, toIdx: j, label });
          continue;
        }
      }
    }
  }

  // If no connections found via paths, infer from spatial proximity (top-to-bottom order)
  if (connections.length === 0 && boxes.length > 1) {
    const sorted = boxes
      .map((box, idx) => ({ box, idx }))
      .sort((a, b) => a.box.row - b.box.row || a.box.col - b.box.col);

    for (let i = 0; i < sorted.length - 1; i++) {
      connections.push({ fromIdx: sorted[i].idx, toIdx: sorted[i + 1].idx });
    }
  }

  return connections;
}

function hasVerticalPath(lines: string[], from: AsciiBox, to: AsciiBox): boolean {
  // Check for vertical connector characters between the bottom of `from` and top of `to`
  const startRow = from.row + from.height;
  const endRow = to.row;
  const scanCol = from.centerX;

  // Need at least one connector character in the gap
  let foundConnector = false;

  for (let r = startRow; r < endRow; r++) {
    if (r >= lines.length) break;
    const line = lines[r];
    if (scanCol >= line.length) continue;

    const ch = line[scanCol];
    if (CONNECTOR_CHARS.test(ch) || ARROW_CHARS.test(ch) || ch === '┬' || ch === '┴' || ch === '┼') {
      foundConnector = true;
    }
  }

  return foundConnector;
}

/**
 * Extracts path labels from text between boxes in ASCII art.
 * Looks for text like: Box1 ──[Yes]──> Box2 or Box1 ── Yes ──> Box2
 */
function extractPathLabel(lines: string[], from: AsciiBox, to: AsciiBox, direction: 'vertical' | 'horizontal'): string | undefined {
  // Calculate the area between boxes
  let scanStartRow: number, scanEndRow: number, scanStartCol: number, scanEndCol: number;

  if (direction === 'vertical') {
    scanStartRow = from.row + from.height;
    scanEndRow = to.row;
    scanStartCol = Math.max(0, Math.min(from.centerX, to.centerX) - 5);
    scanEndCol = Math.min(lines[0]?.length || 100, Math.max(from.centerX, to.centerX) + 5);
  } else {
    scanStartRow = Math.max(0, Math.min(from.centerY, to.centerY) - 1);
    scanEndRow = Math.min(lines.length, Math.max(from.centerY, to.centerY) + 2);
    scanStartCol = from.col + from.width;
    scanEndCol = to.col;
  }

  // Scan for labels between boxes
  const labelPattern = /[\[\(]?\s*(si|no|yes|sí|yes|true|false|ok|cancel|aceptar|rechazar|continuar|volver|1|2|a|b)\s*[\]\)]?/i;

  for (let r = scanStartRow; r < scanEndRow && r < lines.length; r++) {
    const line = lines[r];
    const segment = line.substring(scanStartCol, Math.min(scanEndCol, line.length));

    // Look for text in brackets/parentheses or standalone words
    const match = segment.match(labelPattern);
    if (match) {
      return match[1].trim();
    }

    // Also look for any non-connector text
    const cleaned = segment.replace(/[│║|▼▲→←↓↑─═\-\s]/g, '').trim();
    if (cleaned && cleaned.length < 15) {
      return cleaned;
    }
  }

  return undefined;
}

function hasHorizontalPath(lines: string[], from: AsciiBox, to: AsciiBox): boolean {
  const scanRow = from.centerY;
  const startCol = from.col + from.width;
  const endCol = to.col;

  if (scanRow >= lines.length) return false;
  const line = lines[scanRow];

  let foundConnector = false;

  for (let c = startCol; c < endCol; c++) {
    if (c >= line.length) break;
    const ch = line[c];
    if (CONNECTOR_CHARS.test(ch) || ARROW_CHARS.test(ch) || ch === '├' || ch === '┤' || ch === '┼') {
      foundConnector = true;
    }
  }

  // Accept if boxes are adjacent
  if (endCol - startCol <= 2) foundConnector = true;

  return foundConnector;
}

// --- Phase 3: Node Type Inference ---

function inferNodeTypes(
  boxes: AsciiBox[],
  connections: Connection[]
): Map<number, FlowNode['type']> {
  const types = new Map<number, FlowNode['type']>();
  const hasIncoming = new Set<number>();
  const hasOutgoing = new Set<number>();

  for (const conn of connections) {
    hasOutgoing.add(conn.fromIdx);
    hasIncoming.add(conn.toIdx);
  }

  for (let i = 0; i < boxes.length; i++) {
    const label = boxes[i].label.toLowerCase();

    // Explicit type hints in label
    if (
      label.includes('inicio') ||
      label.includes('start') ||
      label.includes('cta') ||
      label.includes('trigger') ||
      label.includes('keyword')
    ) {
      if (!hasIncoming.has(i)) {
        types.set(i, 'start');
        continue;
      }
    }

    if (
      label.includes('fin') ||
      label.includes('end') ||
      label.includes('cierre') ||
      label.includes('escalado') ||
      label.includes('despedida')
    ) {
      if (!hasOutgoing.has(i)) {
        types.set(i, 'end');
        continue;
      }
    }

    // Decision nodes: contains "?"
    if (boxes[i].label.includes('?')) {
      types.set(i, 'decision');
      continue;
    }

    // Infer from connectivity
    if (!hasIncoming.has(i)) {
      types.set(i, 'start');
    } else if (!hasOutgoing.has(i)) {
      types.set(i, 'end');
    } else {
      types.set(i, 'action');
    }
  }

  // Ensure at least one start and one end
  const typeValues = Array.from(types.values());
  if (!typeValues.includes('start') && boxes.length > 0) {
    // Pick the topmost box
    const topmost = boxes.reduce((min, box, idx) =>
      box.row < boxes[min].row ? idx : min, 0);
    types.set(topmost, 'start');
  }
  if (!typeValues.includes('end') && boxes.length > 1) {
    // Pick the bottommost box that isn't start
    const sorted = boxes
      .map((box, idx) => ({ box, idx }))
      .filter(({ idx }) => types.get(idx) !== 'start')
      .sort((a, b) => b.box.row - a.box.row);
    if (sorted.length > 0) {
      types.set(sorted[0].idx, 'end');
    }
  }

  return types;
}

// --- Phase 4: Build FlowData ---

function buildFlowData(
  boxes: AsciiBox[],
  connections: Connection[],
  nodeTypes: Map<number, FlowNode['type']>
): FlowData {
  const HORIZONTAL_GAP = 250;
  const VERTICAL_GAP = 150;
  const BASE_X = 400;
  const BASE_Y = 50;

  // Group boxes by approximate row for layering
  const layers = groupIntoLayers(boxes);

  // Generate nodes
  const nodes: FlowNode[] = boxes.map((box, idx) => {
    const type = nodeTypes.get(idx) || 'action';
    const layerInfo = getLayerPosition(idx, boxes, layers);

    return {
      id: generateNodeId(),
      type,
      label: box.label,
      position: {
        x: BASE_X + layerInfo.colOffset * HORIZONTAL_GAP,
        y: BASE_Y + layerInfo.layer * VERTICAL_GAP,
      },
      data: {},
    };
  });

  // Generate edges
  const edges: FlowEdge[] = connections.map((conn) => {
    const sourceType = nodeTypes.get(conn.fromIdx);
    const edge: FlowEdge = {
      id: `e-${generateNodeId()}`,
      source: nodes[conn.fromIdx].id,
      target: nodes[conn.toIdx].id,
    };

    // Label decision branches
    if (sourceType === 'decision') {
      const outgoing = connections.filter((c) => c.fromIdx === conn.fromIdx);
      if (outgoing.length >= 2) {
        const isFirst = outgoing.indexOf(conn) === 0;
        edge.label = isFirst ? 'Si' : 'No';
        edge.sourceHandle = isFirst ? 'yes' : 'no';
      }
    }

    if (conn.label) {
      edge.label = conn.label;
    }

    return edge;
  });

  return { nodes, edges };
}

function groupIntoLayers(boxes: AsciiBox[]): Map<number, number> {
  // Group boxes by similar row position (within tolerance)
  const tolerance = 3;
  const boxToLayer = new Map<number, number>();
  const layerRows: number[] = [];

  const sorted = boxes
    .map((box, idx) => ({ box, idx }))
    .sort((a, b) => a.box.row - b.box.row);

  for (const { box, idx } of sorted) {
    let assignedLayer = -1;
    for (let l = 0; l < layerRows.length; l++) {
      if (Math.abs(box.row - layerRows[l]) <= tolerance) {
        assignedLayer = l;
        break;
      }
    }
    if (assignedLayer === -1) {
      assignedLayer = layerRows.length;
      layerRows.push(box.row);
    }
    boxToLayer.set(idx, assignedLayer);
  }

  return boxToLayer;
}

function getLayerPosition(
  idx: number,
  boxes: AsciiBox[],
  layers: Map<number, number>
): { layer: number; colOffset: number } {
  const layer = layers.get(idx) || 0;

  // Count boxes in the same layer, find position within layer
  const sameLayer = boxes
    .map((box, i) => ({ box, i }))
    .filter(({ i }) => layers.get(i) === layer)
    .sort((a, b) => a.box.col - b.box.col);

  const posInLayer = sameLayer.findIndex(({ i }) => i === idx);
  const totalInLayer = sameLayer.length;

  // Center the layer around 0
  const colOffset = posInLayer - Math.floor(totalInLayer / 2);

  return { layer, colOffset };
}

// Simple ID generator
let idCounter = 0;
function generateNodeId(): string {
  idCounter++;
  return `ascii-${idCounter.toString(36).padStart(4, '0')}`;
}

/**
 * Resets the ID counter. Useful for testing.
 */
export function resetIdCounter(): void {
  idCounter = 0;
}
