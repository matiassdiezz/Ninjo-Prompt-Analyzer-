'use client';

import { useKnowledgeStore } from '@/store/knowledgeStore';
import { X, Clock, Plus, Edit3, Trash2, Folder, FileText, Brain, CheckCircle } from 'lucide-react';

interface PendingOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const entityIcons: Record<string, React.ReactNode> = {
  project: <Folder className="h-4 w-4" />,
  version: <FileText className="h-4 w-4" />,
  knowledge: <Brain className="h-4 w-4" />,
  decision: <CheckCircle className="h-4 w-4" />,
};

const entityLabels: Record<string, string> = {
  project: 'Proyecto',
  version: 'Versión',
  knowledge: 'Conocimiento',
  decision: 'Decisión',
};

const operationIcons: Record<string, React.ReactNode> = {
  create: <Plus className="h-3.5 w-3.5" />,
  update: <Edit3 className="h-3.5 w-3.5" />,
  delete: <Trash2 className="h-3.5 w-3.5" />,
};

const operationLabels: Record<string, string> = {
  create: 'Crear',
  update: 'Actualizar',
  delete: 'Eliminar',
};

const operationColors: Record<string, { bg: string; text: string }> = {
  create: { bg: 'var(--success-subtle)', text: 'var(--success)' },
  update: { bg: 'var(--info-subtle)', text: 'var(--info)' },
  delete: { bg: 'var(--error-subtle)', text: 'var(--error)' },
};

export function PendingOperationsModal({ isOpen, onClose }: PendingOperationsModalProps) {
  const { sync, projects, entries, decisions } = useKnowledgeStore();
  const { pendingOperations, isSyncing } = sync;

  if (!isOpen) return null;

  // Group operations by entity type
  const grouped = pendingOperations.reduce((acc, op) => {
    if (!acc[op.entity]) acc[op.entity] = [];
    acc[op.entity].push(op);
    return acc;
  }, {} as Record<string, typeof pendingOperations>);

  // Get entity name from data
  const getEntityName = (op: typeof pendingOperations[0]): string => {
    if (op.type === 'delete') {
      // Try to find name from local state
      switch (op.entity) {
        case 'project':
          const project = projects.find(p => p.id === op.entityId);
          return project?.name || 'Proyecto desconocido';
        case 'knowledge':
          const entry = entries.find(e => e.id === op.entityId);
          return entry?.title || 'Entrada desconocida';
        default:
          return `${op.entityId.slice(0, 8)}...`;
      }
    }
    
    // For create/update, try to get name from data
    const data = op.data as { name?: string; title?: string; label?: string; content?: string };
    if (data?.name) return data.name;
    if (data?.title) return data.title;
    if (data?.label) return data.label;
    if (op.entity === 'version' && data?.content) {
      return data.content.slice(0, 50) + '...';
    }
    return `${op.entityId.slice(0, 8)}...`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-xl overflow-hidden animate-fadeIn"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ background: 'var(--warning-subtle)' }}
            >
              <Clock className="h-5 w-5" style={{ color: 'var(--warning)' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Operaciones Pendientes
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {pendingOperations.length} {pendingOperations.length === 1 ? 'operación' : 'operaciones'} por sincronizar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
          >
            <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {pendingOperations.length === 0 ? (
            <div className="p-8 text-center">
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--success-subtle)' }}
              >
                <CheckCircle className="h-8 w-8" style={{ color: 'var(--success)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Todo sincronizado
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                No hay operaciones pendientes
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {Object.entries(grouped).map(([entity, ops]) => (
                <div key={entity} className="mb-2">
                  {/* Entity type header */}
                  <div 
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {entityIcons[entity]}
                    {entityLabels[entity] || entity}
                    <span className="ml-auto">{ops.length}</span>
                  </div>
                  
                  {/* Operations list */}
                  {ops.map((op) => {
                    const colors = operationColors[op.type];
                    return (
                      <div
                        key={op.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1"
                        style={{ background: 'var(--bg-tertiary)' }}
                      >
                        <div
                          className="p-1.5 rounded-md"
                          style={{ background: colors.bg }}
                        >
                          <span style={{ color: colors.text }}>
                            {operationIcons[op.type]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-xs font-medium truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {getEntityName(op)}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {operationLabels[op.type]} • {formatTime(op.timestamp)}
                          </p>
                        </div>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: colors.bg,
                            color: colors.text,
                          }}
                        >
                          {operationLabels[op.type]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {isSyncing ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                Sincronizando...
              </span>
            ) : (
              <span>Esperando conexión</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
