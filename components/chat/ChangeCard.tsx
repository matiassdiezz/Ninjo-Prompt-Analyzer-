'use client';

import { useState } from 'react';
import { Check, X, Brain, ChevronDown, ChevronUp, ArrowRight, Trash2, Move, CornerDownRight } from 'lucide-react';
import type { ParsedChange } from '@/lib/utils/changeParser';

export type ChangeStatus = 'pending' | 'applied' | 'rejected';

interface ChangeCardProps {
  change: ParsedChange;
  status: ChangeStatus;
  onApply: (change: ParsedChange) => void;
  onReject: (change: ParsedChange) => void;
  onSaveLearning: (change: ParsedChange) => void;
  onNavigateToSection: (section: string) => void;
}

const ACTION_LABELS: Record<string, string> = {
  replace: 'Reemplazar',
  insert: 'Insertar',
  delete: 'Eliminar',
  move: 'Mover',
  keep: 'Mantener',
};

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  replace: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  insert: { bg: 'rgba(0, 212, 170, 0.1)', text: '#00d4aa', border: 'rgba(0, 212, 170, 0.3)' },
  delete: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  move: { bg: 'rgba(168, 85, 247, 0.1)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
  keep: { bg: 'rgba(156, 163, 175, 0.1)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
};

export function ChangeCard({
  change,
  status,
  onApply,
  onReject,
  onSaveLearning,
  onNavigateToSection,
}: ChangeCardProps) {
  const [expanded, setExpanded] = useState(true);
  const actionColor = ACTION_COLORS[change.action] || ACTION_COLORS.replace;
  const isKeep = change.action === 'keep';
  const isApplied = status === 'applied';
  const isRejected = status === 'rejected';

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--bg-tertiary)',
        border: `1px solid ${
          isApplied
            ? 'rgba(0, 212, 170, 0.4)'
            : isRejected
            ? 'rgba(239, 68, 68, 0.2)'
            : 'var(--border-subtle)'
        }`,
        opacity: isRejected ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isApplied && (
            <div
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0, 212, 170, 0.2)' }}
            >
              <Check className="h-3 w-3" style={{ color: '#00d4aa' }} />
            </div>
          )}
          {isRejected && (
            <div
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239, 68, 68, 0.2)' }}
            >
              <X className="h-3 w-3" style={{ color: '#f87171' }} />
            </div>
          )}
          <span
            className="text-xs font-semibold truncate"
            style={{
              color: isRejected ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: isRejected ? 'line-through' : 'none',
            }}
          >
            Cambio {change.index}: {change.title}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Section tag */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToSection(change.section);
            }}
            className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors hover:brightness-110"
            style={{
              background: actionColor.bg,
              color: actionColor.text,
              border: `1px solid ${actionColor.border}`,
            }}
            title={`Ir a sección: ${change.section}`}
          >
            {change.section}
          </button>

          {/* Action badge */}
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              background: actionColor.bg,
              color: actionColor.text,
            }}
          >
            {ACTION_LABELS[change.action]}
          </span>

          {expanded ? (
            <ChevronUp className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-3 py-2 space-y-2">
          {/* Keep action - simple info message */}
          {isKeep && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                background: 'rgba(156, 163, 175, 0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
              Esta sección queda como está
            </div>
          )}

          {/* Before text (replace, delete, move) */}
          {change.beforeText && !isKeep && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {change.action === 'delete' ? (
                  <Trash2 className="h-3 w-3" style={{ color: '#f87171' }} />
                ) : change.action === 'move' ? (
                  <Move className="h-3 w-3" style={{ color: '#c084fc' }} />
                ) : (
                  <X className="h-3 w-3" style={{ color: '#f87171' }} />
                )}
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: '#f87171' }}
                >
                  {change.action === 'delete'
                    ? 'Eliminar'
                    : change.action === 'move'
                    ? 'Mover este bloque'
                    : 'Antes'}
                </span>
              </div>
              <pre
                className="text-xs p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap"
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: 'var(--text-secondary)',
                }}
              >
                {change.beforeText}
              </pre>
            </div>
          )}

          {/* Arrow between before/after for replace */}
          {change.action === 'replace' && change.beforeText && change.afterText && (
            <div className="flex justify-center">
              <ArrowRight
                className="h-4 w-4 rotate-90"
                style={{ color: 'var(--text-muted)' }}
              />
            </div>
          )}

          {/* After text (replace, insert) */}
          {change.afterText && !isKeep && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Check className="h-3 w-3" style={{ color: '#00d4aa' }} />
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: '#00d4aa' }}
                >
                  {change.action === 'insert' ? 'Insertar' : 'Después'}
                </span>
              </div>
              <pre
                className="text-xs p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap"
                style={{
                  background: 'rgba(0, 212, 170, 0.06)',
                  border: '1px solid rgba(0, 212, 170, 0.15)',
                  color: 'var(--text-secondary)',
                }}
              >
                {change.afterText}
              </pre>
            </div>
          )}

          {/* Location for insert/move */}
          {change.location && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <CornerDownRight className="h-3 w-3 flex-shrink-0" />
              <span>
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Ubicación:
                </span>{' '}
                {change.location}
              </span>
            </div>
          )}

          {/* Reason */}
          <div
            className="text-xs leading-relaxed pt-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              Razón:
            </span>{' '}
            {change.reason}
          </div>

          {/* Action buttons */}
          {!isKeep && (
            <div className="flex items-center gap-2 pt-1">
              {status === 'pending' && (
                <>
                  <button
                    onClick={() => onReject(change)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:brightness-110"
                    style={{
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => onSaveLearning(change)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:brightness-110 flex items-center gap-1"
                    style={{
                      background: 'var(--bg-elevated)',
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--border-accent)',
                    }}
                  >
                    <Brain className="h-3 w-3" />
                    Guardar
                  </button>
                  <button
                    onClick={() => onApply(change)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:brightness-110 flex items-center gap-1 ml-auto"
                    style={{
                      background: 'var(--accent-primary)',
                      color: '#0a0e14',
                    }}
                  >
                    <Check className="h-3 w-3" />
                    Aplicar
                  </button>
                </>
              )}
              {isApplied && (
                <span className="text-xs font-medium" style={{ color: '#00d4aa' }}>
                  Cambio aplicado
                </span>
              )}
              {isRejected && (
                <span className="text-xs font-medium" style={{ color: '#f87171' }}>
                  Cambio rechazado
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
