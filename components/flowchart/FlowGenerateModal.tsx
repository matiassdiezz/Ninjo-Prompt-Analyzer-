'use client';

import { useState } from 'react';
import { Sparkles, X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useFlowStore } from '@/store/flowStore';
import { useToastStore } from '@/store/toastStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { FlowData } from '@/types/flow';
import type { FlowValidationWarning } from '@/lib/utils/flowValidator';

interface FlowGenerateModalProps {
  onClose: () => void;
  onApplyFlow: (flow: FlowData) => void;
}

interface GenerateResult {
  flow: FlowData;
  summary: string;
  suggestions: string[];
  warnings: FlowValidationWarning[];
}

export function FlowGenerateModal({ onClose, onApplyFlow }: FlowGenerateModalProps) {
  const { currentPrompt } = useAnalysisStore();

  const [description, setDescription] = useState('');
  const [useContext, setUseContext] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const { nodes } = useFlowStore();
  const { addToast } = useToastStore();

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/flow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          context: useContext ? currentPrompt : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al generar el flujo');
        return;
      }

      setResult(data);
    } catch {
      setError('Error de conexion. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!result?.flow) return;
    if (nodes.length > 0) {
      setShowConfirm(true);
    } else {
      applyAndClose();
    }
  };

  const applyAndClose = () => {
    if (result?.flow) {
      onApplyFlow(result.flow);
      addToast('Flujo aplicado', 'success');
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
        className="w-full max-w-lg rounded-xl border shadow-2xl"
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
              <Sparkles className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Generar Flujo con IA
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
          {/* Description textarea */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Describe el flujo que necesitas
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Un flujo de calificacion que pregunte si tiene negocio digital, luego si factura mas de $5k/mes, y si la respuesta es si envie link de agenda"
              rows={4}
              className="w-full rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              disabled={isGenerating}
            />
          </div>

          {/* Use context checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useContext}
              onChange={(e) => setUseContext(e.target.checked)}
              className="rounded"
              disabled={isGenerating || !currentPrompt}
            />
            <span
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Usar contexto del prompt actual
            </span>
          </label>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--error-subtle)',
                color: 'var(--error)',
              }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Result preview */}
          {result && (
            <div
              className="rounded-lg border p-3 space-y-2"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--success)',
              }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" style={{ color: 'var(--success)' }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Flujo generado
                </span>
              </div>
              <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {result.summary}
              </p>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  {result.flow.nodes.length} nodos
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {result.flow.edges.length} conexiones
                </span>
                {result.warnings.length > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: 'var(--warning-subtle)',
                      color: 'var(--warning)',
                    }}
                  >
                    {result.warnings.length} advertencias
                  </span>
                )}
              </div>
              {result.suggestions.length > 0 && (
                <div className="mt-1">
                  <p
                    className="text-xs font-medium mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Sugerencias:
                  </p>
                  <ul className="space-y-0.5">
                    {result.suggestions.map((s, i) => (
                      <li
                        key={i}
                        className="text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        • {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
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

          {result ? (
            <button
              onClick={handleApply}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors btn-primary"
            >
              Aplicar flujo
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar
                </>
              )}
            </button>
          )}
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
