import type { FlowNode, FlowEdge, FlowNodeType } from '@/types/flow';

// --- Constants ---
const ROW_GAP = 160;
const COL_GAP = 280;
const PADDING_TOP = 80;
const PADDING_LEFT = 80;

// Effective bounding boxes matching actual rendered sizes
const NODE_SIZE: Record<FlowNodeType, { w: number; h: number }> = {
  start: { w: 120, h: 45 },
  end: { w: 120, h: 45 },
  action: { w: 200, h: 80 },
  decision: { w: 120, h: 120 },
};

// --- Internal types ---
interface LayoutNode {
  id: string;
  type: FlowNodeType;
  row: number;
  col: number;
  w: number;
  h: number;
  x: number;
  y: number;
  parentIds: string[];
  yesChildId: string | null;
  noChildId: string | null;
  childIds: string[];
}

interface Graph {
  nodeMap: Map<string, LayoutNode>;
  edgeList: { source: string; target: string; sourceHandle?: string; label?: string }[];
  roots: string[];
}

// --- Phase 1: Build graph ---
function buildGraph(nodes: FlowNode[], edges: FlowEdge[]): Graph {
  const nodeMap = new Map<string, LayoutNode>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    const size = NODE_SIZE[node.type] || NODE_SIZE.action;
    nodeMap.set(node.id, {
      id: node.id,
      type: node.type,
      row: -1,
      col: -1,
      w: size.w,
      h: size.h,
      x: 0,
      y: 0,
      parentIds: [],
      yesChildId: null,
      noChildId: null,
      childIds: [],
    });
    inDegree.set(node.id, 0);
  }

  const edgeList: Graph['edgeList'] = [];

  for (const edge of edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;

    edgeList.push({
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      label: edge.label,
    });

    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);

    const src = nodeMap.get(edge.source)!;
    const tgt = nodeMap.get(edge.target)!;
    tgt.parentIds.push(edge.source);

    // Classify decision branches
    if (src.type === 'decision') {
      const isYes =
        edge.sourceHandle === 'yes' ||
        edge.label?.toLowerCase() === 'si' ||
        edge.label?.toLowerCase() === 'sí' ||
        edge.label?.toLowerCase() === 'si/depende';
      const isNo =
        edge.sourceHandle === 'no' ||
        edge.label?.toLowerCase() === 'no';

      if (isYes && !src.yesChildId) {
        src.yesChildId = edge.target;
      } else if (isNo && !src.noChildId) {
        src.noChildId = edge.target;
      } else if (!src.yesChildId) {
        src.yesChildId = edge.target;
      } else if (!src.noChildId) {
        src.noChildId = edge.target;
      }
    } else {
      src.childIds.push(edge.target);
    }
  }

  // Find roots
  const roots: string[] = [];
  for (const node of nodes) {
    if (node.type === 'start' || inDegree.get(node.id) === 0) {
      roots.push(node.id);
    }
  }
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0].id);
  }

  return { nodeMap, edgeList, roots };
}

// --- Phase 2: Assign rows (longest path BFS) ---
function assignRows(graph: Graph): void {
  const { nodeMap, edgeList, roots } = graph;

  // Build children map for BFS
  const childrenOf = new Map<string, string[]>();
  for (const n of nodeMap.values()) childrenOf.set(n.id, []);
  for (const e of edgeList) {
    childrenOf.get(e.source)?.push(e.target);
  }

  for (const root of roots) {
    nodeMap.get(root)!.row = 0;
  }

  const queue = [...roots];
  const visited = new Set(roots);

  while (queue.length > 0) {
    const curId = queue.shift()!;
    const curRow = nodeMap.get(curId)!.row;

    for (const childId of childrenOf.get(curId) || []) {
      const child = nodeMap.get(childId)!;
      const newRow = curRow + 1;

      if (child.row < newRow) {
        child.row = newRow;
      }

      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push(childId);
      }
    }
  }

  // Disconnected nodes
  for (const node of nodeMap.values()) {
    if (node.row === -1) node.row = 0;
  }
}

