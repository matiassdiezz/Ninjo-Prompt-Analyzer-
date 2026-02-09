import type { FlowData, FlowNode, FlowEdge } from '@/types/flow';
import { detectAsciiFlow } from '@/lib/utils/asciiFlowParser';
import { detectTextFlows } from '@/lib/utils/textFlowDetector';

/**
 * Extracts flow data from a prompt string.
 * Looks for a <flow> tag containing JSON data.
 */
export function parseFlowFromPrompt(prompt: string): FlowData | null {
  if (!prompt) return null;

  // Match <flow> tag with JSON content
  const flowMatch = prompt.match(/<flow>\s*([\s\S]*?)\s*<\/flow>/i);

  if (!flowMatch || !flowMatch[1]) {
    return null;
  }

  try {
    const jsonContent = flowMatch[1].trim();
    const parsed = JSON.parse(jsonContent);

    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    // Ensure arrays exist
    const nodes: FlowNode[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const edges: FlowEdge[] = Array.isArray(parsed.edges) ? parsed.edges : [];

    // Validate and sanitize nodes
    const validNodes = nodes.filter((node): node is FlowNode => {
      return (
        node &&
        typeof node.id === 'string' &&
        typeof node.type === 'string' &&
        typeof node.label === 'string' &&
        node.position &&
        typeof node.position.x === 'number' &&
        typeof node.position.y === 'number'
      );
    });

    // Validate and sanitize edges
    const validEdges = edges.filter((edge): edge is FlowEdge => {
      return (
        edge &&
        typeof edge.id === 'string' &&
        typeof edge.source === 'string' &&
        typeof edge.target === 'string'
      );
    });

    return {
      nodes: validNodes,
      edges: validEdges,
    };
  } catch (error) {
    console.warn('Failed to parse flow data:', error);
    return null;
  }
}

/**
 * Checks if a prompt contains flow data.
 */
export function hasFlowInPrompt(prompt: string): boolean {
  if (!prompt) return false;
  return /<flow>\s*[\s\S]*?\s*<\/flow>/i.test(prompt);
}

/**
 * Gets the position (start/end indices) of the flow tag in the prompt.
 */
export function getFlowTagPosition(prompt: string): { start: number; end: number } | null {
  if (!prompt) return null;

  const match = prompt.match(/<flow>\s*[\s\S]*?\s*<\/flow>/i);
  if (!match || match.index === undefined) return null;

  return {
    start: match.index,
    end: match.index + match[0].length,
  };
}

/**
 * Extracts the prompt content without the flow tag.
 */
export function getPromptWithoutFlow(prompt: string): string {
  if (!prompt) return '';
  return prompt.replace(/<flow>\s*[\s\S]*?\s*<\/flow>/i, '').trim();
}

/**
 * Checks if a prompt contains ASCII art flow diagrams (no <flow> JSON tag).
 */
export function hasAsciiFlowInPrompt(prompt: string): boolean {
  if (!prompt) return false;
  if (hasFlowInPrompt(prompt)) return false; // Already has JSON flow
  const detection = detectAsciiFlow(prompt);
  return detection !== null && detection.confidence > 0.5;
}

/**
 * Checks if a prompt contains text-based flow sections (## X_FLOW style).
 * Returns true if at least one text flow section is detected with sufficient confidence.
 */
export function hasTextFlowInPromptCheck(prompt: string): boolean {
  if (!prompt) return false;
  if (hasFlowInPrompt(prompt)) return false;
  const flows = detectTextFlows(prompt);
  return flows.length > 0;
}
