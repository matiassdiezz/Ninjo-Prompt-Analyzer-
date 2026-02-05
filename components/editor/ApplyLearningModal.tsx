'use client';

import { useState } from 'react';
import type { KnowledgeEntry } from '@/types/prompt';
import type { SemanticSection } from '@/lib/semanticParser';
import {
  X,
  Zap,
  AlertCircle,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface ApplyLearningModalProps {
  learning: KnowledgeEntry;
  section: SemanticSection;
  originalText: string;
  suggestedText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ApplyLearningModal({
  learning,
  section,
  originalText,
  suggestedText,
  onConfirm,
  onCancel,
}: ApplyLearningModalProps) {
  const [createVersion, setCreateVersion] = useState(true);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
        onClick={onCancel}
      >
        {/* Modal */}
        <div
          className="w-full max-w-4xl rounded-xl shadow-2xl animate-fadeIn"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex-shrink-0 px-6 py-4 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }}
                >
                  <Zap className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Aplicar Patrón
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {learning.title}
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
              >
                <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Section info */}
            <div
              className="mb-4 px-4 py-3 rounded-lg"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Sección
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {section.title}
              </p>
            </div>

            {/* Learning description */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                Descripción del patrón
              </label>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {learning.description}
              </p>
            </div>

            {/* Diff Preview */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                Vista previa de cambios
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Original */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronLeft className="h-3 w-3" style={{ color: 'var(--error)' }} />
                    <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--error)' }}>
                      Original
                    </span>
                  </div>
                  <div
                    className="p-3 rounded-lg text-xs font-mono overflow-auto max-h-64"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid rgba(248, 81, 73, 0.2)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <pre className="whitespace-pre-wrap">{originalText}</pre>
                  </div>
                </div>

                {/* Suggested */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronRight className="h-3 w-3" style={{ color: 'var(--success)' }} />
                    <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--success)' }}>
                      Sugerido
                    </span>
                  </div>
                  <div
                    className="p-3 rounded-lg text-xs font-mono overflow-auto max-h-64"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid rgba(63, 185, 80, 0.2)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <pre className="whitespace-pre-wrap">{suggestedText}</pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning if texts are very different */}
            {originalText.length > 0 && Math.abs(originalText.length - suggestedText.length) > originalText.length * 0.5 && (
              <div
                className="flex items-start gap-3 p-3 rounded-lg mb-4"
                style={{
                  background: 'var(--warning-subtle)',
                  border: '1px solid rgba(240, 180, 41, 0.2)',
                }}
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--warning)' }}>
                    Cambio significativo
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    El texto sugerido es muy diferente al original. Revisa cuidadosamente antes de aplicar.
                  </p>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createVersion}
                  onChange={(e) => setCreateVersion(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{
                    accentColor: 'var(--accent-primary)',
                  }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Crear versión automáticamente
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex-shrink-0 px-6 py-4 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                background: 'var(--gradient-primary)',
                color: '#0a0e14',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Check className="h-4 w-4" />
              Aplicar Cambios
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
