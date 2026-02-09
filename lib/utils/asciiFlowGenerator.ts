import type { FlowData, FlowNode, FlowEdge } from '@/types/flow';

const MIN_BOX_WIDTH = 15;
const MAX_BOX_WIDTH = 40;
const HORIZONTAL_GAP = 4;

/**
 * Converts FlowData into an ASCII art representation using Unicode box-drawing characters.
 */
export function generateAsciiFlow(data: FlowData): string {
  const { nodes, edges } = data;
  if (nodes.length === 0) return '';

  // Build adjacency list
  const outgoing = new Map<string, FlowEdge[]>();
  for (const node of nodes) {
    outgoing.set(node.id, []);
  }
  for (const edge of edges) {
    outgoing.get(edge.source)?.push(edge);
  }

  // BFS layering from start nodes
  const layers = assignLayers(nodes, edges);

  // Sort nodes within each layer by x-position
  const layerGroups = new Map<number, FlowNode[]>();
  for (const [nodeId, layer] of layers) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(node);
  }

  for (const [, group] of layerGroups) {
    group.sort((a, b) => a.position.x - b.position.x);
  }

  // Calculate box widths
  const boxWidths = new Map<string, number>();
  for (const node of nodes) {
    const labelLen = node.label.length;
    const w = Math.max(MIN_BOX_WIDTH, Math.min(labelLen + 4, MAX_BOX_WIDTH));
    boxWidths.set(node.id, w);
  }

  // Render layers
  const outputLines: string[] = [];
  const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);

  for (let li = 0; li < sortedLayers.length; li++) {
    const layerIdx = sortedLayers[li];
    const group = layerGroups.get(layerIdx) || [];

    // Render the row of boxes
    const boxLines = renderBoxRow(group, boxWidths);
    outputLines.push(...boxLines);

    // Render connectors to next layer (if not the last layer)
    if (li < sortedLayers.length - 1) {
      const nextLayerIdx = sortedLayers[li + 1];
      const nextGroup = layerGroups.get(nextLayerIdx) || [];
      const connectorLines = renderConnectors(group, nextGroup, boxWidths, outgoing);
      outputLines.push(...connectorLines);
    }
  }

  // Trim trailing spaces from each line
  return outputLines.map((line) => line.trimEnd()).join('\n');
}

/**
 * Assigns each node to a layer using BFS from start nodes.
 */
function assignLayers(nodes: FlowNode[], edges: FlowEdge[]): Map<string, number> {
  const layers = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }
  for (const edge of edges) {
    outgoing.get(edge.source)?.push(edge.target);
    incoming.get(edge.target)?.push(edge.source);
  }

  // Find start nodes (type === 'start' or no incoming)
  const startNodes = nodes.filter(
    (n) => n.type === 'start' || (incoming.get(n.id)?.length === 0)
  );

  // BFS
  const queue: { id: string; layer: number }[] = startNodes.map((n) => ({
    id: n.id,
    layer: 0,
  }));
  const visited = new Set<string>();

  for (const item of queue) {
    visited.add(item.id);
    layers.set(item.id, item.layer);
  }

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    const targets = outgoing.get(id) || [];
    for (const target of targets) {
      if (!visited.has(target)) {
        visited.add(target);
        layers.set(target, layer + 1);
        queue.push({ id: target, layer: layer + 1 });
      }
    }
  }

  // Assign unvisited nodes to the last layer + 1
  const maxLayer = Math.max(0, ...Array.from(layers.values()));
  for (const node of nodes) {
    if (!layers.has(node.id)) {
      layers.set(node.id, maxLayer + 1);
    }
  }

  return layers;
}

/**
 * Renders a horizontal row of boxes for a layer.
 */
