'use client';

import { useState } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { AnalysisSection, CATEGORY_INFO } from '@/types/analysis';
import { DiffViewer } from './DiffViewer';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  X,
  Edit,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
} from 'lucide-react';

interface SuggestionCardProps {
  section: AnalysisSection;
}

const severityConfig = {
  critical: {
    icon: AlertOctagon,
    color: 'var(--error)',
    bgColor: 'var(--error-subtle)',
    borderColor: 'rgba(248, 81, 73, 0.2)',
    label: 'Crítico',
  },
  high: {
    icon: AlertCircle,
    color: '#ff8c42',
    bgColor: 'rgba(255, 140, 66, 0.1)',
    borderColor: 'rgba(255, 140, 66, 0.2)',
    label: 'Alto',
  },
  medium: {
    icon: AlertTriangle,
    color: 'var(--warning)',
    bgColor: 'var(--warning-subtle)',
    borderColor: 'rgba(240, 180, 41, 0.2)',
    label: 'Medio',
  },
  low: {
    icon: Info,
    color: 'var(--info)',
    bgColor: 'var(--info-subtle)',
    borderColor: 'rgba(88, 166, 255, 0.2)',
    label: 'Bajo',
  },
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  mission: { bg: 'var(--info-subtle)', text: 'var(--info)', border: 'rgba(88, 166, 255, 0.2)' },
  persona: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.2)' },
  flow: { bg: 'var(--success-subtle)', text: 'var(--success)', border: 'rgba(63, 185, 80, 0.2)' },
  guardrails: { bg: 'var(--error-subtle)', text: 'var(--error)', border: 'rgba(248, 81, 73, 0.2)' },
  engagement: { bg: 'var(--warning-subtle)', text: 'var(--warning)', border: 'rgba(240, 180, 41, 0.2)' },
  examples: { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366f1', border: 'rgba(99, 102, 241, 0.2)' },
  efficiency: { bg: 'var(--bg-elevated)', text: 'var(--text-secondary)', border: 'var(--border-subtle)' },
  hallucination: { bg: 'rgba(255, 140, 66, 0.1)', text: '#ff8c42', border: 'rgba(255, 140, 66, 0.2)' },
};

export function SuggestionCard({ section }: SuggestionCardProps) {
  const { applySuggestion, rejectSuggestion, suggestionStates } = useAnalysisStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(section.suggestedRewrite);

  const config = severityConfig[section.severity];
  const Icon = config.icon;
  const state = suggestionStates[section.id];
  const categoryInfo = CATEGORY_INFO[section.category];
  const catColors = categoryColors[section.category] || categoryColors.efficiency;

  const handleAccept = () => {
    applySuggestion(section.id, section.suggestedRewrite);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleSaveEdit = () => {
    applySuggestion(section.id, editedText);
    setIsEditing(false);
  };

  const handleReject = () => {
    rejectSuggestion(section.id);
  };

  const getBorderStyle = () => {
    if (state?.status === 'accepted') return { borderColor: 'rgba(63, 185, 80, 0.3)', background: 'var(--success-subtle)' };
    if (state?.status === 'rejected') return { borderColor: 'var(--border-subtle)', background: 'var(--bg-tertiary)', opacity: 0.6 };
    return { borderColor: config.borderColor };
  };

  const borderStyle = getBorderStyle();

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        border: `1px solid ${borderStyle.borderColor}`,
        background: borderStyle.background || 'var(--bg-secondary)',
        opacity: borderStyle.opacity || 1
      }}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer transition-all duration-200 hover:bg-[var(--accent-subtle)]"
        style={{ background: state?.status === 'accepted' ? 'var(--success-subtle)' : config.bgColor }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: config.color }} />
          <div className="flex-1 min-w-0">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
                style={{
                  background: config.bgColor,
                  color: config.color,
                  border: `1px solid ${config.borderColor}`
                }}
              >
                {config.label}
              </span>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                style={{
                  background: catColors.bg,
                  color: catColors.text,
                  border: `1px solid ${catColors.border}`
                }}
              >
                {categoryInfo?.label || section.category}
              </span>
              {state?.status === 'accepted' && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
                  style={{
                    background: 'var(--success-subtle)',
                    color: 'var(--success)',
                    border: '1px solid rgba(63, 185, 80, 0.2)'
                  }}
                >
                  Aplicado
                </span>
              )}
              {state?.status === 'rejected' && (
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  Rechazado
                </span>
              )}
            </div>

            {/* Issues */}
            <ul className="space-y-1 mb-2">
              {section.issues.map((issue, idx) => (
                <li key={idx} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>

            {/* Impact */}
            {section.impact && (
              <p className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Impacto:</strong> {section.impact}
              </p>
            )}
          </div>

          <button className="flex-shrink-0 p-1 rounded-md transition-all duration-200">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div
          className="p-4 border-t space-y-4"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-primary)' }}
        >
          {/* Explanation */}
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Explicación
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {section.explanation}
            </p>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                Editar sugerencia:
              </label>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="input w-full h-32 font-mono text-sm resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200"
                  style={{ background: 'var(--success)', color: '#0a0e14' }}
                >
                  <Check className="h-3.5 w-3.5" />
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedText(section.suggestedRewrite);
                  }}
                  className="px-4 py-2 text-xs font-medium rounded-lg btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <DiffViewer oldValue={section.originalText} newValue={section.suggestedRewrite} />

              {!state && (
                <div className="flex gap-2">
                  <button
                    onClick={handleAccept}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200"
                    style={{ background: 'var(--success)', color: '#0a0e14' }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Aplicar
                  </button>
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg btn-primary"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg btn-secondary"
                  >
                    <X className="h-3.5 w-3.5" />
                    Ignorar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
