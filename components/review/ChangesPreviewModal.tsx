'use client';

import { useMemo } from 'react';
import { X, AlertTriangle, Check, ArrowRight } from 'lucide-react';
import { findTextInPrompt, type TextMatchResult } from '@/lib/utils/textMatcher';
import type { AnalysisSection } from '@/types/analysis';

interface ChangePreview {
  section: AnalysisSection;
  match: TextMatchResult;
  canApply: boolean;
  originalText: string;
  newText: string;
}

interface ChangesPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPrompt: string;
  changes: Array<{
    section: AnalysisSection;
    rewrite: string;
  }>;
}

export function ChangesPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  currentPrompt,
  changes,
}: ChangesPreviewModalProps) {
  const previews = useMemo((): ChangePreview[] => {
    return changes.map((change) => {
      const match = findTextInPrompt(currentPrompt, change.section.originalText, {
        enableFuzzy: true,
        fuzzyThreshold: 0.85,
      });

      return {
        section: change.section,
        match,
        canApply: match.found && match.confidence >= 0.90,
        originalText: match.found ? match.matchedText : change.section.originalText,
        newText: change.rewrite,
      };
    });
  }, [changes, currentPrompt]);

  const applicableCount = previews.filter((p) => p.canApply).length;
  const nonApplicableCount = previews.filter((p) => !p.canApply).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Vista Previa de Cambios
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Revisa los cambios antes de aplicarlos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning if some changes can't apply */}
        {nonApplicableCount > 0 && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>{nonApplicableCount}</strong> cambio(s) no se pueden aplicar porque el
              texto original no coincide exactamente con el prompt actual.
            </p>
          </div>
        )}

        {/* Changes List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {previews.map((preview, index) => (
            <div
              key={preview.section.id}
              className={`border rounded-lg overflow-hidden ${
                preview.canApply
                  ? 'border-gray-200'
                  : 'border-red-200 bg-red-50/50'
              }`}
            >
              {/* Change Header */}
              <div
                className={`px-4 py-2 border-b flex items-center justify-between ${
                  preview.canApply
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-red-100 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {preview.canApply ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    Cambio #{index + 1}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      preview.section.severity === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : preview.section.severity === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : preview.section.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {preview.section.severity}
                  </span>
                </div>
                {!preview.canApply && (
                  <span className="text-xs text-red-600">
                    Coincidencia: {(preview.match.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Diff View */}
              <div className="p-4 space-y-3">
                {/* Original */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    Original
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded p-3 font-mono text-xs text-gray-800 whitespace-pre-wrap">
                    {preview.originalText || (
                      <span className="italic text-red-500">
                        No se encontró el texto en el prompt
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="h-4 w-4 text-gray-400 rotate-90" />
                </div>

                {/* New */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    Nuevo
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded p-3 font-mono text-xs text-gray-800 whitespace-pre-wrap">
                    {preview.newText}
                  </div>
                </div>

                {/* Issue description */}
                {preview.section.issues[0] && (
                  <p className="text-xs text-gray-600 pt-2 border-t border-gray-100">
                    <strong>Problema:</strong> {preview.section.issues[0]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {applicableCount > 0 && (
              <span className="text-green-600 font-medium">
                {applicableCount} aplicable(s)
              </span>
            )}
            {applicableCount > 0 && nonApplicableCount > 0 && (
              <span className="mx-2">·</span>
            )}
            {nonApplicableCount > 0 && (
              <span className="text-red-600 font-medium">
                {nonApplicableCount} no aplicable(s)
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={applicableCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Aplicar {applicableCount} Cambio(s)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
