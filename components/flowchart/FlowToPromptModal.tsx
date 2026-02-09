'use client';

import { useState } from 'react';
import { Wand2, X, Loader2, CheckCircle, AlertTriangle, Copy, FileInput } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useToastStore } from '@/store/toastStore';
import type { FlowData } from '@/types/flow';

interface FlowToPromptModalProps {
  onClose: () => void;
  flowData: FlowData;
}

interface GenerateResult {
  conversationLogic: string;
  happyPath: string;
  triggers: string[];
  qualificationQuestions: string[];
  summary: string;
}

export function FlowToPromptModal({ onClose, flowData }: FlowToPromptModalProps) {
  const { currentPrompt, setPrompt } = useAnalysisStore();

  const [clientName, setClientName] = useState('');
  const [agentGoal, setAgentGoal] = useState('');
  const [useContext, setUseContext] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [activeTab, setActiveTab] = useState<'logic' | 'happypath'>('logic');
  const [inserted, setInserted] = useState(false);
  const { addToast } = useToastStore();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/flow/to-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowData,
          context: useContext ? currentPrompt : undefined,
          clientName: clientName.trim() || undefined,
          agentGoal: agentGoal.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al generar secciones');
        return;
      }

      setResult(data);
    } catch {
      setError('Error de conexion. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertInPrompt = () => {
    if (!result) return;

    const sections = [
      '\n\n## LOGICA DE CONVERSACION\n',
      result.conversationLogic,
      '\n\n## HAPPY PATH\n',
      result.happyPath,
    ];

    if (result.triggers.length > 0) {
      sections.push('\n\n## TRIGGERS\n');
      sections.push(result.triggers.map((t) => `- ${t}`).join('\n'));
    }

    if (result.qualificationQuestions.length > 0) {
      sections.push('\n\n## PREGUNTAS DE CALIFICACION\n');
      sections.push(result.qualificationQuestions.map((q) => `- ${q}`).join('\n'));
    }

    const newContent = sections.join('');
    setPrompt(currentPrompt + newContent);
    setInserted(true);
    addToast('Secciones insertadas en el prompt', 'success');
  };

  const handleCopySection = (text: string) => {
    navigator.clipboard.writeText(text);
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
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border shadow-2xl"
        style={{
          background: 'var(--bg-primary)',
          borderColor: 'var(--border-default)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="p-1.5 rounded-lg"
              style={{ background: 'rgba(168, 85, 247, 0.15)' }}
            >
              <Wand2 className="h-5 w-5" style={{ color: '#a855f7' }} />
            </div>
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Generar Prompt desde Flujo
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
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          {!result && (
            <>
              {/* Optional fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Nombre del cliente (opcional)
                  </label>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Maria Lopez"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Objetivo del agente (opcional)
                  </label>
                  <input
                    value={agentGoal}
                    onChange={(e) => setAgentGoal(e.target.value)}
                    placeholder="Ej: Agendar llamadas de venta"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    disabled={isGenerating}
                  />
                </div>
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

              {/* Flow info */}
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                }}
              >
                Flujo con {flowData.nodes.length} nodos y {flowData.edges.length} conexiones
              </div>
            </>
          )}

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
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" style={{ color: 'var(--success)' }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {result.summary}
                </span>
              </div>

              {/* Tabs */}
              <div
                className="flex gap-1 p-1 rounded-lg"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <button
                  onClick={() => setActiveTab('logic')}
                  className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  style={{
                    background: activeTab === 'logic' ? 'var(--bg-elevated)' : 'transparent',
                    color: activeTab === 'logic' ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  Logica de Conversacion
                </button>
                <button
                  onClick={() => setActiveTab('happypath')}
                  className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  style={{
                    background: activeTab === 'happypath' ? 'var(--bg-elevated)' : 'transparent',
                    color: activeTab === 'happypath' ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  Happy Path
                </button>
              </div>

              {/* Content */}
              <div
                className="relative rounded-lg border p-3 max-h-64 overflow-y-auto"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <button
                  onClick={() =>
                    handleCopySection(
                      activeTab === 'logic' ? result.conversationLogic : result.happyPath
                    )
                  }
                  className="absolute top-2 right-2 p-1 rounded-md transition-colors"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-muted)',
                  }}
                  title="Copiar seccion"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <pre
                  className="text-xs whitespace-pre-wrap leading-relaxed pr-8"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {activeTab === 'logic' ? result.conversationLogic : result.happyPath}
                </pre>
              </div>

              {/* Extra info */}
              {(result.triggers.length > 0 || result.qualificationQuestions.length > 0) && (
                <div className="flex gap-3">
                  {result.triggers.length > 0 && (
                    <div className="flex-1">
                      <p
                        className="text-xs font-medium mb-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Triggers:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {result.triggers.map((t, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: 'var(--accent-glow)',
                              color: 'var(--accent-primary)',
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.qualificationQuestions.length > 0 && (
                    <div className="flex-1">
                      <p
                        className="text-xs font-medium mb-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Preguntas de calificacion:
                      </p>
                      <ul className="space-y-0.5">
                        {result.qualificationQuestions.map((q, i) => (
                          <li
                            key={i}
                            className="text-[11px]"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {i + 1}. {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3 border-t shrink-0"
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
            {result ? 'Cerrar' : 'Cancelar'}
          </button>

          {result ? (
            <button
              onClick={handleInsertInPrompt}
              disabled={inserted}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors btn-primary disabled:opacity-50"
            >
              <FileInput className="h-4 w-4" />
              {inserted ? 'Insertado' : 'Insertar en prompt'}
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generar secciones
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
