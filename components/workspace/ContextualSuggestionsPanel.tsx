'use client';

import { useState, useMemo } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { CATEGORY_INFO, type AnalysisSection } from '@/types/analysis';
import type { SemanticSection } from '@/lib/semanticParser';
import { sortBySeverity } from '@/lib/suggestionMapper';
import { findTextInPrompt } from '@/lib/utils/textMatcher';
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  CheckSquare,
  Square,
} from 'lucide-react';

interface ContextualSuggestionsPanelProps {
  selectedSection: SemanticSection | null;
  suggestions: AnalysisSection[];
  allSuggestions: AnalysisSection[];
}

interface DiffViewProps {
  original: string;
  suggested: string;
}

function DiffView({ original, suggested }: DiffViewProps) {
  return (
    <div className="space-y-2">
      <div
        className="rounded-lg p-3"
        style={{
          background: 'var(--error-subtle)',
          border: '1px solid rgba(248, 81, 73, 0.15)'
        }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wide"
            style={{ color: 'var(--error)' }}
          >
            Original
          </span>
        </div>
        <p
          className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {original}
        </p>
      </div>
      <div className="flex justify-center">
        <ArrowRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
      </div>
      <div
        className="rounded-lg p-3"
        style={{
          background: 'var(--success-subtle)',
          border: '1px solid rgba(63, 185, 80, 0.15)'
        }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wide"
            style={{ color: 'var(--success)' }}
          >
            Sugerencia
          </span>
        </div>
        <p
          className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {suggested}
        </p>
      </div>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: AnalysisSection;
  onApply: (suggestion: AnalysisSection) => void;
  onReject: (suggestion: AnalysisSection) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}

function SuggestionCard({ suggestion, onApply, onReject, isSelected, onToggleSelect, showCheckbox }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(true);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { bg: 'var(--error-subtle)', text: 'var(--error)', border: 'rgba(248, 81, 73, 0.2)' };
      case 'high':
        return { bg: 'rgba(255, 140, 66, 0.1)', text: '#ff8c42', border: 'rgba(255, 140, 66, 0.2)' };
      case 'medium':
        return { bg: 'var(--warning-subtle)', text: 'var(--warning)', border: 'rgba(240, 180, 41, 0.2)' };
      default:
        return { bg: 'var(--info-subtle)', text: 'var(--info)', border: 'rgba(88, 166, 255, 0.2)' };
    }
  };

  const severityStyles = getSeverityStyles(suggestion.severity);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-[var(--accent-subtle)]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          {showCheckbox && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.();
              }}
              className="flex-shrink-0 mt-0.5 transition-colors"
              style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            >
              {isSelected ? (
                <CheckSquare className="h-5 w-5" />
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide"
                style={{
                  background: severityStyles.bg,
                  color: severityStyles.text,
                  border: `1px solid ${severityStyles.border}`
                }}
              >
                {suggestion.severity}
              </span>
              <span
                className="text-[10px] font-medium px-2 py-1 rounded-md"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-tertiary)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {CATEGORY_INFO[suggestion.category]?.label || suggestion.category}
              </span>
            </div>
            <p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--text-primary)' }}>
              {suggestion.issues[0] || 'Sugerencia de mejora'}
            </p>
          </div>
          <div className="flex-shrink-0">
            <button
              className="p-1 rounded-md transition-all duration-200"
              style={{ color: 'var(--text-muted)' }}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Diff View */}
          <DiffView
            original={suggestion.originalText}
            suggested={suggestion.suggestedRewrite}
          />

          {/* Explanation */}
          {suggestion.explanation && (
            <div
              className="rounded-lg p-3"
              style={{
                background: 'var(--info-subtle)',
                border: '1px solid rgba(88, 166, 255, 0.15)'
              }}
            >
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--info)' }}>Explicación:</strong> {suggestion.explanation}
              </p>
            </div>
          )}

          {/* Impact */}
          {suggestion.impact && (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Impacto:</strong> {suggestion.impact}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onApply(suggestion)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200"
              style={{
                background: 'var(--success)',
                color: '#0a0e14'
              }}
            >
              <Check className="h-4 w-4" />
              Aplicar
            </button>
            <button
              onClick={() => onReject(suggestion)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg btn-secondary"
            >
              <X className="h-4 w-4" />
              Rechazar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContextualSuggestionsPanel({
  selectedSection,
  suggestions,
  allSuggestions,
}: ContextualSuggestionsPanelProps) {
  const {
    currentPrompt,
    setPrompt,
    analysis,
    setAnalysis,
    pushUndo,
  } = useAnalysisStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sortedSuggestions = useMemo(
    () => sortBySeverity(suggestions),
    [suggestions]
  );

  const displaySuggestions = selectedSection
    ? sortedSuggestions
    : sortBySeverity(allSuggestions);

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(displaySuggestions.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const applySelected = () => {
    const toApply = displaySuggestions.filter((s) => selectedIds.has(s.id));
    if (toApply.length === 0) return;

    pushUndo();
    let newPrompt = currentPrompt;
    const appliedIds: string[] = [];

    for (const suggestion of toApply) {
      const match = findTextInPrompt(newPrompt, suggestion.originalText, {
        enableFuzzy: true,
        fuzzyThreshold: 0.85,
      });

      if (match.found && match.confidence >= 0.85) {
        const before = newPrompt.substring(0, match.startIndex);
        const after = newPrompt.substring(match.endIndex);
        newPrompt = before + suggestion.suggestedRewrite + after;
        appliedIds.push(suggestion.id);
      }
    }

    setPrompt(newPrompt);

    if (analysis && appliedIds.length > 0) {
      const remainingSections = analysis.sections.filter(
        (s) => !appliedIds.includes(s.id)
      );
      setAnalysis({
        ...analysis,
        sections: remainingSections,
      });
    }

    setSelectedIds(new Set());
  };

  const rejectSelected = () => {
    const toReject = displaySuggestions.filter((s) => selectedIds.has(s.id));
    if (toReject.length === 0 || !analysis) return;

    const rejectIds = toReject.map((s) => s.id);
    const remainingSections = analysis.sections.filter(
      (s) => !rejectIds.includes(s.id)
    );
    setAnalysis({
      ...analysis,
      sections: remainingSections,
    });

    setSelectedIds(new Set());
  };

  const handleApply = (suggestion: AnalysisSection) => {
    const match = findTextInPrompt(currentPrompt, suggestion.originalText, {
      enableFuzzy: true,
      fuzzyThreshold: 0.85,
    });

    if (match.found && match.confidence >= 0.85) {
      pushUndo();

      const before = currentPrompt.substring(0, match.startIndex);
      const after = currentPrompt.substring(match.endIndex);
      const newPrompt = before + suggestion.suggestedRewrite + after;
      setPrompt(newPrompt);

      if (analysis) {
        const remainingSections = analysis.sections.filter(
          (s) => s.id !== suggestion.id
        );
        setAnalysis({
          ...analysis,
          sections: remainingSections,
        });
      }
    } else {
      alert('No se pudo encontrar el texto original en el prompt. El prompt puede haber cambiado.');
    }
  };

  const handleReject = (suggestion: AnalysisSection) => {
    if (analysis) {
      const remainingSections = analysis.sections.filter(
        (s) => s.id !== suggestion.id
      );
      setAnalysis({
        ...analysis,
        sections: remainingSections,
      });
    }
  };

  if (allSuggestions.length === 0) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6 text-center"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <Sparkles className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
        </div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Sin sugerencias
        </h3>
        <p className="text-xs max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
          Analiza tu prompt para ver sugerencias de mejora en este panel.
        </p>
      </div>
    );
  }

  const hasSelected = selectedIds.size > 0;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 py-3 border-b"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {selectedSection ? 'Sugerencias' : 'Todas las Sugerencias'}
            </h3>
            {selectedSection && (
              <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: 'var(--text-tertiary)' }}>
                {selectedSection.title}
              </p>
            )}
          </div>
          <span className="badge badge-accent">
            {displaySuggestions.length}
          </span>
        </div>

        {/* Bulk Actions */}
        {displaySuggestions.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={selectedIds.size === displaySuggestions.length ? deselectAll : selectAll}
              className="text-xs px-2 py-1 rounded-md transition-colors"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {selectedIds.size === displaySuggestions.length ? 'Ninguna' : 'Todas'}
            </button>
            {hasSelected && (
              <>
                <button
                  onClick={applySelected}
                  className="text-xs px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1"
                  style={{
                    background: 'var(--success)',
                    color: '#0a0e14'
                  }}
                >
                  <Check className="h-3 w-3" />
                  Aplicar ({selectedIds.size})
                </button>
                <button
                  onClick={rejectSelected}
                  className="text-xs px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <X className="h-3 w-3" />
                  Rechazar
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {displaySuggestions.length === 0 && selectedSection ? (
          <div className="text-center py-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--success-subtle)', border: '1px solid rgba(63, 185, 80, 0.2)' }}
            >
              <Check className="h-6 w-6" style={{ color: 'var(--success)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Esta sección está bien
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              No hay sugerencias para esta sección
            </p>
          </div>
        ) : (
          displaySuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onApply={handleApply}
              onReject={handleReject}
              showCheckbox={displaySuggestions.length > 1}
              isSelected={selectedIds.has(suggestion.id)}
              onToggleSelect={() => toggleSelect(suggestion.id)}
            />
          ))
        )}
      </div>

      {/* Summary footer if there are high/critical issues */}
      {displaySuggestions.some(
        (s) => s.severity === 'critical' || s.severity === 'high'
      ) && (
        <div
          className="flex-shrink-0 px-4 py-3 border-t"
          style={{
            background: 'var(--warning-subtle)',
            borderColor: 'rgba(240, 180, 41, 0.15)'
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning)' }} />
            <p className="text-xs" style={{ color: 'var(--warning)' }}>
              {displaySuggestions.filter(
                (s) => s.severity === 'critical' || s.severity === 'high'
              ).length}{' '}
              problemas importantes requieren atención
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
