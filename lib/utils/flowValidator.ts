import type { FlowData, FlowNode, FlowEdge } from '@/types/flow';

export type FlowValidationRule =
  | 'missing-start'
  | 'missing-end'
  | 'unreachable-node'
  | 'dead-end-node'
  | 'decision-insufficient-branches'
  | 'self-loop'
  | 'empty-label';

export interface FlowValidationWarning {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
  rule: FlowValidationRule;
}

/**
 * Validates a flow and returns an array of warnings sorted by severity.
 */
export function validateFlow(data: FlowData): FlowValidationWarning[] {
  const warnings: FlowValidationWarning[] = [];
  const { nodes, edges } = data;

  if (nodes.length === 0) return warnings;

  // Build adjacency lists
  const outgoing = new Map<string, FlowEdge[]>();
  const incoming = new Map<string, FlowEdge[]>();

  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of edges) {
    outgoing.get(edge.source)?.push(edge);
    incoming.get(edge.target)?.push(edge);
  }

  // 1. Missing start
  const startNodes = nodes.filter((n) => n.type === 'start');
  if (startNodes.length === 0) {
    warnings.push({
      id: 'missing-start',
      severity: 'error',
      message: 'El flujo no tiene nodo de inicio',
      rule: 'missing-start',
    });
  }

  // 2. Missing end
  const endNodes = nodes.filter((n) => n.type === 'end');
  if (endNodes.length === 0) {
    warnings.push({
      id: 'missing-end',
      severity: 'error',
      message: 'El flujo no tiene nodo de fin',
      rule: 'missing-end',
    });
  }

  // 3. Unreachable nodes (BFS from all start nodes)
  if (startNodes.length > 0) {
    const visited = new Set<string>();
    const queue: string[] = startNodes.map((n) => n.id);

    for (const id of queue) {
      visited.add(id);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const targets = outgoing.get(current) || [];
      for (const edge of targets) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    for (const node of nodes) {
      if (!visited.has(node.id) && node.type !== 'start') {
        warnings.push({
          id: `unreachable-${node.id}`,
          severity: 'error',
          message: `El nodo "${node.label}" no es alcanzable desde el inicio`,
          nodeId: node.id,
          rule: 'unreachable-node',
        });
      }
    }
  }

  // 4. Dead-end nodes (no outgoing edges, not an end node)
  for (const node of nodes) {
    if (node.type === 'end') continue;
    const out = outgoing.get(node.id) || [];
    if (out.length === 0) {
      warnings.push({
        id: `dead-end-${node.id}`,
        severity: 'warning',
        message: `El nodo "${node.label}" no tiene conexiones de salida`,
        nodeId: node.id,
        rule: 'dead-end-node',
      });
    }
  }

  // 5. Decision nodes with insufficient branches
  const decisionNodes = nodes.filter((n) => n.type === 'decision');
  for (const node of decisionNodes) {
    const out = outgoing.get(node.id) || [];
    if (out.length < 2) {
      warnings.push({
        id: `decision-branches-${node.id}`,
        severity: 'warning',
        message: `El nodo de decision "${node.label}" deberia tener al menos 2 ramas`,
        nodeId: node.id,
        rule: 'decision-insufficient-branches',
      });
    }
  }

  // 6. Self-loops
  for (const edge of edges) {
    if (edge.source === edge.target) {
      const node = nodes.find((n) => n.id === edge.source);
      warnings.push({
        id: `self-loop-${edge.id}`,
        severity: 'warning',
        message: `El nodo "${node?.label || edge.source}" se conecta a si mismo`,
        nodeId: edge.source,
        rule: 'self-loop',
      });
    }
  }

  // 7. Empty labels
  for (const node of nodes) {
    if (!node.label || node.label.trim() === '') {
      warnings.push({
        id: `empty-label-${node.id}`,
        severity: 'info',
        message: 'Un nodo tiene una etiqueta vacia',
        nodeId: node.id,
        rule: 'empty-label',
      });
    }
  }

  // Sort by severity: error > warning > info
  const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return warnings;
}

/**
 * Returns true if the flow has no errors (warnings and info are OK).
 */
export function isFlowValid(data: FlowData): boolean {
  const warnings = validateFlow(data);
  return !warnings.some((w) => w.severity === 'error');
}