// --- Phase 3: Assign columns (simple DFS with linear column allocation) ---
function assignColumns(graph: Graph): void {
  const { nodeMap, roots } = graph;
  let nextFreeCol = 0;
  const assigned = new Set<string>();

  function dfs(nodeId: string, preferredCol: number): void {
    const node = nodeMap.get(nodeId);
    if (!node || assigned.has(nodeId)) return;

    assigned.add(nodeId);
    node.col = preferredCol;

    // Track the highest column used so far
    if (preferredCol >= nextFreeCol) {
      nextFreeCol = preferredCol + 1;
    }

    if (node.type === 'decision') {
      // "Yes" → same column (straight down)
      if (node.yesChildId && !assigned.has(node.yesChildId)) {
        dfs(node.yesChildId, preferredCol);
      }
      // "No" → next free column to the right
      if (node.noChildId && !assigned.has(node.noChildId)) {
        dfs(node.noChildId, nextFreeCol);
      }
    } else {
      // First child inherits column, extras go to next free column
      for (let i = 0; i < node.childIds.length; i++) {
        if (!assigned.has(node.childIds[i])) {
          dfs(node.childIds[i], i === 0 ? preferredCol : nextFreeCol);
        }
      }
    }
  }

  for (const rootId of roots) {
    dfs(rootId, nextFreeCol > 0 ? nextFreeCol : 0);
  }

  // Disconnected
  for (const node of nodeMap.values()) {
    if (!assigned.has(node.id)) {
      node.col = nextFreeCol++;
    }
  }
}

// --- Phase 4: Compute pixel coordinates ---
function computeCoordinates(graph: Graph): void {
  const { nodeMap } = graph;

  // Collect column widths and row heights
  const colMaxW = new Map<number, number>();
  const rowMaxH = new Map<number, number>();

  for (const node of nodeMap.values()) {
    colMaxW.set(node.col, Math.max(colMaxW.get(node.col) ?? 0, node.w));
    rowMaxH.set(node.row, Math.max(rowMaxH.get(node.row) ?? 0, node.h));
  }

  // Cumulative X centers per column
  const sortedCols = Array.from(colMaxW.keys()).sort((a, b) => a - b);
  const colCenterX = new Map<number, number>();
  let accX = PADDING_LEFT;
  for (const col of sortedCols) {
    const w = colMaxW.get(col)!;
    colCenterX.set(col, accX + w / 2);
    accX += w + COL_GAP;
  }

  // Cumulative Y centers per row
  const sortedRows = Array.from(rowMaxH.keys()).sort((a, b) => a - b);
  const rowCenterY = new Map<number, number>();
  let accY = PADDING_TOP;
  for (const row of sortedRows) {
    const h = rowMaxH.get(row)!;
    rowCenterY.set(row, accY + h / 2);
    accY += h + ROW_GAP;
  }

  // Assign pixel positions (React Flow uses top-left)
  for (const node of nodeMap.values()) {
    const cx = colCenterX.get(node.col) ?? PADDING_LEFT;
    const cy = rowCenterY.get(node.row) ?? PADDING_TOP;
    node.x = cx - node.w / 2;
    node.y = cy - node.h / 2;
  }
}

// --- Phase 5: Normalize ---
function normalizePositions(graph: Graph): void {
  const { nodeMap } = graph;

  let minX = Infinity;
  let minY = Infinity;
  for (const node of nodeMap.values()) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
  }

  const offX = minX < PADDING_LEFT ? PADDING_LEFT - minX : 0;
  const offY = minY < PADDING_TOP ? PADDING_TOP - minY : 0;

  if (offX > 0 || offY > 0) {
    for (const node of nodeMap.values()) {
      node.x += offX;
      node.y += offY;
    }
  }
}

// --- Main export ---

/**
 * Auto-layout flow nodes top-to-bottom with decision-aware branching.
 * "Yes"/"Si" branches continue straight down, "No" branches go right.
 */
export function autoLayoutFlow(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [{ ...nodes[0], position: { x: PADDING_LEFT, y: PADDING_TOP } }];
  }

  const graph = buildGraph(nodes, edges);
  assignRows(graph);
  assignColumns(graph);
  computeCoordinates(graph);
  normalizePositions(graph);

  return nodes.map(node => {
    const layout = graph.nodeMap.get(node.id);
    if (!layout) return { ...node, position: { x: PADDING_LEFT, y: PADDING_TOP } };
    return {
      ...node,
      position: { x: layout.x, y: layout.y },
    };
  });
}
