'use client';

import { AlertTriangle, CheckCircle, TrendingUp, X } from 'lucide-react';

interface DuplicateMatch {
  existingLearning: {
    id: string;
    title: string;
    description: string;
    usageCount: number;
  };
  newLearning: {
    pattern: string;
    suggestion: string;
  };
  similarity: number;
  reason: string;
}

interface DuplicatePatternAlertProps {
  duplicates: DuplicateMatch[];
  onDismiss: () => void;
}

export function DuplicatePatternAlert({ duplicates, onDismiss }: DuplicatePatternAlertProps) {
  if (duplicates.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden mb-4 animate-slideDown"
      style={{
        background: 'var(--warning-subtle)',
        border: '1px solid rgba(240, 180, 41, 0.3)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(240, 180, 41, 0.2)' }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
            Patrón Ya Documentado
          </h3>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
        >
          <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          El patrón que Claude acaba de sugerir ya está documentado en la base de conocimiento:
        </p>

        <div className="space-y-3">
          {duplicates.map((duplicate, index) => (
            <div
              key={index}
              className="rounded-lg p-3"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                <div className="flex-1">
                  <h4 className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    {duplicate.existingLearning.title}
                  </h4>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    {duplicate.reason}
                  </p>
                </div>
              </div>

              {/* Similarity and usage */}
              <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <span>Similitud: {Math.round(duplicate.similarity * 100)}%</span>
                {duplicate.existingLearning.usageCount > 0 && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>Usado {duplicate.existingLearning.usageCount} veces</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] mt-3 italic" style={{ color: 'var(--text-muted)' }}>
          💡 No es necesario guardar este patrón nuevamente. El conocimiento ya está en la base de datos.
        </p>
      </div>
    </div>
  );
}

interface TestingSuggestion {
  category: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  basedOn: string;
}

interface TestingSuggestionsAlertProps {
  suggestions: TestingSuggestion[];
  onDismiss: () => void;
}

export function TestingSuggestionsAlert({ suggestions, onDismiss }: TestingSuggestionsAlertProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden mb-4 animate-slideDown"
      style={{
        background: 'var(--info-subtle)',
        border: '1px solid rgba(88, 166, 255, 0.3)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(88, 166, 255, 0.2)' }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" style={{ color: 'var(--info)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--info)' }}>
            Sugerencias de Testing
          </h3>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
        >
          <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          Basado en proyectos anteriores, verifica estos puntos:
        </p>

        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="rounded-lg p-3"
              style={{
                background: 'var(--bg-elevated)',
                border: `1px solid ${
                  suggestion.priority === 'high'
                    ? 'rgba(248, 81, 73, 0.2)'
                    : suggestion.priority === 'medium'
                    ? 'rgba(240, 180, 41, 0.2)'
                    : 'var(--border-subtle)'
                }`,
              }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background:
                      suggestion.priority === 'high'
                        ? 'var(--error-subtle)'
                        : suggestion.priority === 'medium'
                        ? 'var(--warning-subtle)'
                        : 'var(--bg-tertiary)',
                    color:
                      suggestion.priority === 'high'
                        ? 'var(--error)'
                        : suggestion.priority === 'medium'
                        ? 'var(--warning)'
                        : 'var(--text-muted)',
                  }}
                >
                  {suggestion.priority === 'high' ? 'Alta' : suggestion.priority === 'medium' ? 'Media' : 'Baja'}
                </span>
                <div className="flex-1">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    {suggestion.suggestion}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {suggestion.basedOn}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
