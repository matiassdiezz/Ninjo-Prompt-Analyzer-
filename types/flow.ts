// Flow node types for the flowchart
export type FlowNodeType = 'start' | 'end' | 'action' | 'decision';

// Position in the canvas
export interface FlowPosition {
  x: number;
  y: number;
}

// Base flow node
export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  position: FlowPosition;
  // Additional data specific to node type
  data?: {
    description?: string;
    condition?: string; // For decision nodes
    action?: string; // For action nodes
    instructions?: string; // Agent instructions for this step
    keywords?: string[]; // Keywords/triggers that activate this node
  };
}

// Flow edge (connection between nodes)
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  // For decision nodes: which branch (e.g., "yes", "no")
  sourceHandle?: string;
}

// Complete flow data structure
export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// Tracks where a flow was extracted from in the prompt (for roundtrip reinsertion)
export interface FlowSourceOrigin {
  rawText: string;        // Original text block that was extracted
  name: string;           // Flow name (e.g. "RESOURCE_FLOW")
  headerAnchor: string;   // First line of the header, used as fallback search anchor
}

// Output format for flow-to-text conversion
export type FlowTextFormat = 'structured' | 'mermaid';

// React Flow node data - includes index signature for React Flow compatibility
export interface ReactFlowNodeData {
  label: string;
  description?: string;
  condition?: string;
  action?: string;
  instructions?: string;
  keywords?: string[];
  onLabelChange?: (label: string) => void;
  onDelete?: () => void;
  isSelected?: boolean;
  [key: string]: unknown;
}

// Node colors config
export const NODE_COLORS: Record<FlowNodeType, { bg: string; border: string; text: string }> = {
  start: {
    bg: 'var(--success-subtle)',
    border: 'var(--success)',
    text: 'var(--success)',
  },
  end: {
    bg: 'var(--error-subtle)',
    border: 'var(--error)',
    text: 'var(--error)',
  },
  action: {
    bg: 'var(--bg-elevated)',
    border: 'var(--accent-primary)',
    text: 'var(--text-primary)',
  },
  decision: {
    bg: 'var(--warning-subtle)',
    border: 'var(--warning)',
    text: 'var(--warning)',
  },
};

// Node dimensions
export const NODE_DIMENSIONS: Record<FlowNodeType, { width: number; height: number }> = {
  start: { width: 100, height: 50 },
  end: { width: 100, height: 50 },
  action: { width: 200, height: 80 },
  decision: { width: 150, height: 100 },
};
