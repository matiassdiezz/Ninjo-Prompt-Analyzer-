'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { CATEGORY_INFO, type AnalysisSection } from '@/types/analysis';
import { findTextInPrompt } from '@/lib/utils/textMatcher';
import { ChangesPreviewModal } from './ChangesPreviewModal';
import {
  Check,
  X,
  ChevronDown,
  ChevronRight,
  BookmarkPlus,
  Play,
  AlertCircle,
  MessageSquare,
  Eye,
  Undo2,
  Redo2,
} from 'lucide-react';

interface SuggestionReviewPanelProps {
  onApplyChanges: () => void;
}

interface ReviewItem {
  section: AnalysisSection;
  status: 'pending' | 'accepted' | 'rejected';
  justification: string;
  expanded: boolean;
}

export function SuggestionReviewPanel({ onApplyChanges }: SuggestionReviewPanelProps) {
  const { analysis, currentPrompt, setPrompt, setAnalysis, clearAnalysis, pushUndo, undo, redo, canUndo, canRedo } = useAnalysisStore();
  const { recordDecision, currentProjectId } = useKnowledgeStore();

  const [showPreview, setShowPreview] = useState(false);
  const [reviewItems, setReviewItems] = useState<Record<string, ReviewItem>>({});

  // Track which section IDs we've already added to avoid duplicates
  const processedSectionIds = useRef<Set<string>>(new Set());

  // Sync reviewItems when analysis.sections changes (for streaming)
  useEffect(() => {
    if (!analysis?.sections || !Array.isArray(analysis.sections)) {
      setReviewItems({});
      processedSectionIds.current.clear();
      return;
    }

    setReviewItems((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      // Add new sections that don't exist in reviewItems
      for (const section of analysis.sections) {
        // Skip invalid sections
        if (!section || !section.id) continue;

        if (!updated[section.id] && !processedSectionIds.current.has(section.id)) {
          updated[section.id] = {
            section,
            status: 'pending',
            justification: '',
            expanded: false,
          };
          processedSectionIds.current.add(section.id);
          hasChanges = true;
        }
      }

      // Remove sections that no longer exist in analysis
      const currentSectionIds = new Set(
        analysis.sections.filter(s => s && s.id).map(s => s.id)
      );
      for (const id of Object.keys(updated)) {
        if (!currentSectionIds.has(id)) {
          delete updated[id];
          processedSectionIds.current.delete(id);
          hasChanges = true;
        }
      }

      return hasChanges ? updated : prev;
    });
  }, [analysis?.sections]);

  const [showJustificationFor, setShowJustificationFor] = useState<string | null>(null);
  const [tempJustification, setTempJustification] = useState('');

  // Filter out invalid items (defensive check for corrupted state)
  const items = useMemo(() => {
    return Object.values(reviewItems).filter(
      (item): item is ReviewItem =>
        item != null &&
        item.section != null &&
        typeof item.section.id === 'string'
    );
  }, [reviewItems]);

  const acceptedCount = items.filter((i) => i.status === 'accepted').length;
  const rejectedCount = items.filter((i) => i.status === 'rejected').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  if (!analysis || analysis.sections.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay sugerencias para revisar</p>
      </div>
    );
  }

  const handleStatusChange = (id: string, status: 'accepted' | 'rejected') => {
    if (status === 'rejected') {
      setShowJustificationFor(id);
      setTempJustification('');
    } else {
      setReviewItems((prev) => {
        if (!prev[id]) return prev;
        return {
          ...prev,
          [id]: { ...prev[id], status, justification: '' },
        };
      });
    }
  };

  const handleJustificationSubmit = (id: string) => {
    setReviewItems((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], status: 'rejected', justification: tempJustification },
      };
    });
    setShowJustificationFor(null);
    setTempJustification('');
  };

  const toggleExpanded = (id: string) => {
    setReviewItems((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], expanded: !prev[id].expanded },
      };
    });
  };

  const selectAll = () => {
    setReviewItems((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status: 'accepted' };
      });
      return updated;
    });
  };

  const deselectAll = () => {
    setReviewItems((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status: 'pending' };
      });
      return updated;
    });
  };

  // Get changes to apply for preview modal
  const getChangesToApply = () => {
    return items
      .filter((i) => i.status === 'accepted')
      .map((item) => ({
        section: item.section,
        rewrite: item.section.suggestedRewrite,
      }));
  };

  const applyAcceptedChanges = () => {
    const acceptedItems = items.filter((i) => i.status === 'accepted');
    if (acceptedItems.length === 0) return;

    // Push current state to undo stack before making changes
    pushUndo();

    let newPrompt = currentPrompt;
    const appliedChanges: string[] = [];
    const failedChanges: string[] = [];

    // Find matches for all accepted items and sort by position (descending)
    // This ensures we apply changes from end to start to avoid index shifting
    const itemsWithMatches = acceptedItems.map((item) => {
      const match = findTextInPrompt(newPrompt, item.section.originalText, {
        enableFuzzy: true,
        fuzzyThreshold: 0.85,
      });
      return { item, match };
    });

    // Sort by startIndex descending (apply from end to start)
    itemsWithMatches.sort((a, b) => b.match.startIndex - a.match.startIndex);

    // Apply each change using the new text matcher
    for (const { item, match } of itemsWithMatches) {
      const { section } = item;
      const suggestedText = section.suggestedRewrite;

      if (match.found && match.confidence >= 0.85) {
        // Replace using the matched indices
        const before = newPrompt.substring(0, match.startIndex);
        const after = newPrompt.substring(match.endIndex);
        newPrompt = before + suggestedText + after;
        appliedChanges.push(section.id);

        // Record decision
        if (currentProjectId) {
          recordDecision({
            sectionId: section.id,
            projectId: currentProjectId,
            decision: 'accepted',
            justification: `Aplicado (${match.strategy}, ${(match.confidence * 100).toFixed(0)}% match)`,
            originalText: section.originalText,
            suggestedText: section.suggestedRewrite,
            category: section.category,
            severity: section.severity,
            savedToKnowledge: false,
          });
        }
      } else {
        failedChanges.push(section.issues[0] || 'Texto original no encontrado');
      }
    }

    // Record rejected decisions
    const rejectedItems = items.filter((i) => i.status === 'rejected');
    for (const item of rejectedItems) {
      if (currentProjectId) {
        recordDecision({
          sectionId: item.section.id,
          projectId: currentProjectId,
          decision: 'rejected',
          justification: item.justification,
          originalText: item.section.originalText,
          suggestedText: item.section.suggestedRewrite,
          category: item.section.category,
          severity: item.section.severity,
          savedToKnowledge: false,
        });
      }
    }

    // Show feedback if some changes failed
    if (failedChanges.length > 0) {
      console.warn('Algunos cambios no se pudieron aplicar:', failedChanges);
      alert(`Se aplicaron ${appliedChanges.length} cambios.\n${failedChanges.length} cambios no se pudieron aplicar porque el texto original no coincide exactamente.`);
    }

    setPrompt(newPrompt);

    // Remove applied and rejected sections from analysis
    if (analysis) {
      const remainingSections = analysis.sections.filter(
        (s) => !appliedChanges.includes(s.id) && !rejectedItems.some(r => r.section.id === s.id)
      );

      if (remainingSections.length === 0) {
        // Clear analysis if no sections remain
        clearAnalysis();
      } else {
        // Update analysis with remaining sections
        setAnalysis({
          ...analysis,
          sections: remainingSections,
        });
      }
    }

    setShowPreview(false);
    onApplyChanges();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Revisar Sugerencias</h3>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
              {acceptedCount} aceptadas
            </span>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">
              {rejectedCount} rechazadas
            </span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
              {pendingCount} pendientes
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
          >
            Seleccionar todas
          </button>
          <button
            onClick={deselectAll}
            className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            Deseleccionar
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item) => {
          // Skip invalid items
          if (!item?.section?.id) return null;

          return (
          <div
            key={item.section.id}
            className={`border-b border-gray-100 ${
              item.status === 'accepted'
                ? 'bg-green-50'
                : item.status === 'rejected'
                ? 'bg-red-50 opacity-60'
                : 'bg-white'
            }`}
          >
            {/* Row */}
            <div className="flex items-center gap-2 px-4 py-3">
              {/* Checkbox / Status */}
              <button
                onClick={() =>
                  handleStatusChange(
                    item.section.id,
                    item.status === 'accepted' ? 'rejected' : 'accepted'
                  )
                }
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  item.status === 'accepted'
                    ? 'bg-green-500 border-green-500 text-white'
                    : item.status === 'rejected'
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {item.status === 'accepted' && <Check className="h-3 w-3" />}
                {item.status === 'rejected' && <X className="h-3 w-3" />}
              </button>

              {/* Content */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => toggleExpanded(item.section.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getSeverityColor(item.section.severity)}`}>
                    {item.section.severity}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {CATEGORY_INFO[item.section.category]?.label || item.section.category}
                  </span>
                </div>
                <p className="text-sm text-gray-800 line-clamp-1">
                  {item.section.issues?.[0] || 'Sin descripción'}
                </p>
                {item.status === 'rejected' && item.justification && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {item.justification}
                  </p>
                )}
              </div>

              {/* Expand */}
              <button
                onClick={() => toggleExpanded(item.section.id)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {item.expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Expanded Content */}
            {item.expanded && (
              <div className="px-4 pb-3 space-y-2">
                <div className="bg-white rounded border border-gray-200 p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Original:</p>
                  <p className="text-xs text-gray-700 font-mono bg-red-50 p-2 rounded">
                    {item.section.originalText}
                  </p>
                </div>
                <div className="bg-white rounded border border-gray-200 p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Sugerencia:</p>
                  <p className="text-xs text-gray-700 font-mono bg-green-50 p-2 rounded">
                    {item.section.suggestedRewrite}
                  </p>
                </div>
                <p className="text-xs text-gray-600">
                  <strong>Impacto:</strong> {item.section.impact}
                </p>
              </div>
            )}

            {/* Justification Modal */}
            {showJustificationFor === item.section.id && (
              <div className="px-4 pb-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-800 mb-2">
                    ¿Por qué rechazas esta sugerencia? (esto ayuda a mejorar futuros análisis)
                  </p>
                  <textarea
                    value={tempJustification}
                    onChange={(e) => setTempJustification(e.target.value)}
                    placeholder="Ej: El tono propuesto no es apropiado para este cliente..."
                    className="w-full h-16 text-xs p-2 border border-yellow-300 rounded resize-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleJustificationSubmit(item.section.id)}
                      className="text-xs px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Confirmar Rechazo
                    </button>
                    <button
                      onClick={() => setShowJustificationFor(null)}
                      className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-2">
        {/* Undo/Redo buttons */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Deshacer último cambio"
          >
            <Undo2 className="h-4 w-4" />
            Deshacer
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Rehacer último cambio"
          >
            <Redo2 className="h-4 w-4" />
            Rehacer
          </button>
        </div>

        {/* Preview and Apply buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(true)}
            disabled={acceptedCount === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Eye className="h-4 w-4" />
            Vista Previa
          </button>
          <button
            onClick={applyAcceptedChanges}
            disabled={acceptedCount === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Play className="h-4 w-4" />
            Aplicar {acceptedCount}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      <ChangesPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={applyAcceptedChanges}
        currentPrompt={currentPrompt}
        changes={getChangesToApply()}
      />
    </div>
  );
}
