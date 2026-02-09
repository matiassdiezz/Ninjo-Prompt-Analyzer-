import { create } from 'zustand';
import type { FlowNode, FlowEdge, FlowData, FlowNodeType, FlowPosition } from '@/types/flow';
import { NODE_DIMENSIONS } from '@/types/flow';
import type { FlowValidationWarning } from '@/lib/utils/flowValidator';
import type { TextFlowDetection } from '@/lib/utils/textFlowDetector';

const MAX_HISTORY = 30;

interface FlowStore {
  // State
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  hasUnsavedChanges: boolean;

  // Edge selection
  selectedEdgeId: string | null;
  flowHistory: FlowData[];
  flowFuture: FlowData[];
  canUndoFlow: boolean;
  canRedoFlow: boolean;

  // ASCII detection state
  detectedAsciiFlow: boolean;
  asciiFlowBlock: string | null;

  // Validation state
  validationWarnings: FlowValidationWarning[];
  showValidationPanel: boolean;

  // Text flow detection state
  detectedTextFlows: TextFlowDetection[];
  isExtractingFlow: boolean;

  // Generation state
  isGeneratingFlow: boolean;

  // Actions - Data management
  setFlowData: (data: FlowData) => void;
  getFlowData: () => FlowData;
  clearFlow: () => void;

  // Actions - Undo/Redo
  pushFlowHistory: () => void;
  undoFlow: () => void;
  redoFlow: () => void;
  commitNodePositions: () => void;

  // Actions - Nodes
  addNode: (type: FlowNodeType, position?: FlowPosition) => string;
  updateNode: (id: string, updates: Partial<FlowNode>) => void;
  updateNodePosition: (id: string, position: FlowPosition) => void;
  updateNodeLabel: (id: string, label: string) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;

  // Actions - Edge selection
  selectEdge: (id: string | null) => void;
  clearSelection: () => void;
  updateEdge: (id: string, updates: Partial<FlowEdge>) => void;
  deleteEdge: (id: string) => void;

  // Actions - Sync
  markAsSaved: () => void;
  markAsChanged: () => void;

  // Actions - ASCII detection
  setAsciiDetected: (detected: boolean, block?: string) => void;
  clearAsciiDetection: () => void;

  // Actions - Validation
  setValidationWarnings: (warnings: FlowValidationWarning[]) => void;
  toggleValidationPanel: () => void;

  // Actions - Text flow detection
  setTextFlowsDetected: (flows: TextFlowDetection[]) => void;
  clearTextFlowDetection: () => void;
  setExtractingFlow: (extracting: boolean) => void;

  // Actions - Generation
  setGeneratingFlow: (generating: boolean) => void;
}

// Generate unique IDs
const generateId = () => crypto.randomUUID().slice(0, 8);

// Find a good position for a new node
const findAvailablePosition = (nodes: FlowNode[], type: FlowNodeType): FlowPosition => {
  const baseX = 250;
  const baseY = 100;
  const spacing = 120;

  if (nodes.length === 0) {
    return { x: baseX, y: baseY };
  }

  // Find the lowest y position and place below
  const maxY = Math.max(...nodes.map(n => n.position.y + (NODE_DIMENSIONS[n.type]?.height || 80)));
  return { x: baseX, y: maxY + spacing };
};

