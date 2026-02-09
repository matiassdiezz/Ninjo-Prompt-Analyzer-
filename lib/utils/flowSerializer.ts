import type { FlowData } from '@/types/flow';
import { getFlowTagPosition, hasFlowInPrompt } from './flowParser';
import { generateAsciiFlow } from './asciiFlowGenerator';
import { getAsciiFlowBounds } from './asciiFlowParser';

/**
 * Serializes flow data to a JSON string wrapped in <flow> tags.
 */
export function serializeFlowData(data: FlowData): string {
  const json = JSON.stringify(data, null, 2);
  return `<flow>\n${json}\n</flow>`;
}

/**
 * Updates the prompt with new flow data.
 * If the prompt already has a <flow> tag, it replaces it.
 * Otherwise, it appends the flow tag at the end.
 */
export function updatePromptWithFlow(prompt: string, flowData: FlowData): string {
  const flowTag = serializeFlowData(flowData);

  if (hasFlowInPrompt(prompt)) {
    // Replace existing flow tag
    return prompt.replace(/<flow>\s*[\s\S]*?\s*<\/flow>/i, flowTag);
  }

  // Append flow tag at the end (with two newlines for separation)
  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt) {
    return `${trimmedPrompt}\n\n${flowTag}`;
  }

  return flowTag;
}

/**
 * Removes the flow tag from a prompt.
 */
export function removeFlowFromPrompt(prompt: string): string {
  if (!prompt) return '';

  // Remove flow tag and clean up extra whitespace
  return prompt
    .replace(/<flow>\s*[\s\S]*?\s*<\/flow>/i, '')
    .replace(/\n{3,}/g, '\n\n') // Remove multiple consecutive newlines
    .trim();
}

/**
 * Checks if flow data is empty (no nodes).
 */
export function isFlowEmpty(data: FlowData | null): boolean {
  if (!data) return true;
  return !data.nodes || data.nodes.length === 0;
}

/**
 * Creates an initial flow with start and end nodes.
 */
export function createInitialFlow(): FlowData {
  return {
    nodes: [
      {
        id: 'start',
        type: 'start',
        label: 'Inicio',
        position: { x: 250, y: 50 },
      },
      {
        id: 'end',
        type: 'end',
        label: 'Fin',
        position: { x: 250, y: 400 },
      },
    ],
    edges: [],
  };
}

/**
 * Inserts a readable ASCII flow diagram into the prompt.
 * - Removes any existing <flow> JSON tag
 * - Replaces any existing ASCII flow section, or appends at end
 */
export function insertAsciiFlowInPrompt(prompt: string, flowData: FlowData): string {
  const ascii = generateAsciiFlow(flowData);
  if (!ascii) return prompt;

  const section = `# FLUJO DE CONVERSACION\n\`\`\`\n${ascii}\n\`\`\``;

  // 1. Remove existing <flow> JSON tag
  let result = removeFlowFromPrompt(prompt);

  // 2. Check for existing ASCII flow section (to replace)
  const bounds = getAsciiFlowBounds(result);
  if (bounds) {
    const before = result.substring(0, bounds.start);
    const after = result.substring(bounds.end);
    result = `${before.trimEnd()}\n\n${section}\n\n${after.trimStart()}`.trim();
  } else {
    // Append at end
    result = `${result.trimEnd()}\n\n${section}`;
  }

  return result;
}
