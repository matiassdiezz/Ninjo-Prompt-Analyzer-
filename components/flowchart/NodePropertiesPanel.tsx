'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  MessageSquare,
  HelpCircle,
  Trash2,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import type { FlowNode, FlowNodeType } from '@/types/flow';

interface NodePropertiesPanelProps {
  node: FlowNode | null;
  onUpdateNode: (id: string, updates: Partial<FlowNode>) => void;
  onDeleteNode: (id: string) => void;
  onClose: () => void;
  availableFlows?: { id: string; name: string }[];
  activeFlowId?: string | null;
  onNavigateToFlow?: (flowId: string) => void;
}

const nodeTypeInfo: Record<FlowNodeType, { icon: typeof Play; label: string; color: string }> = {
  start: { icon: Play, label: 'Nodo de Inicio', color: 'var(--success)' },
  end: { icon: Square, label: 'Nodo de Fin', color: 'var(--error)' },
  action: { icon: MessageSquare, label: 'Nodo de Accion', color: 'var(--accent-primary)' },
  decision: { icon: HelpCircle, label: 'Nodo de Decision', color: 'var(--warning)' },
};

export function NodePropertiesPanel({
  node,
  onUpdateNode,
  onDeleteNode,
  onClose,
  availableFlows = [],
  activeFlowId,
  onNavigateToFlow,
}: NodePropertiesPanelProps) {
  const [label, setLabel] = useState(node?.label || '');
  const [description, setDescription] = useState(node?.data?.description || '');
  const [instructions, setInstructions] = useState(node?.data?.instructions || '');
  const [keywordsInput, setKeywordsInput] = useState(node?.data?.keywords?.join(', ') || '');

  // Sync with selected node
  useEffect(() => {
    if (node) {
      setLabel(node.label);
      setDescription(node.data?.description || '');
      setInstructions(node.data?.instructions || '');
      setKeywordsInput(node.data?.keywords?.join(', ') || '');
    }
  }, [node]);

  if (!node) {
    return (
      <div
        className="w-72 flex-shrink-0 border-l p-4 flex flex-col items-center justify-center"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <MessageSquare
          className="h-10 w-10 mb-3"
          style={{ color: 'var(--text-muted)' }}
        />
        <p
          className="text-sm text-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          Selecciona un nodo para ver sus propiedades
        </p>
      </div>
    );
  }

  const typeInfo = nodeTypeInfo[node.type];
  const Icon = typeInfo.icon;
  const isCrossFlow = !!node.data?.crossFlowRef;
  const isEndNode = node.type === 'end';

  // Other flows available for cross-flow reference (exclude current)
  const otherFlows = availableFlows.filter(f => f.id !== activeFlowId);

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    onUpdateNode(node.id, { label: newLabel });
  };

  const handleDescriptionChange = (newDescription: string) => {
    setDescription(newDescription);
    onUpdateNode(node.id, {
      data: { ...node.data, description: newDescription },
    });
  };

  const handleInstructionsChange = (newInstructions: string) => {
    setInstructions(newInstructions);
    onUpdateNode(node.id, {
      data: { ...node.data, instructions: newInstructions },
    });
  };

  const handleKeywordsChange = (value: string) => {
    setKeywordsInput(value);
    const keywords = value
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    onUpdateNode(node.id, {
      data: { ...node.data, keywords },
    });
  };

  const handleToggleCrossFlow = (enabled: boolean) => {
    if (enabled) {
      // Set to first available flow by default
      const targetId = otherFlows.length > 0 ? otherFlows[0].id : undefined;
      onUpdateNode(node.id, {
        data: { ...node.data, crossFlowRef: targetId },
      });
    } else {
      // Remove cross-flow reference
      const { crossFlowRef: _, ...restData } = node.data || {};
      onUpdateNode(node.id, {
        data: { ...restData, crossFlowRef: undefined },
      });
    }
  };

  const handleCrossFlowTargetChange = (targetFlowId: string) => {
    onUpdateNode(node.id, {
      data: { ...node.data, crossFlowRef: targetFlowId },
    });
  };

  const canEditLabel = true;
  const canHaveDescription = node.type === 'action' || node.type === 'decision';
  const canHaveExtras = node.type === 'action' || node.type === 'decision';

  // Resolve target flow name
  const targetFlowName = isCrossFlow
    ? availableFlows.find(f => f.id === node.data?.crossFlowRef)?.name
    : null;

  return (
    <div
      className="w-72 flex-shrink-0 border-l flex flex-col"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          {isCrossFlow ? (
            <ExternalLink className="h-4 w-4" style={{ color: '#a855f7' }} />
          ) : (
            <Icon className="h-4 w-4" style={{ color: typeInfo.color }} />
          )}
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {isCrossFlow ? 'Ir a otro flujo' : typeInfo.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-opacity-20"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Node ID (readonly) */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            ID del Nodo
          </label>
          <input
            type="text"
            value={node.id}
            readOnly
            className="w-full input text-sm"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
              cursor: 'not-allowed',
            }}
          />
        </div>

        {/* Label */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Etiqueta
          </label>
          {canEditLabel ? (
            <input
              type="text"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="w-full input text-sm"
              placeholder="Nombre del nodo"
            />
          ) : (
            <input
              type="text"
              value={label}
              readOnly
              className="w-full input text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                cursor: 'not-allowed',
              }}
            />
          )}
        </div>

        {/* Cross-Flow Reference (only for end nodes when there are other flows) */}
        {isEndNode && otherFlows.length > 0 && (
          <div
            className="rounded-lg p-3 space-y-3"
            style={{
              background: isCrossFlow ? 'rgba(168, 85, 247, 0.08)' : 'var(--bg-tertiary)',
              border: `1px solid ${isCrossFlow ? 'rgba(168, 85, 247, 0.3)' : 'var(--border-subtle)'}`,
            }}
          >
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-medium"
                style={{ color: isCrossFlow ? '#a855f7' : 'var(--text-secondary)' }}
              >
                {isCrossFlow ? 'Ir a otro flujo' : 'Fin normal'}
              </label>
              <button
                onClick={() => handleToggleCrossFlow(!isCrossFlow)}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{
                  background: isCrossFlow ? '#a855f7' : 'var(--bg-primary)',
                  border: `1px solid ${isCrossFlow ? '#a855f7' : 'var(--border-default)'}`,
                }}
              >
                <div
                  className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-transform"
                  style={{
                    background: isCrossFlow ? 'white' : 'var(--text-muted)',
                    transform: isCrossFlow ? 'translateX(18px)' : 'translateX(2px)',
                  }}
                />
              </button>
            </div>

            {/* Dropdown - select target flow */}
            {isCrossFlow && (
              <>
                <div>
                  <label
                    className="block text-[10px] font-medium mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Flujo destino
                  </label>
                  <select
                    value={node.data?.crossFlowRef || ''}
                    onChange={(e) => handleCrossFlowTargetChange(e.target.value)}
                    className="w-full input text-xs"
                    style={{
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {otherFlows.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Navigate button */}
                {targetFlowName && onNavigateToFlow && (
                  <button
                    onClick={() => onNavigateToFlow(node.data!.crossFlowRef!)}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#a855f7',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Navegar a {targetFlowName}</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Description (for action and decision nodes) */}
        {canHaveDescription && (
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Descripcion
            </label>
            <textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="w-full input text-sm resize-none"
              rows={3}
              placeholder={
                node.type === 'decision'
                  ? 'Describe la condicion...'
                  : 'Describe la accion del agente...'
              }
            />
          </div>
        )}

        {/* Instructions (for action and decision nodes) */}
        {canHaveExtras && (
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Instrucciones del agente
            </label>
            <textarea
              value={instructions}
              onChange={(e) => handleInstructionsChange(e.target.value)}
              className="w-full input text-sm resize-none"
              rows={4}
              placeholder="Instrucciones especificas para el agente en este paso..."
            />
          </div>
        )}

        {/* Keywords / Triggers (for action and decision nodes) */}
        {canHaveExtras && (
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Keywords / Triggers
            </label>
            <input
              type="text"
              value={keywordsInput}
              onChange={(e) => handleKeywordsChange(e.target.value)}
              className="w-full input text-sm"
              placeholder="ej: precio, costo, cuanto vale"
            />
            {keywordsInput.trim() && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywordsInput
                  .split(',')
                  .map((k) => k.trim())
                  .filter((k) => k.length > 0)
                  .map((keyword, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--accent-primary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {keyword}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Position (readonly) */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Posicion
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <span
                className="text-[10px]"
                style={{ color: 'var(--text-muted)' }}
              >
                X
              </span>
              <input
                type="text"
                value={Math.round(node.position.x)}
                readOnly
                className="w-full input text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                  cursor: 'not-allowed',
                }}
              />
            </div>
            <div className="flex-1">
              <span
                className="text-[10px]"
                style={{ color: 'var(--text-muted)' }}
              >
                Y
              </span>
              <input
                type="text"
                value={Math.round(node.position.y)}
                readOnly
                className="w-full input text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                  cursor: 'not-allowed',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Delete button */}
      <div
        className="p-3 border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <button
          onClick={() => onDeleteNode(node.id)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg btn-danger"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-sm font-medium">Eliminar nodo</span>
        </button>
      </div>
    </div>
  );
}
