'use client';

import { useMemo } from 'react';
import type { PromptAnnotation } from '@/types/prompt';
import { MessageSquare, Lightbulb, AlertTriangle, HelpCircle } from 'lucide-react';

interface AnnotationMarkersProps {
  annotations: PromptAnnotation[];
  promptText: string;
  onAnnotationClick: (annotation: PromptAnnotation, position: { x: number; y: number }) => void;
}

function getAnnotationColor(type: PromptAnnotation['type']) {
  switch (type) {
    case 'note':
      return { bg: 'rgba(88, 166, 255, 0.15)', border: 'rgba(88, 166, 255, 0.4)' };
    case 'improvement':
      return { bg: 'rgba(63, 185, 80, 0.15)', border: 'rgba(63, 185, 80, 0.4)' };
    case 'warning':
      return { bg: 'rgba(240, 180, 41, 0.15)', border: 'rgba(240, 180, 41, 0.4)' };
    case 'question':
      return { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)' };
    default:
      return { bg: 'rgba(88, 166, 255, 0.15)', border: 'rgba(88, 166, 255, 0.4)' };
  }
}

function getAnnotationIcon(type: PromptAnnotation['type']) {
  switch (type) {
    case 'note':
      return <MessageSquare className="h-3 w-3" style={{ color: 'var(--info)' }} />;
    case 'improvement':
      return <Lightbulb className="h-3 w-3" style={{ color: 'var(--success)' }} />;
    case 'warning':
      return <AlertTriangle className="h-3 w-3" style={{ color: 'var(--warning)' }} />;
    case 'question':
      return <HelpCircle className="h-3 w-3" style={{ color: '#a855f7' }} />;
    default:
      return <MessageSquare className="h-3 w-3" style={{ color: 'var(--info)' }} />;
  }
}

interface AnnotationPosition {
  annotation: PromptAnnotation;
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number;
}

export function AnnotationMarkers({ annotations, promptText, onAnnotationClick }: AnnotationMarkersProps) {
  // Calculate line/column positions for each annotation
  const annotationPositions = useMemo(() => {
    const lines = promptText.split('\n');
    const positions: AnnotationPosition[] = [];

    for (const annotation of annotations) {
      let charCount = 0;
      let startLine = 0;
      let startCol = 0;
      let endLine = 0;
      let endCol = 0;
      let foundStart = false;
      let foundEnd = false;

      for (let lineIdx = 0; lineIdx < lines.length && !foundEnd; lineIdx++) {
        const lineLength = lines[lineIdx].length + 1; // +1 for newline

        if (!foundStart && charCount + lineLength > annotation.startOffset) {
          startLine = lineIdx;
          startCol = annotation.startOffset - charCount;
          foundStart = true;
        }

        if (foundStart && charCount + lineLength >= annotation.endOffset) {
          endLine = lineIdx;
          endCol = annotation.endOffset - charCount;
          foundEnd = true;
        }

        charCount += lineLength;
      }

      if (foundStart && foundEnd) {
        positions.push({
          annotation,
          startLine,
          endLine,
          startCol,
          endCol,
        });
      }
    }

    return positions;
  }, [annotations, promptText]);

  if (annotationPositions.length === 0) return null;

  const lineHeight = 20;
  const charWidth = 8.4; // Approximate width of monospace char at 14px
  const paddingLeft = 16; // px-4 = 16px

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden py-3">
      {annotationPositions.map((pos) => {
        const colors = getAnnotationColor(pos.annotation.type);
        const isSingleLine = pos.startLine === pos.endLine;

        return (
          <div key={pos.annotation.id}>
            {/* Highlight rectangles */}
            {isSingleLine ? (
              // Single line highlight
              <div
                className="absolute pointer-events-auto cursor-pointer transition-all hover:opacity-80"
                style={{
                  top: `${pos.startLine * lineHeight}px`,
                  left: `${paddingLeft + pos.startCol * charWidth}px`,
                  width: `${(pos.endCol - pos.startCol) * charWidth}px`,
                  height: `${lineHeight}px`,
                  background: colors.bg,
                  borderBottom: `2px solid ${colors.border}`,
                  borderRadius: '2px',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAnnotationClick(pos.annotation, { x: e.clientX, y: e.clientY });
                }}
                title={pos.annotation.comment}
              />
            ) : (
              // Multi-line highlight
              <>
                {/* First line - from start col to end of line */}
                <div
                  className="absolute pointer-events-auto cursor-pointer"
                  style={{
                    top: `${pos.startLine * lineHeight}px`,
                    left: `${paddingLeft + pos.startCol * charWidth}px`,
                    right: '16px',
                    height: `${lineHeight}px`,
                    background: colors.bg,
                    borderBottom: `2px solid ${colors.border}`,
                    borderRadius: '2px 0 0 2px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnnotationClick(pos.annotation, { x: e.clientX, y: e.clientY });
                  }}
                />
                {/* Middle lines - full width */}
                {Array.from({ length: pos.endLine - pos.startLine - 1 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute pointer-events-auto cursor-pointer"
                    style={{
                      top: `${(pos.startLine + i + 1) * lineHeight}px`,
                      left: `${paddingLeft}px`,
                      right: '16px',
                      height: `${lineHeight}px`,
                      background: colors.bg,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnnotationClick(pos.annotation, { x: e.clientX, y: e.clientY });
                    }}
                  />
                ))}
                {/* Last line - from start to end col */}
                <div
                  className="absolute pointer-events-auto cursor-pointer"
                  style={{
                    top: `${pos.endLine * lineHeight}px`,
                    left: `${paddingLeft}px`,
                    width: `${pos.endCol * charWidth}px`,
                    height: `${lineHeight}px`,
                    background: colors.bg,
                    borderBottom: `2px solid ${colors.border}`,
                    borderRadius: '0 0 2px 2px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnnotationClick(pos.annotation, { x: e.clientX, y: e.clientY });
                  }}
                />
              </>
            )}

            {/* Annotation indicator icon (at the end of the highlight) */}
            <div
              className="absolute pointer-events-auto cursor-pointer flex items-center justify-center w-4 h-4 rounded-full transition-transform hover:scale-110"
              style={{
                top: `${pos.startLine * lineHeight + 2}px`,
                left: `${paddingLeft + (isSingleLine ? pos.endCol : 100) * charWidth + 4}px`,
                background: colors.border,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onAnnotationClick(pos.annotation, { x: e.clientX, y: e.clientY });
              }}
              title={pos.annotation.comment}
            >
              {getAnnotationIcon(pos.annotation.type)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Mini sidebar showing all annotations in the document
interface AnnotationsSidebarProps {
  annotations: PromptAnnotation[];
  onAnnotationClick: (annotation: PromptAnnotation) => void;
}

export function AnnotationsSidebar({ annotations, onAnnotationClick }: AnnotationsSidebarProps) {
  if (annotations.length === 0) return null;

  return (
    <div
      className="absolute right-2 top-2 w-6 flex flex-col gap-1 z-10"
      style={{ maxHeight: 'calc(100% - 16px)' }}
    >
      {annotations.map((annotation) => {
        const colors = getAnnotationColor(annotation.type);
        return (
          <button
            key={annotation.id}
            onClick={() => onAnnotationClick(annotation)}
            className="w-6 h-6 rounded flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
            title={annotation.comment}
          >
            {getAnnotationIcon(annotation.type)}
          </button>
        );
      })}
    </div>
  );
}
