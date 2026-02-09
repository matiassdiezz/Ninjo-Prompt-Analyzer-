'use client';

import { useState } from 'react';
import { LayoutTemplate, X, ArrowRight, GitBranch, CheckCircle } from 'lucide-react';
import { FLOW_TEMPLATES, TEMPLATE_CATEGORY_LABELS } from '@/lib/data/flowTemplates';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useFlowStore } from '@/store/flowStore';
import { useToastStore } from '@/store/toastStore';
import type { FlowTemplate } from '@/lib/data/flowTemplates';
import type { FlowData } from '@/types/flow';

interface FlowTemplatesModalProps {
  onClose: () => void;
  onApplyFlow: (flow: FlowData) => void;
}

export function FlowTemplatesModal({ onClose, onApplyFlow }: FlowTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const { nodes } = useFlowStore();
  const { addToast } = useToastStore();

  const handleApply = () => {
    if (!selectedTemplate) return;
    if (nodes.length > 0) {
      setShowConfirm(true);
    } else {
      applyAndClose();
    }
  };

  const applyAndClose = () => {
    if (selectedTemplate) {
      onApplyFlow(selectedTemplate.flow);
      addToast('Plantilla aplicada', 'success');
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-xl border shadow-2xl"
        style={{
          background: 'var(--bg-primary)',
          borderColor: 'var(--border-default)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="p-1.5 rounded-lg"
              style={{ background: 'var(--accent-glow)' }}
            >
              <LayoutTemplate className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Plantillas de Flujo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Selecciona una plantilla para comenzar con un flujo pre-definido.
          </p>

          {/* Template Grid */}
          <div className="grid grid-cols-1 gap-3">
            {FLOW_TEMPLATES.map((template) => {
              const isSelected = selectedTemplate?.id === template.id;
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(isSelected ? null : template)}
                  className="text-left p-4 rounded-lg border transition-all"
                  style={{
                    background: isSelected ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                    borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className="text-sm font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {template.name}
                        </h3>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {TEMPLATE_CATEGORY_LABELS[template.category]}
                        </span>
                      </div>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {template.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <GitBranch className="h-3 w-3" />
                          {template.flow.nodes.length} nodos
                        </span>
                        <span
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <ArrowRight className="h-3 w-3" />
                          {template.flow.edges.length} conexiones
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedTemplate}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aplicar plantilla
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onConfirm={() => {
          setShowConfirm(false);
          applyAndClose();
        }}
        onCancel={() => setShowConfirm(false)}
        title="Reemplazar flujo"
        message="Esto reemplazara el flujo actual. ¿Continuar?"
        confirmLabel="Reemplazar"
        variant="warning"
      />
    </div>
  );
}
