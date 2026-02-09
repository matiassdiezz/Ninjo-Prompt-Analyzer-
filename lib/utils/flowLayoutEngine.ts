import type { FlowNode, FlowEdge } from '@/types/flow';

const LAYER_GAP_X = 250;
const NODE_GAP_Y = 150;

/**
 * Auto-layout flow nodes in a left-to-right layered graph.
 * Uses topological sort (BFS from roots) to assign layers,
 * then distributes nodes vertically within each layer.
 */
export function autoLayoutFlow(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [{ ...nodes[0], position: { x: 100, y: 100 } }];
  }

  // Build adjacency and in-degree maps
  const nodeMap = new Map<string, FlowNode>();
  const inDegree = new Map<string, number>();
  const children = new Map<string, { target: string; label?: string }[]>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    inDegree.set(node.id, 0);
    children.set(node.id, []);
  }

  for (const edge of edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;
    children.get(edge.source)!.push({ target: edge.target, label: edge.label });
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find root nodes: nodes with no incoming edges, or start-type nodes
  const roots: string[] = [];
  for (const node of nodes) {
    if (node.type === 'start' || inDegree.get(node.id) === 0) {
      roots.push(node.id);
    }
  }

  // If no roots found (cycles), just use the first node
  if (roots.length === 0) {
    roots.push(nodes[0].id);
  }

  // BFS to assign layers
  const layerOf = new Map<string, number>();
  const queue: string[] = [...roots];
  const visited = new Set<string>();

  for (const root of roots) {
    layerOf.set(root, 0);
    visited.add(root);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layerOf.get(current) || 0;

    for (const { target } of children.get(current) || []) {
      const existingLayer = layerOf.get(target);
      const newLayer = currentLayer + 1;

      // Always use the maximum layer (longest path) for better spacing
      if (existingLayer === undefined || newLayer > existingLayer) {
        layerOf.set(target, newLayer);
      }

      if (!visited.has(target)) {
        visited.add(target);
        queue.push(target);
      }
    }
  }

  // Handle disconnected nodes — place them in layer 0
  for (const node of nodes) {
    if (!layerOf.has(node.id)) {
      layerOf.set(node.id, 0);
    }
  }

  // Group nodes by layer
  const layers = new Map<number, string[]>();
  for (const [nodeId, layer] of layerOf) {
    if (!layers.has(layer)) {
      layers.set(layer, []);
    }
    layers.get(layer)!.push(nodeId);
  }

  // Sort layers and position nodes
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);
  const positioned = new Map<string, { x: number; y: number }>();

  for (const layerIndex of sortedLayers) {
    const layerNodes = layers.get(layerIndex)!;
    const x = 100 + layerIndex * LAYER_GAP_X;

    // Sort nodes within layer: decisions first for better visual hierarchy
    layerNodes.sort((a, b) => {
      const nodeA = nodeMap.get(a)!;
      const nodeB = nodeMap.get(b)!;
      // start nodes first, then action, then decision, then end
      const order: Record<string, number> = { start: 0, action: 1, decision: 2, end: 3 };
      return (order[nodeA.type] || 1) - (order[nodeB.type] || 1);
    });

    // Center the layer vertically
    const totalHeight = (layerNodes.length - 1) * NODE_GAP_Y;
    const startY = 100 + (totalHeight > 0 ? -totalHeight / 2 : 0);

    for (let i = 0; i < layerNodes.length; i++) {
      positioned.set(layerNodes[i], {
        x,
        y: startY + i * NODE_GAP_Y,
      });
    }
  }

  // Adjust: ensure all y positions are >= 50
  let minY = Infinity;
  for (const pos of positioned.values()) {
    if (pos.y < minY) minY = pos.y;
  }
  const yOffset = minY < 50 ? 50 - minY : 0;

  return nodes.map((node) => {
    const pos = positioned.get(node.id);
    if (!pos) return { ...node, position: { x: 100, y: 100 } };
    return {
      ...node,
      position: {
        x: pos.x,
        y: pos.y + yOffset,
      },
    };
  });
}