function renderBoxRow(group: FlowNode[], boxWidths: Map<string, number>): string[] {
  // Calculate total width and positions
  const positions: { node: FlowNode; startCol: number; width: number }[] = [];
  let currentCol = 0;

  for (const node of group) {
    const w = boxWidths.get(node.id) || MIN_BOX_WIDTH;
    positions.push({ node, startCol: currentCol, width: w });
    currentCol += w + HORIZONTAL_GAP;
  }

  // Render 3-line boxes: top, content, bottom
  const topLine: string[] = [];
  const midLine: string[] = [];
  const botLine: string[] = [];

  for (let i = 0; i < positions.length; i++) {
    const { node, width } = positions[i];
    const innerWidth = width - 2;

    // Truncate label if needed
    let label = node.label;
    if (label.length > innerWidth) {
      label = label.substring(0, innerWidth - 1) + '…';
    }

    // Center label
    const padTotal = innerWidth - label.length;
    const padLeft = Math.floor(padTotal / 2);
    const padRight = padTotal - padLeft;

    const isDecision = node.type === 'decision';
    const marker = isDecision ? '?' : '';
    const displayLabel = marker ? `${label}` : label;

    topLine.push(`┌${'─'.repeat(innerWidth)}┐`);
    midLine.push(`│${' '.repeat(padLeft)}${displayLabel}${' '.repeat(padRight)}│`);
    botLine.push(`└${'─'.repeat(innerWidth)}┘`);

    // Add gap between boxes
    if (i < positions.length - 1) {
      topLine.push(' '.repeat(HORIZONTAL_GAP));
      midLine.push(' '.repeat(HORIZONTAL_GAP));
      botLine.push(' '.repeat(HORIZONTAL_GAP));
    }
  }

  return [topLine.join(''), midLine.join(''), botLine.join('')];
}

/**
 * Renders vertical connectors between two layers.
 */
function renderConnectors(
  currentGroup: FlowNode[],
  nextGroup: FlowNode[],
  boxWidths: Map<string, number>,
  outgoing: Map<string, FlowEdge[]>
): string[] {
  // Calculate center columns for current layer nodes
  const currentCenters = new Map<string, number>();
  let col = 0;
  for (const node of currentGroup) {
    const w = boxWidths.get(node.id) || MIN_BOX_WIDTH;
    currentCenters.set(node.id, col + Math.floor(w / 2));
    col += w + HORIZONTAL_GAP;
  }

  // Calculate center columns for next layer nodes
  const nextCenters = new Map<string, number>();
  col = 0;
  for (const node of nextGroup) {
    const w = boxWidths.get(node.id) || MIN_BOX_WIDTH;
    nextCenters.set(node.id, col + Math.floor(w / 2));
    col += w + HORIZONTAL_GAP;
  }

  // Find which connections go from current to next layer
  const activeConnections: { fromCol: number; toCol: number; label?: string }[] = [];

  for (const node of currentGroup) {
    const edges = outgoing.get(node.id) || [];
    for (const edge of edges) {
      const fromCol = currentCenters.get(node.id);
      const toCol = nextCenters.get(edge.target);
      if (fromCol !== undefined && toCol !== undefined) {
        activeConnections.push({ fromCol, toCol, label: edge.label });
      }
    }
  }

  if (activeConnections.length === 0) {
    // No connections, just add spacing
    return ['       │', '       ▼'];
  }

  // Determine total width
  const allCols = [
    ...Array.from(currentCenters.values()),
    ...Array.from(nextCenters.values()),
  ];
  const maxCol = Math.max(...allCols, 0) + 5;

  // Render connector lines (pipe + arrow)
  const pipeChars = new Array(maxCol + 1).fill(' ');
  const arrowChars = new Array(maxCol + 1).fill(' ');

  for (const conn of activeConnections) {
    // Simple case: straight down or close enough
    const connCol = conn.fromCol;
    if (connCol >= 0 && connCol <= maxCol) {
      pipeChars[connCol] = '│';
      arrowChars[connCol] = '▼';

      // Add label if present
      if (conn.label && connCol + 2 <= maxCol) {
        const labelStr = ` ${conn.label}`;
        for (let c = 0; c < labelStr.length && connCol + 1 + c <= maxCol; c++) {
          pipeChars[connCol + 1 + c] = labelStr[c];
        }
      }
    }
  }

  return [pipeChars.join('').trimEnd(), arrowChars.join('').trimEnd()];
}
