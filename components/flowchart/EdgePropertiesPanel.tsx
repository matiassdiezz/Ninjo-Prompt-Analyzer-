'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, Trash2 } from 'lucide-react';
import type { FlowEdge, FlowNode } from '@/types/flow';

interface EdgePropertiesPanelProps {
  edge: FlowEdge | null;
  nodes: FlowNode[];
  onUpdateEdge: (id: string, updates: Partial<FlowEdge>) => void;
  onDeleteEdge: (id: string) => void;
  onClose: () => void;
}

export function EdgePropertiesPanel({
  edge,
  nodes,
  onUpdateEdge,
  onDeleteEdge,
  onClose,
}: EdgePropertiesPanelProps) {
  const [label, setLabel] = useState(edge?.label || '');

  useEffect(() => {
    setLabel(edge?.label || '');
  }, [edge]);

  if (!edge) {
    return (
      <div className="w-72 flex-shrink-0 border-l p-4 flex flex-col items-center justify-center" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
        <ArrowRight className="h-10 w-10 mb-3" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>Selecciona un camino para ver sus propiedades</p>
      </div>
    );
  }

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const sourceHandles = sourceNode?.type === 'decision' ? ['yes', 'no'] : ['default'];

  return (
    <div className="w-72 flex-shrink-0 border-l flex flex-col" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Camino</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-opacity-20" style={{ color: 'var(--text-secondary)' }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>ID del Camino</label>
          <input type="text" value={edge.id} readOnly className="w-full input text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Etiqueta</label>
          <input type="text" value={label} onChange={(e) => { setLabel(e.target.value); onUpdateEdge(edge.id, { label: e.target.value }); }} className="w-full input text-sm" placeholder="ej: sí, no, continuar..." />
        </div>

        {sourceNode?.type === 'decision' && (
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Rama (Handle)</label>
            <select value={edge.sourceHandle || 'yes'} onChange={(e) => onUpdateEdge(edge.id, { sourceHandle: e.target.value })} className="w-full input text-sm">
              {sourceHandles.map((h) => <option key={h} value={h}>{h === 'yes' ? 'Sí (yes)' : 'No (no)'}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Origen</label>
          <input type="text" value={`${sourceNode?.label || edge.source} (${edge.source})`} readOnly className="w-full input text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Destino</label>
          <input type="text" value={`${targetNode?.label || edge.target} (${edge.target})`} readOnly className="w-full input text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
        </div>
      </div>

      <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <button onClick={() => onDeleteEdge(edge.id)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg btn-danger">
          <Trash2 className="h-4 w-4" />
          <span className="text-sm font-medium">Eliminar camino</span>
        </button>
      </div>
    </div>
  );
}
