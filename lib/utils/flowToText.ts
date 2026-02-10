import type { FlowData, FlowNode, FlowEdge, FlowTextFormat } from '@/types/flow';

/**
 * Wrapper: converts FlowData to text in the specified format.
 */
export function flowDataToText(
  flowData: FlowData,
  flowName: string,
  format: FlowTextFormat,
  availableFlows?: { id: string; name: string }[]
): string {
  if (format === 'mermaid') {
    return flowDataToMermaid(flowData, flowName, availableFlows);
  }
  return flowDataToStructuredText(flowData, flowName, availableFlows);
}

/**
 * Converts FlowData to numbered structured text.
 * Output example:
 *   ## FLOW_NAME
 *   1. [Inicio] Saludo
 *   2. [Accion] Preguntar sobre el negocio
 *   3. [Decision] Tiene interes?
 *      - Si → Paso 4
 *      - No → Paso 6
 */
export function flowDataToStructuredText(
  flowData: FlowData,
  flowName: string,
  availableFlows?: { id: string; name: string }[]
): string {
  const { nodes, edges } = flowData;
  if (nodes.length === 0) return '';

  const ordered = topologicalOrder(nodes, edges);
  const stepMap = buildStepMap(ordered);
  const outgoing = buildOutgoingMap(nodes, edges);

  const lines: string[] = [`## ${flowName}`, ''];

  for (const node of ordered) {
    const stepNum = stepMap.get(node.id)!;
    const typeLabel = getTypeLabel(node.type);
    const desc = getNodeDescription(node);

    if (desc) {
      lines.push(`${stepNum}. [${typeLabel}] ${node.label}: ${desc}`);
    } else {
      lines.push(`${stepNum}. [${typeLabel}] ${node.label}`);
    }

    // For decision nodes, list branches as sub-items
    if (node.type === 'decision') {
      const nodeEdges = outgoing.get(node.id) || [];
      for (const edge of nodeEdges) {
        const targetStep = stepMap.get(edge.target);
        const branchLabel = edge.label || edge.sourceHandle || '→';
        if (targetStep) {
          lines.push(`   - ${branchLabel} → Paso ${targetStep}`);
        }
      }
    }

    // For end nodes with cross-flow reference, show target flow name
    if (node.type === 'end' && node.data?.crossFlowRef && availableFlows) {
      const targetFlow = availableFlows.find(f => f.id === node.data!.crossFlowRef);
      if (targetFlow) {
        lines.push(`   → Continua en: ${targetFlow.name}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Converts FlowData to Mermaid graph syntax.
 * Output example:
 *   ## FLOW_NAME
 *   ```mermaid
 *   graph TD
 *       start["Saludo"]
 *       action1["Preguntar"]
 *       ...
 *   ```
 */
export function flowDataToMermaid(
  flowData: FlowData,
  flowName: string,
  availableFlows?: { id: string; name: string }[]
): string {
  const { nodes, edges } = flowData;
  if (nodes.length === 0) return '';

  const ordered = topologicalOrder(nodes, edges);
  const idMap = buildMermaidIdMap(ordered);

  const lines: string[] = [`## ${flowName}`, '', '```mermaid', 'graph TD'];

  // Node definitions
  for (const node of ordered) {
    const mid = idMap.get(node.id)!;
    const label = escapeMermaidLabel(node.label);
    const desc = getNodeDescription(node);

    // For end nodes with cross-flow ref, append target flow name
    let crossFlowSuffix = '';
    if (node.type === 'end' && node.data?.crossFlowRef && availableFlows) {
      const targetFlow = availableFlows.find(f => f.id === node.data!.crossFlowRef);
      if (targetFlow) {
        crossFlowSuffix = `\\n→ ${escapeMermaidLabel(targetFlow.name)}`;
      }
    }

    const fullLabel = desc
      ? `${label}: ${escapeMermaidLabel(desc)}${crossFlowSuffix}`
      : `${label}${crossFlowSuffix}`;

    if (node.type === 'decision') {
      lines.push(`    ${mid}{"${fullLabel}"}`);
    } else {
      lines.push(`    ${mid}["${fullLabel}"]`);
    }
  }

  lines.push('');

  // Edge definitions
  for (const edge of edges) {
    const srcId = idMap.get(edge.source);
    const tgtId = idMap.get(edge.target);
    if (!srcId || !tgtId) continue;

    const label = edge.label || edge.sourceHandle;
    if (label) {
      lines.push(`    ${srcId} -- ${escapeMermaidLabel(label)} --> ${tgtId}`);
    } else {
      lines.push(`    ${srcId} --> ${tgtId}`);
    }
  }

  lines.push('```');

  return lines.join('\n');
}

// --- Internal helpers ---

/**
 * BFS from start nodes to produce topological ordering.
 */
function topologicalOrder(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
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

  // Start nodes: type=start or no incoming edges
  const startNodes = nodes.filter(
    (n) => n.type === 'start' || (incoming.get(n.id)?.length === 0)
  );

  const visited = new Set<string>();
  const result: FlowNode[] = [];
  const queue: string[] = [];

  for (const n of startNodes) {
    visited.add(n.id);
    queue.push(n.id);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodes.find((n) => n.id === id);
    if (node) result.push(node);

    const targets = outgoing.get(id) || [];
    for (const target of targets) {
      if (!visited.has(target)) {
        visited.add(target);
        queue.push(target);
      }
    }
  }

  // Add any unvisited nodes at the end
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      result.push(node);
    }
  }

  return result;
}

/**
 * Assigns step numbers (1-based) to each node.
 */
function buildStepMap(ordered: FlowNode[]): Map<string, number> {
  const map = new Map<string, number>();
  ordered.forEach((node, i) => map.set(node.id, i + 1));
  return map;
}

/**
 * Builds readable Mermaid IDs: start, action1, decision1, end1, etc.
 */
function buildMermaidIdMap(ordered: FlowNode[]): Map<string, string> {
  const map = new Map<string, string>();
  const counters: Record<string, number> = {};

  for (const node of ordered) {
    const type = node.type;
    if (!counters[type]) counters[type] = 0;
    counters[type]++;

    const count = counters[type];
    // Use singular ID for first of each type, numbered for subsequent
    const mid = count === 1 ? type : `${type}${count}`;
    map.set(node.id, mid);
  }

  return map;
}

/**
 * Builds outgoing edge map: nodeId → edges[]
 */
function buildOutgoingMap(nodes: FlowNode[], edges: FlowEdge[]): Map<string, FlowEdge[]> {
  const map = new Map<string, FlowEdge[]>();
  for (const node of nodes) {
    map.set(node.id, []);
  }
  for (const edge of edges) {
    map.get(edge.source)?.push(edge);
  }
  return map;
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    start: 'Inicio',
    end: 'Fin',
    action: 'Accion',
    decision: 'Decision',
  };
  return labels[type] || type;
}

function getNodeDescription(node: FlowNode): string | null {
  if (node.data?.description) return node.data.description;
  if (node.data?.instructions) return node.data.instructions;
  if (node.data?.condition) return node.data.condition;
  return null;
}

function escapeMermaidLabel(text: string): string {
  return text.replace(/"/g, "'").replace(/[[\]{}()]/g, '');
}
