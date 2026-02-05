'use client';

import { useMemo } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import type { KnowledgeEntry } from '@/types/prompt';
import type { SemanticSection } from '@/lib/semanticParser';
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Zap,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface ContextualSuggestionsProps {
  currentSection: SemanticSection | null;
  onApplyLearning: (learning: KnowledgeEntry) => void;
  onClose?: () => void;
}

export function ContextualSuggestions({
  currentSection,
  onApplyLearning,
  onClose,
}: ContextualSuggestionsProps) {
  const { findRelevantLearnings } = useKnowledgeStore();

  // Find relevant learnings for the current section
  const relevantLearnings = useMemo(() => {
    if (!currentSection) return [];
    
    return findRelevantLearnings(
      currentSection.title,
      currentSection.content,
      currentSection.type,
      5
    );
  }, [currentSection, findRelevantLearnings]);

  if (!currentSection) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--bg-tertiary)' }}>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <Sparkles className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Selecciona una sección
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              para ver sugerencias relevantes
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-tertiary)' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-3 py-3 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Sugerencias
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
              title="Cerrar sugerencias"
            >
              <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
        
        {/* Current section info */}
        <div
          className="px-2 py-1.5 rounded-lg"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
            Sección activa
          </p>
          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
            {currentSection.title}
          </p>
        </div>
      </div>

      {/* Learnings List */}
      <div className="flex-1 overflow-y-auto p-3">
        {relevantLearnings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <Lightbulb className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Sin sugerencias
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No hay learnings relevantes para esta sección
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {relevantLearnings.map((learning) => (
              <LearningCard
                key={learning.id}
                learning={learning}
                onApply={() => onApplyLearning(learning)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface LearningCardProps {
  learning: KnowledgeEntry;
  onApply: () => void;
}

function LearningCard({ learning, onApply }: LearningCardProps) {
  const isPattern = learning.type === 'pattern';
  const hasExample = Boolean(learning.example);

  return (
    <div
      className="rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${isPattern ? 'var(--border-subtle)' : 'rgba(248, 81, 73, 0.2)'}`,
      }}
    >
      {/* Header */}
      <div className="px-3 py-2">
        <div className="flex items-start gap-2 mb-2">
          {isPattern ? (
            <div
              className="p-1 rounded flex-shrink-0"
              style={{ background: 'var(--success-subtle)' }}
            >
              <Lightbulb className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />
            </div>
          ) : (
            <div
              className="p-1 rounded flex-shrink-0"
              style={{ background: 'var(--error-subtle)' }}
            >
              <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--error)' }} />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-medium line-clamp-2 mb-1" style={{ color: 'var(--text-primary)' }}>
              {learning.title}
            </h4>
            <p className="text-[11px] line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
              {learning.description}
            </p>
          </div>
        </div>

        {/* Tags */}
        {learning.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {learning.tags
              .filter(t => !['from-chat', 'annotation'].includes(t))
              .slice(0, 3)
              .map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                  }}
                >
                  #{tag}
                </span>
              ))}
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-3 text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background:
                  learning.effectiveness === 'high'
                    ? 'var(--error)'
                    : learning.effectiveness === 'medium'
                    ? 'var(--warning)'
                    : 'var(--text-muted)',
              }}
            />
            <span>
              {learning.effectiveness === 'high' ? 'Alta' : learning.effectiveness === 'medium' ? 'Media' : 'Baja'}
            </span>
          </div>
          {learning.usageCount > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>{learning.usageCount} usos</span>
            </div>
          )}
        </div>

        {/* Apply button */}
        {hasExample && (
          <button
            onClick={onApply}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: 'var(--gradient-primary)',
              color: '#0a0e14',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Zap className="h-3 w-3" />
            Aplicar Patrón
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
        
        {!hasExample && (
          <div
            className="w-full px-3 py-1.5 rounded-lg text-[10px] text-center"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
            }}
          >
            Sin ejemplo para aplicar
          </div>
        )}
      </div>
    </div>
  );
}
