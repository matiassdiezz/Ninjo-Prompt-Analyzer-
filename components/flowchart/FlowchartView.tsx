'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { FileText, Loader2 } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';

import { FlowchartCanvas } from './FlowchartCanvas';
import { FlowToolbar } from './FlowToolbar';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { EdgePropertiesPanel } from './EdgePropertiesPanel';
import { FlowValidationPanel } from './FlowValidationPanel';
import { FlowGenerateModal } from './FlowGenerateModal';
import { FlowTemplatesModal } from './FlowTemplatesModal';
import { FlowToPromptModal } from './FlowToPromptModal';
import { useFlowStore } from '@/store/flowStore';
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

  // Initialize sync with agent.flowData (includes ASCII + text flow detection)
  const { convertAsciiToFlow, insertAsciiInPrompt, convertTextFlowToVisual, convertAllTextFlows } = useFlowSync();

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
      addNode(type);
    },
    [addNode]
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
    const initialFlow = createInitialFlow();
    setFlowData(initialFlow);
  }, [setFlowData]);

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

  // Apply generated flow
  const handleApplyGeneratedFlow = useCallback(
    (flow: FlowData) => {
      setFlowData(flow);
      markAsChanged();
    },
    [setFlowData, markAsChanged]
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

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* ASCII Detection Banner */}
      {detectedAsciiFlow && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-b"
          style={{
            background: 'rgba(56, 139, 253, 0.1)',
            borderColor: 'rgba(56, 139, 253, 0.3)',
          }}
        >
          <FileText className="h-4 w-4 shrink-0" style={{ color: '#388bfd' }} />
          <span
            className="text-sm flex-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Se detecto un diagrama ASCII en el prompt
          </span>
          <button
            onClick={convertAsciiToFlow}
            className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
            }}
          >
            Convertir a flujo visual
          </button>
          <button
            onClick={clearAsciiDetection}
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
      )}

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
      />

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
