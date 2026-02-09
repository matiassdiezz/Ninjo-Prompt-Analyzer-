'use client';

import { AlertTriangle, AlertCircle, Info, X, ArrowRight } from 'lucide-react';
import type { FlowValidationWarning } from '@/lib/utils/flowValidator';

interface FlowValidationPanelProps {
  warnings: FlowValidationWarning[];
  onClose: () => void;
  onGoToNode: (nodeId: string) => void;
}

const severityConfig = {
  error: {
    icon: AlertTriangle,
    color: 'var(--error)',
    bg: 'var(--error-subtle)',
    label: 'errores',
  },
  warning: {
    icon: AlertCircle,
    color: 'var(--warning)',
    bg: 'var(--warning-subtle)',
    label: 'advertencias',
  },
  info: {
    icon: Info,
    color: 'var(--accent-primary)',
    bg: 'var(--bg-tertiary)',
    label: 'info',
  },
};

export function FlowValidationPanel({
  warnings,
  onClose,
  onGoToNode,
}: FlowValidationPanelProps) {
  const errorCount = warnings.filter((w) => w.severity === 'error').length;
  const warningCount = warnings.filter((w) => w.severity === 'warning').length;
  const infoCount = warnings.filter((w) => w.severity === 'info').length;

  return (
    <div
      className="h-full flex flex-col border-r"
      style={{
        width: 280,
        minWidth: 280,
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Validacion del Flujo
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Summary badges */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {errorCount > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: 'var(--error-subtle)',
              color: 'var(--error)',
            }}
          >
            {errorCount} {errorCount === 1 ? 'error' : 'errores'}
          </span>
        )}
        {warningCount > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: 'var(--warning-subtle)',
              color: 'var(--warning)',
            }}
          >
            {warningCount}
          </span>
        )}
        {infoCount > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            {infoCount} info
          </span>
        )}
        {warnings.length === 0 && (
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--success)' }}
          >
            Sin problemas detectados
          </span>
        )}
      </div>

      {/* Warnings list */}
      <div className="flex-1 overflow-y-auto">
        {warnings.map((warning) => {
          const config = severityConfig[warning.severity];
          const Icon = config.icon;

          return (
            <div
              key={warning.id}
              className="flex items-start gap-2 px-3 py-2.5 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <Icon
                className="h-4 w-4 mt-0.5 shrink-0"
                style={{ color: config.color }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {warning.message}
                </p>
                {warning.nodeId && (
                  <button
                    onClick={() => onGoToNode(warning.nodeId!)}
                    className="flex items-center gap-1 mt-1 text-xs transition-colors"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <ArrowRight className="h-3 w-3" />
                    Ir al nodo
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