export const useFlowStore = create<FlowStore>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNodeId: null,
  hasUnsavedChanges: false,
  flowHistory: [],
  flowFuture: [],
  canUndoFlow: false,
  canRedoFlow: false,
  detectedAsciiFlow: false,
  asciiFlowBlock: null,
  validationWarnings: [],
  showValidationPanel: false,
  detectedTextFlows: [],
  isExtractingFlow: false,
  selectedEdgeId: null,
  isGeneratingFlow: false,

  // --- Undo/Redo ---
  pushFlowHistory: () => {
    const { nodes, edges, flowHistory } = get();
    const snapshot: FlowData = {
      nodes: nodes.map(n => ({ ...n, position: { ...n.position }, data: n.data ? { ...n.data } : undefined })),
      edges: edges.map(e => ({ ...e })),
    };
    const newHistory = [...flowHistory, snapshot];
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    set({
      flowHistory: newHistory,
      flowFuture: [],
      canUndoFlow: true,
      canRedoFlow: false,
    });
  },

  undoFlow: () => {
    const { flowHistory, nodes, edges, flowFuture } = get();
    if (flowHistory.length === 0) return;

    const currentSnapshot: FlowData = {
      nodes: nodes.map(n => ({ ...n, position: { ...n.position }, data: n.data ? { ...n.data } : undefined })),
      edges: edges.map(e => ({ ...e })),
    };
    const newHistory = [...flowHistory];
    const previous = newHistory.pop()!;
    const newFuture = [...flowFuture, currentSnapshot];

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      flowHistory: newHistory,
      flowFuture: newFuture,
      canUndoFlow: newHistory.length > 0,
      canRedoFlow: true,
      hasUnsavedChanges: true,
    });
  },

  redoFlow: () => {
    const { flowFuture, nodes, edges, flowHistory } = get();
    if (flowFuture.length === 0) return;

    const currentSnapshot: FlowData = {
      nodes: nodes.map(n => ({ ...n, position: { ...n.position }, data: n.data ? { ...n.data } : undefined })),
      edges: edges.map(e => ({ ...e })),
    };
    const newFuture = [...flowFuture];
    const next = newFuture.pop()!;
    const newHistory = [...flowHistory, currentSnapshot];

    set({
      nodes: next.nodes,
      edges: next.edges,
      flowHistory: newHistory,
      flowFuture: newFuture,
      canUndoFlow: true,
      canRedoFlow: newFuture.length > 0,
      hasUnsavedChanges: true,
    });
  },

  commitNodePositions: () => {
    // Called on drag stop — pushes a single snapshot for the whole drag
    get().pushFlowHistory();
  },

  // Data management
  setFlowData: (data: FlowData) => {
    const { nodes } = get();
    // Only push history if there are already nodes (avoid push on initial load)
    if (nodes.length > 0) {
      get().pushFlowHistory();
    }
    set({
      nodes: data.nodes || [],
      edges: data.edges || [],
      hasUnsavedChanges: false,
    });
  },

  getFlowData: () => {
    const { nodes, edges } = get();
    return { nodes, edges };
  },

  clearFlow: () => {
    const { nodes } = get();
    if (nodes.length > 0) {
      get().pushFlowHistory();
    }
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      hasUnsavedChanges: false,
    });
  },

  // Node actions
  addNode: (type: FlowNodeType, position?: FlowPosition) => {
    const state = get();
    state.pushFlowHistory();
    const { nodes } = state;
    const id = generateId();

    const defaultLabels: Record<FlowNodeType, string> = {
      start: 'Inicio',
      end: 'Fin',
      action: 'Nueva accion',
      decision: 'Condicion?',
    };

    const newNode: FlowNode = {
      id,
      type,
      label: defaultLabels[type],
      position: position || findAvailablePosition(nodes, type),
      data: {},
    };

    set({
      nodes: [...nodes, newNode],
      selectedNodeId: id,
      hasUnsavedChanges: true,
    });

    return id;
  },

  updateNode: (id: string, updates: Partial<FlowNode>) => {
    get().pushFlowHistory();
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      ),
      hasUnsavedChanges: true,
    }));
  },

  updateNodePosition: (id: string, position: FlowPosition) => {
    // NO history push here — called on every drag frame
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, position } : node
      ),
      hasUnsavedChanges: true,
    }));
  },

  updateNodeLabel: (id: string, label: string) => {
    get().pushFlowHistory();
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, label } : node
      ),
      hasUnsavedChanges: true,
    }));
  },

  deleteNode: (id: string) => {
    get().pushFlowHistory();
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      // Also remove edges connected to this node
      edges: state.edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      ),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      hasUnsavedChanges: true,
    }));
  },

  selectNode: (id: string | null) => {
    set({ selectedNodeId: id, selectedEdgeId: null });
  },

  selectEdge: (id: string | null) => {
    set({ selectedEdgeId: id, selectedNodeId: null });
  },

  clearSelection: () => {
    set({ selectedNodeId: null, selectedEdgeId: null });
  },

  // Edge actions
  addEdge: (source: string, target: string, label?: string, sourceHandle?: string) => {
    const state = get();
    const { edges } = state;

    // Don't allow duplicate edges
    const exists = edges.some(
      (e) => e.source === source && e.target === target
    );
    if (exists) return '';

    state.pushFlowHistory();

    const id = `e-${generateId()}`;
    const newEdge: FlowEdge = {
      id,
      source,
      target,
      ...(label && { label }),
      ...(sourceHandle && { sourceHandle }),
    };

    set({
      edges: [...edges, newEdge],
      hasUnsavedChanges: true,
    });

    return id;
  },

  updateEdge: (id: string, updates: Partial<FlowEdge>) => {
    get().pushFlowHistory();
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === id ? { ...edge, ...updates } : edge
      ),
      hasUnsavedChanges: true,
    }));
  },

  deleteEdge: (id: string) => {
    get().pushFlowHistory();
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
      hasUnsavedChanges: true,
    }));
  },

  // Sync actions
  markAsSaved: () => {
    set({ hasUnsavedChanges: false });
  },

  markAsChanged: () => {
    set({ hasUnsavedChanges: true });
  },

  // ASCII detection actions
  setAsciiDetected: (detected: boolean, block?: string) => {
    set({
      detectedAsciiFlow: detected,
      asciiFlowBlock: block || null,
    });
  },

  clearAsciiDetection: () => {
    set({
      detectedAsciiFlow: false,
      asciiFlowBlock: null,
    });
  },

  // Validation actions
  setValidationWarnings: (warnings: FlowValidationWarning[]) => {
    set({ validationWarnings: warnings });
  },

  toggleValidationPanel: () => {
    set((state) => ({ showValidationPanel: !state.showValidationPanel }));
  },

  // Text flow detection actions
  setTextFlowsDetected: (flows: TextFlowDetection[]) => {
    set({ detectedTextFlows: flows });
  },

  clearTextFlowDetection: () => {
    set({ detectedTextFlows: [], isExtractingFlow: false });
  },

  setExtractingFlow: (extracting: boolean) => {
    set({ isExtractingFlow: extracting });
  },

  // Generation actions
  setGeneratingFlow: (generating: boolean) => {
    set({ isGeneratingFlow: generating });
  },
}));
