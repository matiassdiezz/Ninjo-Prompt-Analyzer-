'use client';

import { useMemo, forwardRef } from 'react';
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

// Find the actual position of annotation text, handling cases where prompt has changed
function findAnnotationPosition(
  annotation: PromptAnnotation,
  promptText: string
): { startOffset: number; endOffset: number } | null {
  // First, check if the stored offsets still point to the correct text
  const textAtOffset = promptText.substring(annotation.startOffset, annotation.endOffset);
  if (textAtOffset === annotation.selectedText) {
    return { startOffset: annotation.startOffset, endOffset: annotation.endOffset };
  }

  // Text has shifted - search for the selectedText in the prompt
  const searchText = annotation.selectedText;
  const index = promptText.indexOf(searchText);

  if (index !== -1) {
    return { startOffset: index, endOffset: index + searchText.length };
  }

  // If exact match fails, try to find it near the original position (within ~500 chars)
  const searchStart = Math.max(0, annotation.startOffset - 500);
  const searchEnd = Math.min(promptText.length, annotation.endOffset + 500);
  const searchWindow = promptText.substring(searchStart, searchEnd);
  const indexInWindow = searchWindow.indexOf(searchText);

  if (indexInWindow !== -1) {
    const actualStart = searchStart + indexInWindow;
    return { startOffset: actualStart, endOffset: actualStart + searchText.length };
  }

  // Annotation text no longer exists in prompt
  return null;
}

// Convert character offset to line/column position
function offsetToLineCol(
  offset: number,
  lines: string[]
): { line: number; col: number } | null {
  let charCount = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineLength = lines[lineIdx].length + 1; // +1 for newline

    if (charCount + lineLength > offset) {
      return { line: lineIdx, col: offset - charCount };
    }

    charCount += lineLength;
  }

  // Offset is at or after the end
  if (offset <= charCount) {
    return { line: lines.length - 1, col: lines[lines.length - 1].length };
  }

  return null;
}

export const AnnotationMarkers = forwardRef<HTMLDivElement, AnnotationMarkersProps>(
  function AnnotationMarkers({ annotations, promptText, onAnnotationClick }, ref) {
  // Calculate line/column positions for each annotation
  const annotationPositions = useMemo(() => {
    const lines = promptText.split('\n');
    const positions: AnnotationPosition[] = [];

    for (const annotation of annotations) {
      // Find the actual position (handles text shifts)
      const actualPosition = findAnnotationPosition(annotation, promptText);
      if (!actualPosition) continue;

      const startPos = offsetToLineCol(actualPosition.startOffset, lines);
      const endPos = offsetToLineCol(actualPosition.endOffset, lines);

      if (startPos && endPos) {
        positions.push({
          annotation,
          startLine: startPos.line,
          endLine: endPos.line,
          startCol: startPos.col,
          endCol: endPos.col,
        });
      }
    }

    return positions;
  }, [annotations, promptText]);

  if (annotationPositions.length === 0) return null;

  const lineHeight = 20;
  const charWidth = 8.4; // Approximate width of monospace char at 14px
  const paddingLeft = 16; // px-4 = 16px
  const paddingTop = 12; // py-3 = 12px

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none overflow-hidden">
      {annotationPositions.map((pos) => {
        const colors = getAnnotationColor(pos.annotation.type);
        const isSingleLine = pos.startLine === pos.endLine;
        // Calculate top position including padding offset
        const topOffset = paddingTop + (pos.startLine * lineHeight);

        return (
          <div key={pos.annotation.id}>
            {/* Highlight rectangles */}
            {isSingleLine ? (
              // Single line highlight
              <div
                className="absolute pointer-events-auto cursor-pointer transition-all hover:opacity-80"
                style={{
                  top: `${topOffset}px`,
                  left: `${paddingLeft + pos.startCol * charWidth}px`,
                  width: `${Math.max(20, (pos.endCol - pos.startCol) * charWidth)}px`,
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
                    top: `${topOffset}px`,
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
                      top: `${paddingTop + (pos.startLine + i + 1) * lineHeight}px`,
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
                    top: `${paddingTop + pos.endLine * lineHeight}px`,
                    left: `${paddingLeft}px`,
                    width: `${Math.max(20, pos.endCol * charWidth)}px`,
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

            {/* Annotation indicator icon (right margin) */}
            <div
              className="absolute pointer-events-auto cursor-pointer flex items-center justify-center w-5 h-5 rounded-full transition-transform hover:scale-110"
              style={{
                top: `${topOffset + 2}px`,
                right: '8px',
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
});

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
