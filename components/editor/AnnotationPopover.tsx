'use client';

import { useState, useEffect, useRef } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import type { PromptAnnotation } from '@/types/prompt';
import { detectCategory } from '@/lib/utils/learningExtractor';
import {
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  Trash2,
  Save,
  BookOpen,
  X,
  Zap,
} from 'lucide-react';

interface AnnotationPopoverProps {
  position: { x: number; y: number };
  selectedText: string;
  startOffset: number;
  endOffset: number;
  existingAnnotation?: PromptAnnotation;
  onClose: () => void;
}

const annotationTypes: { type: PromptAnnotation['type']; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'note', label: 'Nota', icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'var(--info)' },
  { type: 'improvement', label: 'Mejora', icon: <Lightbulb className="h-3.5 w-3.5" />, color: 'var(--success)' },
  { type: 'warning', label: 'Advertencia', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'var(--warning)' },
  { type: 'question', label: 'Pregunta', icon: <HelpCircle className="h-3.5 w-3.5" />, color: '#a855f7' },
];

export function AnnotationPopover({
  position,
  selectedText,
  startOffset,
  endOffset,
  existingAnnotation,
  onClose,
}: AnnotationPopoverProps) {
  const { addAnnotation, updateAnnotation, deleteAnnotation, currentPrompt, setPrompt, pushUndo, createVersion, autoSaveEnabled } = useAnalysisStore();
  const { addEntry, getCurrentProject, incrementUsage, entries } = useKnowledgeStore();

  const [type, setType] = useState<PromptAnnotation['type']>(existingAnnotation?.type || 'note');
  const [comment, setComment] = useState(existingAnnotation?.comment || '');

  const project = getCurrentProject();

  const handleSave = () => {
    if (!comment.trim()) return;

    if (existingAnnotation) {
      updateAnnotation(existingAnnotation.id, { type, comment });
    } else {
      addAnnotation({
        startOffset,
        endOffset,
        selectedText,
        comment,
        type,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (existingAnnotation) {
      deleteAnnotation(existingAnnotation.id);
    }
    onClose();
  };

  const handleApplyPattern = () => {
    if (!existingAnnotation?.knowledgeEntryId) return;
    
    const learning = entries.find(e => e.id === existingAnnotation.knowledgeEntryId);
    if (!learning || !learning.example) return;
    
    // Save state for undo
    pushUndo();
    
    // Replace selected text with the learning example
    const before = currentPrompt.substring(0, startOffset);
    const after = currentPrompt.substring(endOffset);
    const newPrompt = before + learning.example + after;
    
    setPrompt(newPrompt);
    
    // Increment usage
    if (project) {
      incrementUsage(learning.id, project.id);
    }
    
    // Create version if auto-save enabled
    if (autoSaveEnabled) {
      createVersion(
        `Aplicado patrón: ${learning.title}`,
        'suggestion_applied',
        { category: learning.tags[0] || 'annotation' }
      );
    }
    
    // Delete the annotation since it was applied
    deleteAnnotation(existingAnnotation.id);
    
    onClose();
  };

  const handleSaveAsKnowledge = () => {
    if (!comment.trim()) return;

    // Detect category automatically
    const detectedCategory = detectCategory({
      pattern: selectedText,
      suggestion: comment,
      priority: 'Media',
      frequency: 'Ocasional',
    });
    
    // Save the annotation first
    let annotationId = existingAnnotation?.id;
    if (!annotationId) {
      annotationId = addAnnotation({
        startOffset,
        endOffset,
        selectedText,
        comment,
        type,
      });
    }

    // Create a knowledge entry with more context
    const newEntryId = crypto.randomUUID();
    addEntry({
      type: type === 'warning' ? 'anti_pattern' : 'pattern',
      title: comment.substring(0, 60) + (comment.length > 60 ? '...' : ''),
      description: comment,
      example: selectedText,
      tags: [
        type,
        'annotation',
        detectedCategory,
        project?.clientName ? `cliente-${project.clientName.toLowerCase().replace(/\s+/g, '-')}` : '',
      ].filter(Boolean),
      feedbackType: type,
      effectiveness: type === 'warning' ? 'high' : 'medium',
    });

    // Mark annotation as saved to knowledge
    if (annotationId) {
      updateAnnotation(annotationId, { savedAsKnowledge: true, knowledgeEntryId: newEntryId });
    }

    onClose();
  };

  const currentType = annotationTypes.find((t) => t.type === type);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: position.x, y: position.y });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [manualPosition, setManualPosition] = useState<{ x: number; y: number } | null>(null);

  // Adjust position to keep popover within viewport
  useEffect(() => {
    if (!popoverRef.current) return;

    const popover = popoverRef.current;
    const rect = popover.getBoundingClientRect();
    const padding = 16; // Padding from viewport edges

    let newX = position.x;
    let newY = position.y;

    // Adjust horizontal position
    const halfWidth = rect.width / 2;
    if (position.x - halfWidth < padding) {
      newX = halfWidth + padding;
    } else if (position.x + halfWidth > window.innerWidth - padding) {
      newX = window.innerWidth - halfWidth - padding;
    }

    // Adjust vertical position - prefer below, but flip if no space
    if (position.y + rect.height > window.innerHeight - padding) {
      // Not enough space below, try to place above or at the top
      newY = Math.max(padding, position.y - rect.height - 20);
    }

    // Ensure it's not cut off at the top
    if (newY < padding) {
      newY = padding;
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [position]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const currentPos = manualPosition ?? adjustedPosition;
    setDragStart({
      x: e.clientX - currentPos.x,
      y: e.clientY - currentPos.y,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setManualPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Use manual position if user has dragged, otherwise use auto-adjusted position
  const finalPosition = manualPosition ?? adjustedPosition;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        ref={popoverRef}
        className="fixed z-50 rounded-xl shadow-xl animate-fadeIn"
        style={{
          left: `${finalPosition.x}px`,
          top: `${finalPosition.y}px`,
          width: '340px',
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          transform: 'translateX(-50%)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
      {/* Header - Drag Handle */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          borderColor: 'var(--border-subtle)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <div style={{ color: currentType?.color }}>{currentType?.icon}</div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {existingAnnotation ? 'Editar comentario' : 'Agregar comentario'}
          </span>
        </div>
        <button
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-1 rounded-lg btn-ghost"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Selected text preview */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          Texto seleccionado
        </p>
        <p
          className="text-xs font-mono line-clamp-2 p-2 rounded-lg"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          {selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}
        </p>
      </div>

      {/* Type selector */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Tipo
        </p>
        <div className="flex gap-1">
          {annotationTypes.map((t) => (
            <button
              key={t.type}
              onClick={() => setType(t.type)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: type === t.type ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                color: type === t.type ? t.color : 'var(--text-secondary)',
                border: type === t.type ? `1px solid ${t.color}30` : '1px solid transparent',
              }}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Comment input */}
      <div className="px-3 py-2">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Escribe tu comentario..."
          className="w-full h-20 px-3 py-2 text-sm rounded-lg resize-none focus:outline-none focus:ring-2"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
          }}
          autoFocus
        />
      </div>

      {/* Actions */}
      <div
        className="px-3 py-3 border-t space-y-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {/* Apply Pattern button - only show if annotation has linked knowledge entry */}
        {existingAnnotation?.knowledgeEntryId && (
          <button
            onClick={handleApplyPattern}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200"
            style={{
              background: 'var(--gradient-primary)',
              color: '#0a0e14',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Zap className="h-4 w-4" />
            Aplicar Patrón
          </button>
        )}

        {/* Main action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!comment.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold btn-primary disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            Guardar
          </button>
        </div>

        {/* Secondary actions */}
        <div className="flex items-center justify-between">
          {existingAnnotation ? (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-colors hover:bg-[var(--error-subtle)]"
              style={{ color: 'var(--error)' }}
            >
              <Trash2 className="h-3 w-3" />
              Eliminar
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleSaveAsKnowledge}
            disabled={!comment.trim()}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-colors hover:bg-[var(--accent-subtle)] disabled:opacity-40"
            style={{ color: 'var(--text-tertiary)' }}
            title="Guardar como conocimiento para futuros análisis"
          >
            <BookOpen className="h-3 w-3" />
            <span>Guardar a Knowledge</span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
