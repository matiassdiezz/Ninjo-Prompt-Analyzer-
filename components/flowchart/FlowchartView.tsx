'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { FileText, Loader2, Info } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';

import { FlowchartCanvas } from './FlowchartCanvas';
import { FlowToolbar } from './FlowToolbar';
import { FlowTabBar } from './FlowTabBar';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { EdgePropertiesPanel } from './EdgePropertiesPanel';
import { FlowValidationPanel } from './FlowValidationPanel';
import { FlowGenerateModal } from './FlowGenerateModal';
import { FlowTemplatesModal } from './FlowTemplatesModal';
import { FlowToPromptModal } from './FlowToPromptModal';
import { useFlowStore } from '@/store/flowStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { useFlowSync } from '@/lib/hooks/useFlowSync';
import { validateFlow } from '@/lib/utils/flowValidator';
import { generateAsciiFlow } from '@/lib/utils/asciiFlowGenerator';
import { autoLayoutFlow } from '@/lib/utils/flowLayoutEngine';
import type { FlowNode, FlowNodeType, FlowData, FlowEdge } from '@/types/flow';
import { createInitialFlow } from '@/lib/utils/flowSerializer';

interface FlowchartViewProps {
  onClose: () => void;
}

function FlowchartViewContent(_props: FlowchartViewProps) {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    addNode,
    updateNode,
    updateNodePosition,
    deleteNode,
    selectNode,
    selectEdge,
    setFlowData,
    clearFlow,

    detectedAsciiFlow,
    detectedTextFlows,
    isExtractingFlow,
    clearTextFlowDetection,
    validationWarnings,
    showValidationPanel,
    setValidationWarnings,
    toggleValidationPanel,
    clearAsciiDetection,
    getFlowData,
    markAsChanged,
    // Undo/Redo
    undoFlow,
    redoFlow,
    canUndoFlow,
    canRedoFlow,
    pushFlowHistory,
    // Edge actions
    updateEdge,
    deleteEdge,
  } = useFlowStore();

  // Multi-flow state from flowStore
  const availableFlows = useFlowStore((s) => s.availableFlows);
  const storeActiveFlowId = useFlowStore((s) => s.activeFlowId);
  const setStoreActiveFlowId = useFlowStore((s) => s.setActiveFlowId);

  // Knowledge store for flow CRUD
  const {
    currentProjectId,
    projects,
    addFlow: addFlowToAgent,
    renameFlow: renameFlowInAgent,
    deleteFlow: deleteFlowFromAgent,
    updateFlow: updateFlowInAgent,
  } = useKnowledgeStore();
  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentAgentId = currentProject?.currentAgentId || null;

  // Initialize sync with agent.flows (includes ASCII + text flow detection)
  const { convertAsciiToFlow, insertAsciiInPrompt, convertTextFlowToVisual, convertAllTextFlows, insertFlowBackInPrompt } = useFlowSync();

  // Source origin for roundtrip reinsertion
  const flowSourceOrigin = useFlowStore((s) => s.flowSourceOrigin);

  // Get React Flow instance for fit view
  const reactFlowInstance = useReactFlow();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) || null;

  // Modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showToPromptModal, setShowToPromptModal] = useState(false);

  const { addToast } = useToastStore();

  // Reactive validation (debounced 300ms)
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (nodes.length === 0) {
      setValidationWarnings([]);
      return;
    }

    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    validationTimerRef.current = setTimeout(() => {
      const warnings = validateFlow({ nodes, edges });
      setValidationWarnings(warnings);
    }, 300);

    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [nodes, edges, setValidationWarnings]);

  // Handlers
  const handleAddNode = useCallback(
    (type: FlowNodeType) => {
      const flowContainer = document.querySelector('.react-flow');
      if (flowContainer) {
        const rect = flowContainer.getBoundingClientRect();
        const centerPosition = reactFlowInstance.screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });

        // Offset if another node is already at this position
        const currentNodes = useFlowStore.getState().nodes;
        const SNAP = 50;
        let ox = 0;
        let oy = 0;
        while (
          currentNodes.some(
            (n) =>
              Math.abs(n.position.x - (centerPosition.x + ox)) < SNAP &&
              Math.abs(n.position.y - (centerPosition.y + oy)) < SNAP
          )
        ) {
          ox += 30;
          oy += 30;
        }

        addNode(type, { x: centerPosition.x + ox, y: centerPosition.y + oy });
      } else {
        addNode(type);
      }
    },
    [addNode, reactFlowInstance]
  );

  const handleNodesChange = useCallback(
    (updatedNodes: FlowNode[]) => {
      updatedNodes.forEach((node) => {
        const existingNode = nodes.find((n) => n.id === node.id);
        if (
          existingNode &&
          (existingNode.position.x !== node.position.x ||
            existingNode.position.y !== node.position.y)
        ) {
          updateNodePosition(node.id, node.position);
        }
      });
    },
    [nodes, updateNodePosition]
  );

  const handleEdgesChange = useCallback(
    (updatedEdges: typeof edges) => {
      setFlowData({ nodes, edges: updatedEdges });
    },
    [nodes, setFlowData]
  );

  const handleUpdateEdge = useCallback(
    (id: string, updates: Partial<FlowEdge>) => {
      updateEdge(id, updates);
    },
    [updateEdge]
  );

  const handleDeleteEdge = useCallback(
    (id: string) => {
      deleteEdge(id);
      selectEdge(null);
    },
    [deleteEdge, selectEdge]
  );

  const handleEdgeSelect = useCallback(
    (edgeId: string | null) => {
      selectEdge(edgeId);
    },
    [selectEdge]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    } else if (selectedEdgeId) {
      deleteEdge(selectedEdgeId);
      selectEdge(null);
    }
  }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge, selectEdge]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, maxZoom: 1.5 });
  }, [reactFlowInstance]);

  const handleCreateInitialFlow = useCallback(() => {
    if (!storeActiveFlowId && currentProjectId && currentAgentId) {
      const flowId = addFlowToAgent(currentProjectId, currentAgentId, 'Flujo Principal');
      setStoreActiveFlowId(flowId);
      const agent = useKnowledgeStore.getState().projects
        .find(p => p.id === currentProjectId)?.agents.find(a => a.id === currentAgentId);
      if (agent?.flows) {
        useFlowStore.getState().setAvailableFlows(agent.flows.map(f => ({ id: f.id, name: f.name })));
      }
    }
    const initialFlow = createInitialFlow();
    setFlowData(initialFlow);
  }, [setFlowData, storeActiveFlowId, currentProjectId, currentAgentId, addFlowToAgent, setStoreActiveFlowId]);

  const handleUpdateNode = useCallback(
    (id: string, updates: Partial<FlowNode>) => {
      updateNode(id, updates);
    },
    [updateNode]
  );

  const handleClosePropertiesPanel = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  // Go to node (select + fitView to it)
  const handleGoToNode = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        reactFlowInstance.setCenter(node.position.x + 100, node.position.y + 40, {
          zoom: 1.2,
          duration: 500,
        });
      }
    },
    [selectNode, nodes, reactFlowInstance]
  );

  // Apply generated flow — if no active flow, create a new NamedFlow first
  const handleApplyGeneratedFlow = useCallback(
    (flow: FlowData) => {
      if (!storeActiveFlowId && currentProjectId && currentAgentId) {
        const flowId = addFlowToAgent(currentProjectId, currentAgentId, 'Flujo Generado');
        setStoreActiveFlowId(flowId);
        const agent = useKnowledgeStore.getState().projects
          .find(p => p.id === currentProjectId)?.agents.find(a => a.id === currentAgentId);
        if (agent?.flows) {
          useFlowStore.getState().setAvailableFlows(agent.flows.map(f => ({ id: f.id, name: f.name })));
        }
      }
      setFlowData(flow);
      markAsChanged();
    },
    [setFlowData, markAsChanged, storeActiveFlowId, currentProjectId, currentAgentId, addFlowToAgent, setStoreActiveFlowId]
  );

  // Export ASCII
  const handleExportAscii = useCallback(() => {
    const flowData = getFlowData();
    const ascii = generateAsciiFlow(flowData);

    navigator.clipboard.writeText(ascii).then(() => {
      addToast('ASCII copiado al portapapeles', 'success');
    });
  }, [getFlowData]);

  // Clear flow
  const handleClearFlow = useCallback(() => {
    clearFlow();
    addToast('Flujo limpiado', 'success');
  }, [clearFlow, addToast]);

  // Auto-layout
  const handleAutoLayout = useCallback(() => {
    pushFlowHistory();
    const layoutedNodes = autoLayoutFlow(nodes, edges);
    setFlowData({ nodes: layoutedNodes, edges });
    markAsChanged();
    // Fit view after layout with small delay for React Flow to update
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, maxZoom: 1.5, duration: 400 });
    }, 50);
    addToast('Flujo organizado', 'success');
  }, [pushFlowHistory, nodes, edges, setFlowData, markAsChanged, reactFlowInstance, addToast]);

  // --- Flow Tab Bar handlers ---
  const handleSelectFlow = useCallback((flowId: string) => {
    setStoreActiveFlowId(flowId);
  }, [setStoreActiveFlowId]);

  const handleAddFlow = useCallback(() => {
    if (!currentProjectId || !currentAgentId) return;
    const flowId = addFlowToAgent(currentProjectId, currentAgentId, 'Nuevo Flujo');
    setStoreActiveFlowId(flowId);
    setFlowData({ nodes: [], edges: [] });
    // Refresh available flows
    const agent = useKnowledgeStore.getState().projects
      .find(p => p.id === currentProjectId)?.agents.find(a => a.id === currentAgentId);
    if (agent?.flows) {
      useFlowStore.getState().setAvailableFlows(agent.flows.map(f => ({ id: f.id, name: f.name })));
    }
  }, [currentProjectId, currentAgentId, addFlowToAgent, setStoreActiveFlowId, setFlowData]);

  const handleRenameFlow = useCallback((flowId: string, newName: string) => {
    if (!currentProjectId || !currentAgentId) return;
    renameFlowInAgent(currentProjectId, currentAgentId, flowId, newName);
    // Refresh available flows
    const agent = useKnowledgeStore.getState().projects
      .find(p => p.id === currentProjectId)?.agents.find(a => a.id === currentAgentId);
    if (agent?.flows) {
      useFlowStore.getState().setAvailableFlows(agent.flows.map(f => ({ id: f.id, name: f.name })));
    }
  }, [currentProjectId, currentAgentId, renameFlowInAgent]);

  const handleDeleteFlow = useCallback((flowId: string) => {
    if (!currentProjectId || !currentAgentId) return;
    deleteFlowFromAgent(currentProjectId, currentAgentId, flowId);
    // Refresh available flows + switch to new active
    const agent = useKnowledgeStore.getState().projects
      .find(p => p.id === currentProjectId)?.agents.find(a => a.id === currentAgentId);
    if (agent?.flows) {
      useFlowStore.getState().setAvailableFlows(agent.flows.map(f => ({ id: f.id, name: f.name })));
      if (agent.activeFlowId) {
        setStoreActiveFlowId(agent.activeFlowId);
      }
    }
    addToast('Flujo eliminado', 'success');
  }, [currentProjectId, currentAgentId, deleteFlowFromAgent, setStoreActiveFlowId, addToast]);

  const handleDuplicateFlow = useCallback((flowId: string) => {
    if (!currentProjectId || !currentAgentId) return;
    const agent = currentProject?.agents.find(a => a.id === currentAgentId);
    const sourceFlow = agent?.flows?.find(f => f.id === flowId);
    if (!sourceFlow) return;

    const newFlowId = addFlowToAgent(currentProjectId, currentAgentId, `${sourceFlow.name} (copia)`);
    updateFlowInAgent(currentProjectId, currentAgentId, newFlowId, {
      flowData: { nodes: [...sourceFlow.flowData.nodes], edges: [...sourceFlow.flowData.edges] },
      sourceOrigin: sourceFlow.sourceOrigin,
    });
    setStoreActiveFlowId(newFlowId);

    // Refresh available flows
    const updatedAgent = useKnowledgeStore.getState().projects
      .find(p => p.id === currentProjectId)?.agents.find(a => a.id === currentAgentId);
    if (updatedAgent?.flows) {
      useFlowStore.getState().setAvailableFlows(updatedAgent.flows.map(f => ({ id: f.id, name: f.name })));
    }
    addToast('Flujo duplicado', 'success');
  }, [currentProjectId, currentAgentId, currentProject, addFlowToAgent, updateFlowInAgent, setStoreActiveFlowId, addToast]);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* ASCII Detection Banner — hidden for now */}

      {/* Text Flow Detection Banner */}
      {detectedTextFlows.length > 0 && (
        <div
          className="flex flex-col gap-2 px-4 py-2.5 border-b"
          style={{
            background: 'rgba(0, 212, 170, 0.08)',
            borderColor: 'rgba(0, 212, 170, 0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-primary)' }} />
            <span
              className="text-sm flex-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {detectedTextFlows.length === 1
                ? `Se detecto un flujo de texto: ${detectedTextFlows[0].name}`
                : `Se detectaron ${detectedTextFlows.length} flujos de texto en el prompt`
              }
            </span>
            <button
              onClick={clearTextFlowDetection}
              className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Ignorar
            </button>
          </div>
          <div className="flex flex-wrap gap-2 ml-7">
            {detectedTextFlows.length > 1 && (
              <button
                onClick={convertAllTextFlows}
                disabled={isExtractingFlow}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                style={{
                  background: isExtractingFlow ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                  color: isExtractingFlow ? 'var(--text-muted)' : 'var(--bg-primary)',
                  opacity: isExtractingFlow ? 0.7 : 1,
                  cursor: isExtractingFlow ? 'not-allowed' : 'pointer',
                  border: '2px solid var(--accent-primary)',
                }}
              >
                {isExtractingFlow && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {isExtractingFlow
                  ? 'Extrayendo...'
                  : `Convertir todos (${detectedTextFlows.length} flujos)`
                }
              </button>
            )}
            {detectedTextFlows.map((flow, index) => (
              <button
                key={`${flow.name}-${index}`}
                onClick={() => convertTextFlowToVisual(index)}
                disabled={isExtractingFlow}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                style={{
                  background: isExtractingFlow ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                  color: isExtractingFlow ? 'var(--text-muted)' : 'var(--bg-primary)',
                  opacity: isExtractingFlow ? 0.7 : 1,
                  cursor: isExtractingFlow ? 'not-allowed' : 'pointer',
                }}
              >
                {isExtractingFlow && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {isExtractingFlow
                  ? 'Extrayendo...'
                  : `Convertir "${flow.name}" (${flow.stepCount} pasos)`
                }
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Source Origin Banner */}
      {flowSourceOrigin && nodes.length > 0 && (
        <div
          className="flex items-center gap-2.5 px-4 py-2 border-b"
          style={{
            background: 'rgba(168, 85, 247, 0.08)',
            borderColor: 'rgba(168, 85, 247, 0.2)',
          }}
        >
          <Info className="h-3.5 w-3.5 shrink-0" style={{ color: '#a855f7' }} />
          <span
            className="text-xs flex-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Extraido de <strong style={{ color: 'var(--text-primary)' }}>&quot;{flowSourceOrigin.name}&quot;</strong> — los cambios se pueden reinsertar en su posicion original
          </span>
        </div>
      )}

      {/* Toolbar */}
      <FlowToolbar
        onAddNode={handleAddNode}
        onDeleteSelected={handleDeleteSelected}
        onFitView={handleFitView}
        onCreateInitialFlow={handleCreateInitialFlow}
        hasNodes={nodes.length > 0}
        hasSelectedNode={!!selectedNodeId}
        selectedNodeType={selectedNode?.type}
        validationWarningCount={validationWarnings.length}
        onToggleValidation={toggleValidationPanel}
        onGenerateFromNL={() => setShowGenerateModal(true)}
        onExportAscii={handleExportAscii}
        onInsertInPrompt={insertAsciiInPrompt}
        onOpenTemplates={() => setShowTemplatesModal(true)}
        onGeneratePromptSections={() => setShowToPromptModal(true)}
        onUndo={undoFlow}
        onRedo={redoFlow}
        canUndo={canUndoFlow}
        canRedo={canRedoFlow}
        onClearFlow={handleClearFlow}
        onAutoLayout={handleAutoLayout}
        onReinsertFlowInPrompt={insertFlowBackInPrompt}
        hasSourceOrigin={!!flowSourceOrigin}
      />

      {/* Flow Tab Bar (shown when there are flows) */}
      {availableFlows.length > 0 && (
        <FlowTabBar
          flows={availableFlows}
          activeFlowId={storeActiveFlowId}
          onSelectFlow={handleSelectFlow}
          onAddFlow={handleAddFlow}
          onRenameFlow={handleRenameFlow}
          onDeleteFlow={handleDeleteFlow}
          onDuplicateFlow={handleDuplicateFlow}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Validation Panel (left) */}
        {showValidationPanel && nodes.length > 0 && (
          <FlowValidationPanel
            warnings={validationWarnings}
            onClose={toggleValidationPanel}
            onGoToNode={handleGoToNode}
          />
        )}

        {/* Canvas */}
        <div className="flex-1 min-w-0">
          {nodes.length > 0 ? (
            <FlowchartCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onNodeSelect={selectNode}
              onEdgeSelect={handleEdgeSelect}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onDeleteSelected={handleDeleteSelected}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center">
              <div
                className="p-4 rounded-2xl mb-4"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <FileText
                  className="h-12 w-12"
                  style={{ color: 'var(--text-muted)' }}
                />
              </div>
              <h3
                className="text-lg font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                No hay flujo definido
              </h3>
              <p
                className="text-sm mb-4 text-center max-w-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Este prompt no tiene un flujo conversacional. Crea uno nuevo o agrega
                un tag <code style={{ color: 'var(--accent-primary)' }}>&lt;flow&gt;</code> al prompt.
              </p>
              <button
                onClick={handleCreateInitialFlow}
                className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
              >
                Crear flujo inicial
              </button>
            </div>
          )}
        </div>

        {/* Properties Panel (right) - Show node or edge panel based on selection */}
        {selectedEdgeId ? (
          <EdgePropertiesPanel
            edge={selectedEdge}
            nodes={nodes}
            onUpdateEdge={handleUpdateEdge}
            onDeleteEdge={handleDeleteEdge}
            onClose={handleClosePropertiesPanel}
          />
        ) : (
          <NodePropertiesPanel
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={deleteNode}
            onClose={handleClosePropertiesPanel}
            availableFlows={availableFlows}
            activeFlowId={storeActiveFlowId}
            onNavigateToFlow={handleSelectFlow}
          />
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <FlowGenerateModal
          onClose={() => setShowGenerateModal(false)}
          onApplyFlow={handleApplyGeneratedFlow}
        />
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <FlowTemplatesModal
          onClose={() => setShowTemplatesModal(false)}
          onApplyFlow={handleApplyGeneratedFlow}
        />
      )}

      {/* Flow to Prompt Modal */}
      {showToPromptModal && (
        <FlowToPromptModal
          onClose={() => setShowToPromptModal(false)}
          flowData={getFlowData()}
        />
      )}

    </div>
  );
}

// Wrap with ReactFlowProvider
export function FlowchartView({ onClose }: FlowchartViewProps) {
  return (
    <ReactFlowProvider>
      <FlowchartViewContent onClose={onClose} />
    </ReactFlowProvider>
  );
}
