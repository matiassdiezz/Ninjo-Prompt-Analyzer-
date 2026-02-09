'use client';

import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StartNode, EndNode, ActionNode, DecisionNode } from './nodes';
import type { FlowNode, FlowEdge } from '@/types/flow';
import { useFlowStore } from '@/store/flowStore';

// Define node types
const nodeTypes = {
  start: StartNode,
  end: EndNode,
  action: ActionNode,
  decision: DecisionNode,
};

interface FlowchartCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: (nodes: FlowNode[]) => void;
  onEdgesChange: (edges: FlowEdge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onEdgeSelect: (edgeId: string | null) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onDeleteSelected: () => void;
}

// Convert our FlowNode to React Flow node format
function toReactFlowNode(node: FlowNode, isSelected: boolean): Node {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      label: node.label,
      description: node.data?.description,
      condition: node.data?.condition,
      action: node.data?.action,
      instructions: node.data?.instructions,
      keywords: node.data?.keywords,
      isSelected,
    },
    selected: isSelected,
  };
}

// Convert React Flow node back to our FlowNode format
function fromReactFlowNode(rfNode: Node): FlowNode {
  const data = rfNode.data as Record<string, unknown>;
  return {
    id: rfNode.id,
    type: rfNode.type as FlowNode['type'],
    label: (data.label as string) || '',
    position: rfNode.position,
    data: {
      description: data.description as string | undefined,
      condition: data.condition as string | undefined,
      action: data.action as string | undefined,
      instructions: data.instructions as string | undefined,
      keywords: data.keywords as string[] | undefined,
    },
  };
}

// Convert our FlowEdge to React Flow edge format
function toReactFlowEdge(edge: FlowEdge, isSelected: boolean): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    sourceHandle: edge.sourceHandle,
    type: 'smoothstep',
    animated: true,
    selected: isSelected,
    style: {
      stroke: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
      strokeWidth: isSelected ? 3 : 2,
    },
    labelStyle: {
      fill: 'var(--text-secondary)',
      fontSize: 12,
    },
    labelBgStyle: {
      fill: 'var(--bg-elevated)',
    },
  };
}

// Convert React Flow edge back to our FlowEdge format
function fromReactFlowEdge(rfEdge: Edge): FlowEdge {
  return {
    id: rfEdge.id,
    source: rfEdge.source,
    target: rfEdge.target,
    label: rfEdge.label as string | undefined,
    sourceHandle: rfEdge.sourceHandle || undefined,
  };
}

