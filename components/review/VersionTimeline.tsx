'use client';

import { useState } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  GitBranch,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Edit,
  Clock,
} from 'lucide-react';
import type { PromptVersion } from '@/types/prompt';

export function VersionTimeline() {
  const { getCurrentProject } = useKnowledgeStore();
  const { setPrompt, currentPrompt } = useAnalysisStore();
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);

  const project = getCurrentProject();
  const versions = project?.versions || [];

  if (versions.length === 0) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6 text-center"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <GitBranch className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
        </div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No hay versiones guardadas
        </h3>
        <p className="text-xs max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
          Las versiones se crean automáticamente al aplicar cambios
        </p>
      </div>
    );
  }

  // Sort versions by timestamp descending (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.timestamp - a.timestamp);

  const handleRestore = (version: PromptVersion) => {
    setPrompt(version.content);
    setPreviewVersionId(null);
  };

  const handlePreview = (version: PromptVersion) => {
    if (previewVersionId === version.id) {
      setPreviewVersionId(null);
    } else {
      setPreviewVersionId(version.id);
    }
  };

  const isCurrentVersion = (version: PromptVersion) => {
    return version.content === currentPrompt;
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'suggestion_applied':
        return <Check className="h-3 w-3" style={{ color: 'var(--success)' }} />;
      case 'suggestion_rejected':
        return <X className="h-3 w-3" style={{ color: 'var(--error)' }} />;
      case 'manual_edit':
        return <Edit className="h-3 w-3" style={{ color: 'var(--info)' }} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      <div
        className="flex-shrink-0 px-4 py-3 border-b"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Historial de Versiones
          </h3>
          <span className="badge badge-accent">{versions.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Timeline line */}
          <div
            className="absolute left-6 top-0 bottom-0 w-0.5"
            style={{ background: 'var(--border-subtle)' }}
          />

          {sortedVersions.map((version, index) => {
            const isCurrent = isCurrentVersion(version);
            const isExpanded = expandedVersionId === version.id;
            const isPreviewing = previewVersionId === version.id;

            return (
              <div key={version.id} className="relative">
                {/* Timeline dot */}
                <div
                  className="absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10"
                  style={{
                    background: isCurrent
                      ? 'var(--accent-primary)'
                      : index === 0
                      ? 'var(--success)'
                      : 'var(--bg-elevated)',
                    borderColor: isCurrent
                      ? 'var(--accent-primary)'
                      : index === 0
                      ? 'var(--success)'
                      : 'var(--border-default)'
                  }}
                >
                  {isCurrent && <div className="w-2 h-2 rounded-full" style={{ background: '#0a0e14' }} />}
                </div>

                {/* Content */}
                <div
                  className="ml-12 mr-4 py-3"
                  style={{
                    borderBottom: index !== sortedVersions.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                  }}
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => setExpandedVersionId(isExpanded ? null : version.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {version.label}
                          </p>
                          {isCurrent && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{
                                background: 'var(--accent-subtle)',
                                color: 'var(--accent-primary)',
                                border: '1px solid var(--border-accent)'
                              }}
                            >
                              actual
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(version.timestamp, {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                          {version.changes && version.changes.length > 0 && (
                            <span style={{ color: 'var(--text-muted)' }}>
                              · {version.changes.length} cambios
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        ) : (
                          <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3">
                      {/* Changes list */}
                      {version.changes && version.changes.length > 0 && (
                        <div className="space-y-1">
                          {version.changes.map((change, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-xs p-2 rounded-lg"
                              style={{ background: 'var(--bg-tertiary)' }}
                            >
                              {getChangeIcon(change.type)}
                              <div className="flex-1 min-w-0">
                                <p style={{ color: 'var(--text-secondary)' }}>{change.description}</p>
                                {change.justification && (
                                  <p className="mt-0.5 italic" style={{ color: 'var(--text-tertiary)' }}>
                                    "{change.justification}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePreview(version)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors"
                          style={{
                            background: isPreviewing ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                            color: isPreviewing ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            border: `1px solid ${isPreviewing ? 'var(--border-accent)' : 'var(--border-subtle)'}`
                          }}
                        >
                          <Eye className="h-3 w-3" />
                          {isPreviewing ? 'Ocultar' : 'Vista previa'}
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={() => handleRestore(version)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                            style={{
                              background: 'var(--accent-primary)',
                              color: '#0a0e14'
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restaurar
                          </button>
                        )}
                      </div>

                      {/* Preview */}
                      {isPreviewing && (
                        <div
                          className="rounded-xl p-3"
                          style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-subtle)'
                          }}
                        >
                          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                            Vista previa del contenido:
                          </p>
                          <pre
                            className="text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto p-2 rounded-lg"
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {version.content.substring(0, 500)}
                            {version.content.length > 500 && '...'}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
