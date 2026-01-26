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
      <div className="p-4 text-center text-gray-500">
        <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay versiones guardadas</p>
        <p className="text-xs text-gray-400 mt-1">
          Las versiones se crean al aplicar cambios
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
        return <Check className="h-3 w-3 text-green-500" />;
      case 'suggestion_rejected':
        return <X className="h-3 w-3 text-red-500" />;
      case 'manual_edit':
        return <Edit className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Historial de Versiones</h3>
          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
            {versions.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {sortedVersions.map((version, index) => {
            const isCurrent = isCurrentVersion(version);
            const isExpanded = expandedVersionId === version.id;
            const isPreviewing = previewVersionId === version.id;

            return (
              <div key={version.id} className="relative">
                {/* Timeline dot */}
                <div
                  className={`absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                    isCurrent
                      ? 'bg-blue-500 border-blue-500'
                      : index === 0
                      ? 'bg-green-500 border-green-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {isCurrent && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>

                {/* Content */}
                <div className={`ml-12 mr-4 py-3 ${index !== sortedVersions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div
                    className="cursor-pointer"
                    onClick={() => setExpandedVersionId(isExpanded ? null : version.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {version.label}
                          </p>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              actual
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(version.timestamp, {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                          {version.changes && version.changes.length > 0 && (
                            <span className="text-gray-400">
                              · {version.changes.length} cambios
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
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
                              className="flex items-start gap-2 text-xs p-2 bg-gray-50 rounded"
                            >
                              {getChangeIcon(change.type)}
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-700">{change.description}</p>
                                {change.justification && (
                                  <p className="text-gray-500 mt-0.5 italic">
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
                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                            isPreviewing
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Eye className="h-3 w-3" />
                          {isPreviewing ? 'Ocultando...' : 'Vista previa'}
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={() => handleRestore(version)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restaurar
                          </button>
                        )}
                      </div>

                      {/* Preview */}
                      {isPreviewing && (
                        <div className="bg-white border border-gray-200 rounded p-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Vista previa del contenido:
                          </p>
                          <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
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