export function FlowchartCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onEdgeSelect,
  selectedNodeId,
  selectedEdgeId,
  onDeleteSelected,
}: FlowchartCanvasProps) {
  const { undoFlow, redoFlow, commitNodePositions } = useFlowStore();

  // Convert to React Flow format
  const rfNodes = useMemo(
    () => nodes.map((n) => toReactFlowNode(n, n.id === selectedNodeId)),
    [nodes, selectedNodeId]
  );

  const rfEdges = useMemo(
    () => edges.map((e) => toReactFlowEdge(e, e.id === selectedEdgeId)),
    [edges, selectedEdgeId]
  );

  // Local state for React Flow
  const [localNodes, setLocalNodes, onLocalNodesChange] = useNodesState(rfNodes);
  const [localEdges, setLocalEdges, onLocalEdgesChange] = useEdgesState(rfEdges);

  // Sync external changes to local state
  useEffect(() => {
    setLocalNodes(rfNodes);
  }, [rfNodes, setLocalNodes]);

  useEffect(() => {
    setLocalEdges(rfEdges);
  }, [rfEdges, setLocalEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+Z / Ctrl+Z = Undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoFlow();
        return;
      }

      // Cmd+Shift+Z / Ctrl+Shift+Z = Redo
      if (isMod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redoFlow();
        return;
      }

      // Delete or Backspace = delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        onDeleteSelected();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoFlow, redoFlow, selectedNodeId, onDeleteSelected]);

  // Handle node drag stop — commit positions to history
  const handleNodeDragStop = useCallback(() => {
    commitNodePositions();
  }, [commitNodePositions]);

  // Handle node changes (position, selection, etc.)
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onLocalNodesChange>[0]) => {
      onLocalNodesChange(changes);

      // Check for position changes and propagate
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && 'position' in c && c.position
      );

      if (positionChanges.length > 0) {
        setLocalNodes((currentNodes) => {
          const updatedNodes = currentNodes.map((n) => {
            const posChange = positionChanges.find(
              (c) => c.type === 'position' && c.id === n.id
            );
            if (posChange && posChange.type === 'position' && 'position' in posChange && posChange.position) {
              return { ...n, position: posChange.position };
            }
            return n;
          });

          // Propagate to parent
          onNodesChange(updatedNodes.map(fromReactFlowNode));
          return updatedNodes;
        });
      }

      // Check for selection changes
      const selectionChanges = changes.filter((c) => c.type === 'select');
      if (selectionChanges.length > 0) {
        const selectedChange = selectionChanges.find(
          (c) => c.type === 'select' && 'selected' in c && c.selected
        );
        if (selectedChange && selectedChange.type === 'select') {
          onNodeSelect(selectedChange.id);
        } else {
          const anySelected = selectionChanges.some(
            (c) => c.type === 'select' && 'selected' in c && c.selected
          );
          if (!anySelected) {
            onNodeSelect(null);
          }
        }
      }
    },
    [onLocalNodesChange, setLocalNodes, onNodesChange, onNodeSelect]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onLocalEdgesChange>[0]) => {
      onLocalEdgesChange(changes);

      setLocalEdges((currentEdges) => {
        let updatedEdges = [...currentEdges];

        changes.forEach((change) => {
          if (change.type === 'remove') {
            updatedEdges = updatedEdges.filter((e) => e.id !== change.id);
          }
        });

        onEdgesChange(updatedEdges.map(fromReactFlowEdge));
        return updatedEdges;
      });
    },
    [onLocalEdgesChange, setLocalEdges, onEdgesChange]
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const newEdge: Edge = {
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle || undefined,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: 'var(--accent-primary)',
          strokeWidth: 2,
        },
      };

      setLocalEdges((eds) => {
        const updated = addEdge(newEdge, eds);
        onEdgesChange(updated.map(fromReactFlowEdge));
        return updated;
      });
    },
    [setLocalEdges, onEdgesChange]
  );

  // Handle click on canvas (deselect)
  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
    onEdgeSelect(null);
  }, [onNodeSelect, onEdgeSelect]);

  // Handle edge click
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      onEdgeSelect(edge.id);
    },
    [onEdgeSelect]
  );

  // Handle reconnection (re-routing edges)
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (!newConnection.source || !newConnection.target) return;

      setLocalEdges((eds) => {
        const updated = eds.map((e) =>
          e.id === oldEdge.id
            ? {
                ...e,
                source: newConnection.source!,
                target: newConnection.target!,
                sourceHandle: newConnection.sourceHandle || undefined,
              }
            : e
        );
        onEdgesChange(updated.map(fromReactFlowEdge));
        return updated;
      });
    },
    [setLocalEdges, onEdgesChange]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={localNodes}
        edges={localEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        onReconnect={onReconnect}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1.5,
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          reconnectable: true,
        }}
        proOptions={{ hideAttribution: true }}
        style={{
          background: 'var(--bg-primary)',
        }}
      >
        <Controls
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
          }}
        />
        <MiniMap
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
          }}
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return 'var(--success)';
              case 'end':
                return 'var(--error)';
              case 'decision':
                return 'var(--warning)';
              default:
                return 'var(--accent-primary)';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.5)"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--border-subtle)"
        />
      </ReactFlow>
    </div>
  );
}
