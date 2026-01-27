'use client';

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { parseSemanticSections, type SemanticSection } from '@/lib/semanticParser';
import { enrichSectionsWithSuggestions } from '@/lib/suggestionMapper';
import { estimateTokens } from '@/lib/hooks/useTokenEstimation';
import { SectionsSidebar } from '@/components/workspace/SectionItem';
import { SaveVersionButton, VersionIndicator } from './SaveVersionButton';
import { AnnotationPopover } from './AnnotationPopover';
import { AnnotationMarkers, AnnotationsSidebar } from './AnnotationMarkers';
import type { PromptAnnotation } from '@/types/prompt';
import { List, ChevronLeft, Coins, FileCode, MessageSquarePlus } from 'lucide-react';

interface EditorPanelProps {
  onSectionSelect?: (section: SemanticSection | null) => void;
}

export function EditorPanel({ onSectionSelect }: EditorPanelProps) {
  const {
    currentPrompt,
    setPrompt,
    analysis,
    selectedSectionId,
    setSelectedSectionId,
    annotations,
  } = useAnalysisStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [highlightedLines, setHighlightedLines] = useState<{ start: number; end: number } | null>(null);

  // Annotation state
  const [showAnnotationPopover, setShowAnnotationPopover] = useState(false);
  const [annotationPopoverPosition, setAnnotationPopoverPosition] = useState({ x: 0, y: 0 });
  const [selectedTextRange, setSelectedTextRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<PromptAnnotation | undefined>(undefined);

  const lines = currentPrompt.split('\n');
  const lineCount = lines.length;
  const estimatedTokenCount = useMemo(() => estimateTokens(currentPrompt), [currentPrompt]);

  // Parse semantic sections
  const rawSections = useMemo(() => {
    return parseSemanticSections(currentPrompt);
  }, [currentPrompt]);

  // Enrich sections with suggestion counts
  const sections = useMemo(() => {
    if (!analysis?.sections) return rawSections;
    return enrichSectionsWithSuggestions(rawSections, analysis.sections).map(s => s.section);
  }, [rawSections, analysis?.sections]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleSectionClick = (section: SemanticSection) => {
    // Toggle selection if clicking the same section
    const newSelectedId = selectedSectionId === section.id ? null : section.id;
    setSelectedSectionId(newSelectedId);

    // Highlight the section
    setHighlightedLines({ start: section.startLine, end: section.endLine });

    // Scroll to section
    if (textareaRef.current) {
      const lineHeight = 20;
      const targetScroll = (section.startLine - 1) * lineHeight;
      textareaRef.current.scrollTop = targetScroll;

      let charIndex = 0;
      for (let i = 0; i < section.startLine - 1 && i < lines.length; i++) {
        charIndex += lines[i].length + 1;
      }
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charIndex, charIndex);
    }

    // Notify parent
    if (onSectionSelect) {
      onSectionSelect(newSelectedId ? section : null);
    }
  };

  // Clear highlight after delay
  useEffect(() => {
    if (highlightedLines) {
      const timer = setTimeout(() => setHighlightedLines(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedLines]);

  // Handle text selection for annotations
  const handleTextSelection = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end && end - start >= 3) {
      const selectedText = currentPrompt.substring(start, end);
      setSelectedTextRange({ start, end, text: selectedText });
    } else {
      setSelectedTextRange(null);
    }
  }, [currentPrompt]);

  // Show annotation popover for selected text
  const handleAddAnnotation = useCallback(() => {
    if (!selectedTextRange || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();

    // Calculate position based on selection
    const textBeforeSelection = currentPrompt.substring(0, selectedTextRange.start);
    const linesBeforeSelection = textBeforeSelection.split('\n');
    const lineNumber = linesBeforeSelection.length;
    const lineHeight = 20;

    setAnnotationPopoverPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + (lineNumber * lineHeight) + 40,
    });
    setEditingAnnotation(undefined);
    setShowAnnotationPopover(true);
  }, [selectedTextRange, currentPrompt]);

  // Handle clicking on existing annotation
  const handleAnnotationClick = useCallback((annotation: PromptAnnotation, position: { x: number; y: number }) => {
    setSelectedTextRange({
      start: annotation.startOffset,
      end: annotation.endOffset,
      text: annotation.selectedText,
    });
    setAnnotationPopoverPosition(position);
    setEditingAnnotation(annotation);
    setShowAnnotationPopover(true);
  }, []);

  // Close annotation popover
  const handleCloseAnnotationPopover = useCallback(() => {
    setShowAnnotationPopover(false);
    setSelectedTextRange(null);
    setEditingAnnotation(undefined);
  }, []);

  // Keyboard shortcut for adding annotation (Cmd/Ctrl + M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        if (selectedTextRange && !showAnnotationPopover) {
          handleAddAnnotation();
        }
      }
      // Close popover on Escape
      if (e.key === 'Escape' && showAnnotationPopover) {
        handleCloseAnnotationPopover();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTextRange, showAnnotationPopover, handleAddAnnotation, handleCloseAnnotationPopover]);

  // Find the currently selected section object
  const selectedSection = useMemo(() => {
    if (!selectedSectionId) return null;
    return sections.find(s => s.id === selectedSectionId) || null;
  }, [sections, selectedSectionId]);

  // Notify parent when selection changes
  useEffect(() => {
    if (onSectionSelect) {
      onSectionSelect(selectedSection);
    }
  }, [selectedSection, onSectionSelect]);

  const isLineHighlighted = (lineNum: number) => {
    if (!highlightedLines) return false;
    return lineNum >= highlightedLines.start && lineNum <= highlightedLines.end;
  };

  const lineNumbers = Array.from({ length: Math.max(lineCount, 20) }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Editor Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg btn-ghost transition-all duration-200"
            title={sidebarOpen ? 'Ocultar secciones' : 'Mostrar secciones'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Prompt Workspace
            </span>
          </div>
          {sections.length > 0 && (
            <span className="badge badge-accent">
              {sections.length} secciones
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span>{lineCount} líneas</span>
            <span style={{ color: 'var(--border-default)' }}>|</span>
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" style={{ color: 'var(--accent-primary)' }} />
              <span>~{estimatedTokenCount.toLocaleString()} tokens</span>
            </div>
            {annotations.length > 0 && (
              <>
                <span style={{ color: 'var(--border-default)' }}>|</span>
                <span>{annotations.length} notas</span>
              </>
            )}
          </div>
          {/* Add annotation button - visible when text is selected */}
          {selectedTextRange && (
            <button
              onClick={handleAddAnnotation}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium btn-primary animate-fadeIn"
              title="Agregar comentario (Cmd/Ctrl + M)"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Comentar
            </button>
          )}
          <div className="h-4 w-px" style={{ background: 'var(--border-default)' }} />
          <VersionIndicator />
          <SaveVersionButton />
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sections Sidebar */}
        <SectionsSidebar
          sections={sections}
          selectedSectionId={selectedSectionId}
          onSectionClick={handleSectionClick}
          isOpen={sidebarOpen}
        />

        {/* Code Editor */}
        <div className="flex flex-1 min-w-0">
          {/* Line Numbers */}
          <div
            ref={lineNumbersRef}
            className="border-r text-right py-3 px-2 select-none overflow-hidden flex-shrink-0"
            style={{
              width: '48px',
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            {lineNumbers.map((num) => (
              <div
                key={num}
                className={`leading-5 text-xs font-mono transition-all duration-200 ${
                  isLineHighlighted(num)
                    ? 'font-semibold'
                    : ''
                }`}
                style={{
                  height: '20px',
                  color: isLineHighlighted(num) ? 'var(--accent-primary)' : 'var(--text-muted)',
                  background: isLineHighlighted(num) ? 'var(--accent-subtle)' : 'transparent'
                }}
              >
                {num <= lineCount ? num : ''}
              </div>
            ))}
          </div>

          {/* Textarea */}
          <div ref={editorContainerRef} className="flex-1 relative" style={{ background: 'var(--bg-primary)' }}>
            {/* Highlight Overlay */}
            {highlightedLines && (
              <div
                className="absolute inset-0 pointer-events-none py-3 px-3 overflow-hidden"
                style={{ lineHeight: '20px' }}
              >
                {lines.map((_, index) => {
                  const lineNum = index + 1;
                  return (
                    <div
                      key={index}
                      className={isLineHighlighted(lineNum) ? 'editor-highlight' : ''}
                      style={{ height: '20px' }}
                    />
                  );
                })}
              </div>
            )}

            {/* Annotation Markers Overlay */}
            <AnnotationMarkers
              annotations={annotations}
              promptText={currentPrompt}
              onAnnotationClick={handleAnnotationClick}
            />

            {/* Mini sidebar with annotation icons */}
            <AnnotationsSidebar
              annotations={annotations}
              onAnnotationClick={(annotation) => {
                // Scroll to annotation and show popover
                if (textareaRef.current) {
                  const textBeforeAnnotation = currentPrompt.substring(0, annotation.startOffset);
                  const linesBeforeAnnotation = textBeforeAnnotation.split('\n');
                  const lineNumber = linesBeforeAnnotation.length;
                  const lineHeight = 20;
                  textareaRef.current.scrollTop = Math.max(0, (lineNumber - 3) * lineHeight);
                }
                const rect = editorContainerRef.current?.getBoundingClientRect();
                if (rect) {
                  handleAnnotationClick(annotation, { x: rect.left + rect.width / 2, y: rect.top + 100 });
                }
              }}
            />

            <textarea
              ref={textareaRef}
              value={currentPrompt}
              onChange={(e) => setPrompt(e.target.value)}
              onScroll={handleScroll}
              onSelect={handleTextSelection}
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
              placeholder={`Pega tu prompt aquí...

El sistema detectará automáticamente:
• Tags XML como <instructions>...</instructions>
• Headers Markdown como ## Sección
• Títulos con dos puntos como Instrucciones:
• Bloques de texto separados por líneas vacías

Selecciona texto y haz clic en "Comentar" para agregar notas.`}
              className="absolute inset-0 w-full h-full font-mono text-sm py-3 px-4 resize-none focus:outline-none"
              style={{
                lineHeight: '20px',
                color: 'var(--text-primary)',
                background: 'transparent',
                caretColor: 'var(--accent-primary)'
              }}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Annotation Popover */}
      {showAnnotationPopover && selectedTextRange && (
        <AnnotationPopover
          position={annotationPopoverPosition}
          selectedText={selectedTextRange.text}
          startOffset={selectedTextRange.start}
          endOffset={selectedTextRange.end}
          existingAnnotation={editingAnnotation}
          onClose={handleCloseAnnotationPopover}
        />
      )}
    </div>
  );
}
