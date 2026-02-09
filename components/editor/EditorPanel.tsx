'use client';

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { parseSemanticSections, type SemanticSection } from '@/lib/semanticParser';
import { enrichSectionsWithSuggestions } from '@/lib/suggestionMapper';
import { estimateTokens } from '@/lib/hooks/useTokenEstimation';
import { detectAntiPatterns, hasExistingAnnotation } from '@/lib/utils/antiPatternDetector';
import { AnnotationPopover } from './AnnotationPopover';
import { AnnotationMarkers, AnnotationsSidebar } from './AnnotationMarkers';
import { ContextualSuggestions } from './ContextualSuggestions';
import { ApplyLearningModal } from './ApplyLearningModal';
import type { PromptAnnotation } from '@/types/prompt';
import type { KnowledgeEntry } from '@/types/prompt';
import { useToastStore } from '@/store/toastStore';
import {
  FileText,
  Hash,
  Sparkles,
  Save,
  Check,
  Clock,
  ChevronRight,
  MessageSquare,
  Clipboard,
  Code,
  Heading,
  Tag,
  List,
  Terminal,
  Loader2,
  Maximize2,
  Minimize2,
  Copy,
  Search,
} from 'lucide-react';

interface EditorPanelProps {
  onSectionSelect?: (section: SemanticSection | null) => void;
}

// Section type icons
function getSectionIcon(type: string) {
  const iconClass = "h-3.5 w-3.5 flex-shrink-0";
  switch (type) {
    case 'xml_tag':
      return <Code className={iconClass} style={{ color: 'var(--info)' }} />;
    case 'markdown_header':
      return <Heading className={iconClass} style={{ color: '#a855f7' }} />;
    case 'colon_header':
      return <Tag className={iconClass} style={{ color: 'var(--success)' }} />;
    case 'list':
      return <List className={iconClass} style={{ color: '#6366f1' }} />;
    case 'code_block':
      return <Terminal className={iconClass} style={{ color: 'var(--warning)' }} />;
    default:
      return <FileText className={iconClass} style={{ color: 'var(--text-muted)' }} />;
  }
}

export function EditorPanel({ onSectionSelect }: EditorPanelProps) {
  const {
    currentPrompt,
    setPrompt,
    analysis,
    selectedSectionId,
    setSelectedSectionId,
    annotations,
    addAnnotation,
    getAnnotationsInRange,
    pushUndo,
    undo,
    redo,
    createVersion,
    promptHistory,
    hasUnsavedChanges,
    autoSaveEnabled,
    setAutoSaveEnabled,
    saveManualVersion,
  } = useAnalysisStore();
  
  const { getAntiPatterns, incrementUsage, getCurrentProject } = useKnowledgeStore();
  const currentProject = getCurrentProject();
  const { addToast } = useToastStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const annotationOverlayRef = useRef<HTMLDivElement>(null);

  // Undo snapshot tracking: group rapid keystrokes into one undo entry
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPushedUndoRef = useRef(false);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  
  // Contextual suggestions state
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [applyLearningModal, setApplyLearningModal] = useState<{
    learning: KnowledgeEntry;
    section: SemanticSection;
    originalText: string;
    suggestedText: string;
  } | null>(null);

  // Annotation state
  const [showAnnotationPopover, setShowAnnotationPopover] = useState(false);
  const [annotationPopoverPosition, setAnnotationPopoverPosition] = useState({ x: 0, y: 0 });
  const [selectedTextRange, setSelectedTextRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<PromptAnnotation | undefined>(undefined);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [isWrapEnabled, setIsWrapEnabled] = useState(true);
  const [justCopied, setJustCopied] = useState(false);
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [isSectionSearchFocused, setIsSectionSearchFocused] = useState(false);

  const lines = currentPrompt.split('\n');
  const lineCount = lines.length;
  const estimatedTokenCount = useMemo(() => estimateTokens(currentPrompt), [currentPrompt]);
  const hasContent = currentPrompt.trim().length > 0;

  // Parse semantic sections
  const rawSections = useMemo(() => {
    return parseSemanticSections(currentPrompt);
  }, [currentPrompt]);

  // Enrich sections with suggestion counts
  const sections = useMemo(() => {
    if (!analysis?.sections) return rawSections;
    return enrichSectionsWithSuggestions(rawSections, analysis.sections).map(s => s.section);
  }, [rawSections, analysis?.sections]);

  // Format token count
  const formattedTokens = useMemo(() => {
    if (estimatedTokenCount >= 1000) {
      return `${(estimatedTokenCount / 1000).toFixed(1)}k`;
    }
    return estimatedTokenCount.toString();
  }, [estimatedTokenCount]);

  const headerActionButtonClassName =
    'h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap';

  // Push undo snapshot at the start of each typing burst (~1s gap = new burst)
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!hasPushedUndoRef.current) {
      pushUndo();
      hasPushedUndoRef.current = true;
    }

    setPrompt(e.target.value);

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = setTimeout(() => {
      hasPushedUndoRef.current = false;
    }, 1000);
  }, [pushUndo, setPrompt]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
      if (annotationOverlayRef.current) {
        annotationOverlayRef.current.style.transform = `translateY(-${scrollTop}px)`;
      }
      if (showAnnotationPopover) {
        setShowAnnotationPopover(false);
        setSelectedTextRange(null);
        setEditingAnnotation(undefined);
      }
    }
  }, [showAnnotationPopover]);

  const getSectionStartOffset = (section: SemanticSection) => {
    const maybeStartOffset = (section as unknown as { startOffset?: number }).startOffset;
    if (typeof maybeStartOffset === 'number' && Number.isFinite(maybeStartOffset)) return maybeStartOffset;

    // Fallback: compute from line number
    let fallbackOffset = 0;
    for (let lineIndex = 0; lineIndex < section.startLine - 1 && lineIndex < lines.length; lineIndex++) {
      fallbackOffset += lines[lineIndex].length + 1;
    }
    return fallbackOffset;
  };

  const computeScrollTopForOffset = (textarea: HTMLTextAreaElement, offset: number) => {
    const computedStyle = window.getComputedStyle(textarea);

    const mirror = document.createElement('div');
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';
    mirror.style.top = '0';
    mirror.style.left = '0';
    mirror.style.zIndex = '-1';

    mirror.style.boxSizing = computedStyle.boxSizing;
    mirror.style.width = `${textarea.clientWidth}px`;

    mirror.style.fontFamily = computedStyle.fontFamily;
    mirror.style.fontSize = computedStyle.fontSize;
    mirror.style.fontWeight = computedStyle.fontWeight;
    mirror.style.letterSpacing = computedStyle.letterSpacing;
    mirror.style.lineHeight = computedStyle.lineHeight;

    mirror.style.paddingTop = computedStyle.paddingTop;
    mirror.style.paddingRight = computedStyle.paddingRight;
    mirror.style.paddingBottom = computedStyle.paddingBottom;
    mirror.style.paddingLeft = computedStyle.paddingLeft;

    // Wrapping behavior must match textarea wrap mode
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.overflowWrap = 'break-word';
    mirror.style.wordBreak = 'break-word';

    const prefixText = currentPrompt.slice(0, Math.max(0, Math.min(offset, currentPrompt.length)));
    mirror.textContent = prefixText;

    const marker = document.createElement('span');
    marker.textContent = '\u200b';
    mirror.appendChild(marker);

    document.body.appendChild(mirror);

    const mirrorRect = mirror.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const markerTop = markerRect.top - mirrorRect.top;

    document.body.removeChild(mirror);

    const viewportHeight = textarea.clientHeight || 0;
    const desiredScrollTop = Math.max(0, markerTop - viewportHeight / 2);

    return desiredScrollTop;
  };

  const scrollTextareaToOffset = (textarea: HTMLTextAreaElement, offset: number) => {
    const desiredScrollTop = computeScrollTopForOffset(textarea, offset);

    const applyScroll = () => {
      textarea.scrollTop = desiredScrollTop;
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = desiredScrollTop;
      }
    };

    applyScroll();
    requestAnimationFrame(applyScroll);
  };

  const handleSectionClick = (section: SemanticSection) => {
    // Always keep the section selected; clicking again should re-navigate
    setSelectedSectionId(section.id);

    if (textareaRef.current) {
      const textarea = textareaRef.current;

      const startOffset = getSectionStartOffset(section);

      textarea.focus();
      textarea.setSelectionRange(startOffset, startOffset);

      requestAnimationFrame(() => {
        if (isWrapEnabled) {
          scrollTextareaToOffset(textarea, startOffset);
          return;
        }

        // Use real computed metrics so line-based scrolling matches what the user sees
        const computedStyle = window.getComputedStyle(textarea);
        const computedLineHeight = Number.parseFloat(computedStyle.lineHeight || '');
        const computedPaddingTop = Number.parseFloat(computedStyle.paddingTop || '');

        const lineHeight = Number.isFinite(computedLineHeight) ? computedLineHeight : 22;
        const paddingTop = Number.isFinite(computedPaddingTop) ? computedPaddingTop : 0;

        const viewportHeight = textarea.clientHeight || 0;
        const targetLineIndex = Math.max(0, section.startLine - 1);

        // Position so the target line is centered in the viewport
        const centerOffset = Math.max(0, viewportHeight / 2 - lineHeight);
        const desiredScrollTop = Math.max(0, paddingTop + targetLineIndex * lineHeight - centerOffset);

        // Apply twice to neutralize the browser's caret auto-scroll that can happen after focus/selection
        const applyScroll = () => {
          textarea.scrollTop = desiredScrollTop;
          if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = desiredScrollTop;
          }
        };

        applyScroll();
        requestAnimationFrame(applyScroll);
      });
    }

    if (onSectionSelect) {
      onSectionSelect(section);
    }
  };


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
    const textBeforeSelection = currentPrompt.substring(0, selectedTextRange.start);
    const linesBeforeSelection = textBeforeSelection.split('\n');
    const lineNumber = linesBeforeSelection.length;
    const lineHeight = 22;
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + M to add annotation
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        if (selectedTextRange && !showAnnotationPopover) {
          handleAddAnnotation();
        }
      }
      // Escape to close annotation popover
      if (e.key === 'Escape' && showAnnotationPopover) {
        handleCloseAnnotationPopover();
      }
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) {
          setShowSaveModal(true);
        }
      }
      // Cmd/Ctrl + Z to undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Cmd/Ctrl + Shift + Z or Ctrl + Y to redo
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTextRange, showAnnotationPopover, handleAddAnnotation, handleCloseAnnotationPopover, hasUnsavedChanges, undo, redo]);

  // Listen for navigate-to-section events from chat
  useEffect(() => {
    const handleNavigateToSection = (e: CustomEvent<{ section: string }>) => {
      const sectionName = e.detail.section.toLowerCase();
      
      // Find section by title or tag name
      const matchingSection = sections.find(s => {
        const titleMatch = s.title.toLowerCase().includes(sectionName);
        const tagMatch = s.tagName?.toLowerCase() === sectionName;
        return titleMatch || tagMatch;
      });
      
      if (matchingSection) {
        handleSectionClick(matchingSection);
      }
    };
    
    window.addEventListener('navigate-to-section', handleNavigateToSection as EventListener);
    return () => window.removeEventListener('navigate-to-section', handleNavigateToSection as EventListener);
  }, [sections]);

  // Lock body scroll while fullscreen is active
  useEffect(() => {
    if (!isFullscreenEditor) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreenEditor]);

  // Find the currently selected section object
  const selectedSection = useMemo(() => {
    if (!selectedSectionId) return null;
    return sections.find(s => s.id === selectedSectionId) || null;
  }, [sections, selectedSectionId]);

  const sectionsSidebarModel = useMemo(() => {
    const xmlContainerSections = sections
      .filter(section => section.type === 'xml_tag' && Boolean(section.tagName))
      .slice()
      .sort((firstSection, secondSection) => firstSection.startLine - secondSection.startLine);

    const markdownHeaderSections = sections
      .filter(section => section.type === 'markdown_header')
      .slice()
      .sort((firstSection, secondSection) => firstSection.startLine - secondSection.startLine);

    const headersByXmlContainerId = new Map<string, SemanticSection[]>();
    const assignedHeaderIds = new Set<string>();

    for (const headerSection of markdownHeaderSections) {
      const containerSection = xmlContainerSections.find(
        (xmlSection) => headerSection.startLine >= xmlSection.startLine && headerSection.startLine <= xmlSection.endLine,
      );

      if (!containerSection) continue;

      const existing = headersByXmlContainerId.get(containerSection.id) || [];
      existing.push(headerSection);
      headersByXmlContainerId.set(containerSection.id, existing);
      assignedHeaderIds.add(headerSection.id);
    }

    // Keep headers that are NOT inside any XML container as normal top-level items
    const topLevelSections = sections.filter(
      (section) => section.type !== 'markdown_header' || !assignedHeaderIds.has(section.id),
    );

    return { topLevelSections, headersByXmlContainerId };
  }, [sections]);

  const filteredSectionsSidebarModel = useMemo(() => {
    const query = sectionSearchQuery.trim().toLowerCase();
    if (!query) return sectionsSidebarModel;

    const matchesSection = (section: SemanticSection) => {
      const haystack = `${section.title} ${section.tagName ?? ''}`.toLowerCase();
      return haystack.includes(query);
    };

    const headersByXmlContainerId = new Map<string, SemanticSection[]>();
    for (const [containerId, headerSections] of sectionsSidebarModel.headersByXmlContainerId.entries()) {
      const filteredHeaders = headerSections.filter(matchesSection);
      if (filteredHeaders.length > 0) headersByXmlContainerId.set(containerId, filteredHeaders);
    }

    const containerIdsWithHeaders = new Set<string>(Array.from(headersByXmlContainerId.keys()));

    const topLevelMatches = sectionsSidebarModel.topLevelSections.filter((section) => {
      const isXmlContainer = section.type === 'xml_tag' && Boolean(section.tagName);
      if (isXmlContainer) return matchesSection(section) || containerIdsWithHeaders.has(section.id);
      return matchesSection(section);
    });

    topLevelMatches.sort((firstSection, secondSection) => firstSection.startLine - secondSection.startLine);

    return { topLevelSections: topLevelMatches, headersByXmlContainerId };
  }, [sectionsSidebarModel, sectionSearchQuery]);

  // Notify parent when selection changes
  useEffect(() => {
    if (onSectionSelect) {
      onSectionSelect(selectedSection);
    }
  }, [selectedSection, onSectionSelect]);

  // Auto-detect anti-patterns in the prompt
  useEffect(() => {
    if (!currentPrompt || !hasContent) return;
    
    const antiPatterns = getAntiPatterns();
    if (antiPatterns.length === 0) return;
    
    const detected = detectAntiPatterns(currentPrompt, antiPatterns, 0.65);
    
    // Create annotations for detected anti-patterns
    detected.forEach(ap => {
      // Only create if no existing annotation in that range
      const existing = getAnnotationsInRange(ap.startOffset, ap.endOffset);
      const alreadyAnnotated = hasExistingAnnotation(
        ap.startOffset,
        ap.endOffset,
        annotations
      );
      
      if (!alreadyAnnotated && existing.length === 0) {
        addAnnotation({
          startOffset: ap.startOffset,
          endOffset: ap.endOffset,
          selectedText: ap.matchedText,
          comment: `⚠️ Anti-patrón detectado: ${ap.knowledgeEntry.title}`,
          type: 'warning',
          knowledgeEntryId: ap.knowledgeEntryId,
        });
      }
    });
  }, [currentPrompt, hasContent, getAntiPatterns, detectAntiPatterns, addAnnotation, getAnnotationsInRange, annotations]);

  // Handler to apply a learning to the current section
  const handleApplyLearning = useCallback((learning: KnowledgeEntry) => {
    if (!selectedSection || !learning.example) return;
    
    // Get the current text of the section
    const sectionText = currentPrompt.substring(
      selectedSection.startIndex,
      selectedSection.endIndex
    );
    
    // Show confirmation modal with preview
    setApplyLearningModal({
      learning,
      section: selectedSection,
      originalText: sectionText,
      suggestedText: learning.example,
    });
  }, [selectedSection, currentPrompt]);

  // Confirm and apply the learning
  const confirmApplyLearning = useCallback(() => {
    if (!applyLearningModal) return;
    
    const { learning, section, suggestedText } = applyLearningModal;
    
    // Save state for undo
    pushUndo();
    
    // Apply the change
    const before = currentPrompt.substring(0, section.startIndex);
    const after = currentPrompt.substring(section.endIndex);
    const newPrompt = before + suggestedText + after;
    
    setPrompt(newPrompt);
    
    // Increment usage count
    if (currentProject) {
      incrementUsage(learning.id, currentProject.id);
    }
    
    // Create version automatically
    if (autoSaveEnabled) {
      createVersion(
        `Aplicado patrón: ${learning.title}`,
        'suggestion_applied',
        { category: learning.tags[0] || 'general' }
      );
    }
    
    // Close modal
    setApplyLearningModal(null);
  }, [applyLearningModal, currentPrompt, pushUndo, setPrompt, currentProject, incrementUsage, autoSaveEnabled, createVersion]);

  // Handle save
  const handleSave = () => {
    if (!saveLabel.trim()) return;
    setIsSaving(true);
    setTimeout(() => {
      saveManualVersion(saveLabel.trim());
      setSaveLabel('');
      setShowSaveModal(false);
      setIsSaving(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }, 300);
  };

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      setIsPasting(true);
      const text = await navigator.clipboard.readText();
      if (text) {
        setPrompt(text);
        textareaRef.current?.focus();
      }
    } catch {
      addToast('Error al pegar desde portapapeles', 'error');
    } finally {
      setTimeout(() => setIsPasting(false), 500);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!currentPrompt.trim()) return;

    try {
      await navigator.clipboard.writeText(currentPrompt);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      addToast('Error al copiar al portapapeles', 'error');
    }
  };

  const lineNumbers = Array.from({ length: Math.max(lineCount, 30) }, (_, i) => i + 1);

  return (
    <div
      className={
        isFullscreenEditor
          ? 'fixed inset-0 z-50 flex flex-col overflow-hidden'
          : 'flex flex-col h-full overflow-hidden'
      }
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Compact Header */}
      <div
        className="flex-shrink-0 px-4 py-2.5 border-b flex items-center justify-between"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Left: Title + Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }}
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Editor
            </span>
          </div>

          {/* Stats - only show when there's content */}
          {hasContent && (
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <div className="flex items-center gap-1.5">
                <Hash className="h-3 w-3" />
                <span>{lineCount}</span>
              </div>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Sparkles className="h-3 w-3" style={{ color: 'var(--accent-primary)' }} />
                <span style={{ color: 'var(--accent-primary)' }}>{formattedTokens} tk</span>
              </div>
              {annotations.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" />
                  <span>{annotations.length}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Add comment button - only when text selected */}
          {selectedTextRange && (
            <button
              onClick={handleAddAnnotation}
              title="Agregar comentario"
              className={`${headerActionButtonClassName} animate-fadeIn`}
              style={{
                background: 'var(--info-subtle)',
                color: 'var(--info)',
                border: '1px solid rgba(88, 166, 255, 0.2)',
              }}
            >
              <MessageSquare className="h-3 w-3" />
              Comentar
            </button>
          )}

          {/* Version info */}
          {hasContent && (
            <div
              className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs whitespace-nowrap"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <Clock className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{promptHistory.length}v</span>
              {hasUnsavedChanges && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--warning)' }}
                />
              )}
            </div>
          )}

           {/* Save button */}
          {hasContent && (
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={justSaved}
              title={`Guardar version v${promptHistory.length + 1}`}
              className={`${headerActionButtonClassName} font-semibold`}
              style={{
                background: hasUnsavedChanges ? 'var(--gradient-primary)' : 'var(--bg-elevated)',
                color: hasUnsavedChanges ? '#0a0e14' : 'var(--text-secondary)',
                border: hasUnsavedChanges ? 'none' : '1px solid rgba(88, 166, 255, 0.18)',
                boxShadow: hasUnsavedChanges
                  ? 'var(--shadow-glow), 0 0 0 1px rgba(88, 166, 255, 0.18)'
                  : 'none',
              }}
            >
              {justSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Guardado v{promptHistory.length}
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Guardar v{promptHistory.length + 1}
                </>
              )}
            </button>
          )}

          {/* Auto-save toggle */}
{/*           
          {hasContent && (
            <button
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={headerActionButtonClassName}
              style={{
                background: autoSaveEnabled ? 'var(--success-subtle)' : 'var(--bg-elevated)',
                color: autoSaveEnabled ? 'var(--success)' : 'var(--text-muted)',
                border: `1px solid ${autoSaveEnabled ? 'rgba(63, 185, 80, 0.25)' : 'rgba(63, 185, 80, 0.18)'}`,
              }}
              title={autoSaveEnabled ? 'Auto-guardado activo' : 'Auto-guardado inactivo'}
            >
              {autoSaveEnabled ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              Auto
            </button>
          )} */}

          {/* Wrap / No wrap toggle */}
          {hasContent && (
            <button
              onClick={() => setIsWrapEnabled(!isWrapEnabled)}
              className={headerActionButtonClassName}
              style={{
                background: isWrapEnabled ? 'var(--info-subtle)' : 'var(--bg-elevated)',
                color: isWrapEnabled ? 'var(--info)' : 'var(--text-muted)',
                border: `1px solid ${isWrapEnabled ? 'rgba(88, 166, 255, 0.28)' : 'rgba(88, 166, 255, 0.18)'}`,
              }}
              title={isWrapEnabled ? 'Wrap activo' : 'Wrap inactivo'}
            >
              <span className="font-semibold">Wrap</span>
              <span style={{ opacity: 0.9 }}>{isWrapEnabled ? 'On' : 'Off'}</span>
            </button>
          )}

          {/* Suggestions toggle */}
          {hasContent && selectedSection && (
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={headerActionButtonClassName}
              style={{
                background: showSuggestions ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                color: showSuggestions ? 'var(--accent-primary)' : 'var(--text-muted)',
                border: `1px solid ${showSuggestions ? 'var(--border-accent)' : 'rgba(88, 166, 255, 0.18)'}`,
              }}
              title="Sugerencias contextuales"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sugerencias</span>
            </button>
          )}

          {/* Copy button - only show in fullscreen */}
          {hasContent && (
            <button
              onClick={handleCopyToClipboard}
              disabled={justCopied}
              className={headerActionButtonClassName}
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                border: '1px solid rgba(88, 166, 255, 0.18)',
              }}
              title="Copiar prompt"
            >
              {justCopied ? (
                <>
                  <Check className="h-3 w-3" />
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                </>
              )}
            </button>
          )}

         

          {/* Expandir/Minimizar button */}
          {hasContent && !isFullscreenEditor && (
            <button
              onClick={() => setIsFullscreenEditor(true)}
              className={headerActionButtonClassName}
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                border: '1px solid rgba(88, 166, 255, 0.18)',
              }}
              title="Expandir editor"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          )}

          {isFullscreenEditor && (
            <button
              onClick={() => setIsFullscreenEditor(false)}
              className={headerActionButtonClassName}
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                border: '1px solid rgba(88, 166, 255, 0.18)',
              }}
              title="Minimizar editor"
            >
              <Minimize2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sections Panel - Only show when there's content and sections */}
        {hasContent && sections.length > 0 && (
          <div
            className="w-52 border-r overflow-y-auto flex-shrink-0"
            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Estructura
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}
                >
                  {sectionSearchQuery.trim().length > 0 ? filteredSectionsSidebarModel.topLevelSections.length : sections.length}
                </span>
              </div>

              <div className="mb-3">
                <div
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                  onClick={(event) => {
                    const inputElement = event.currentTarget.querySelector('input') as HTMLInputElement | null;
                    inputElement?.focus();
                  }}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: isSectionSearchFocused
                      ? '1px solid var(--border-accent)'
                      : '1px solid var(--border-subtle)',
                    boxShadow: isSectionSearchFocused
                      ? '0 0 0 2px rgba(88, 166, 255, 0.22)'
                      : 'none',
                  }}
                >
                  <Search className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={sectionSearchQuery}
                    onChange={(event) => setSectionSearchQuery(event.target.value)}
                    onFocus={() => setIsSectionSearchFocused(true)}
                    onBlur={() => setIsSectionSearchFocused(false)}
                    placeholder="Buscar seccion..."
                    className="w-full bg-transparent outline-none text-xs"
                    style={{
                      color: 'var(--text-secondary)',
                      boxShadow: 'none',
                    }}
                  />
                  {sectionSearchQuery.trim().length > 0 && (
                    <button
                      onClick={() => setSectionSearchQuery('')}
                      className="text-[10px] px-2 py-0.5 rounded-md"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                      }}
                      title="Limpiar busqueda"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {sectionSearchQuery.trim().length > 0 && filteredSectionsSidebarModel.topLevelSections.length === 0 && (
                  <div
                    className="mt-2 px-3 py-2 rounded-lg text-xs"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    No se encontraron secciones
                  </div>
                )}
              </div>

              <nav className="space-y-0.5">
                {filteredSectionsSidebarModel.topLevelSections.map((section) => {
                  const isSelected = selectedSectionId === section.id;
                  const isXmlContainer = section.type === 'xml_tag' && Boolean(section.tagName);
                  const displayTitle = isXmlContainer && section.tagName ? `<${section.tagName}>` : section.title;

                  const nestedMarkdownHeaders = isXmlContainer
                    ? filteredSectionsSidebarModel.headersByXmlContainerId.get(section.id) || []
                    : [];

                  return (
                    <div key={section.id} className="space-y-0.5">
                      <button
                        onClick={() => handleSectionClick(section)}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all duration-150 group"
                        style={{
                          background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                          border: isSelected ? '1px solid var(--border-accent)' : '1px solid transparent',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {getSectionIcon(section.type)}
                          <span
                            className="truncate flex-1 font-medium"
                            style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                          >
                            {displayTitle}
                          </span>
                          <ChevronRight
                            className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--text-muted)' }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 ml-5">
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            L{section.startLine}
                            {section.endLine !== section.startLine && `–${section.endLine}`}
                          </span>
                        </div>
                      </button>

                      {isXmlContainer && nestedMarkdownHeaders.length > 0 && (
                        <div
                          className="ml-3 pl-2 space-y-0.5"
                          style={{ borderLeft: '1px solid var(--border-subtle)' }}
                        >
                          {nestedMarkdownHeaders.map((headerSection) => {
                            const isHeaderSelected = selectedSectionId === headerSection.id;

                            return (
                              <button
                                key={headerSection.id}
                                onClick={() => handleSectionClick(headerSection)}
                                className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-all duration-150 group"
                                style={{
                                  background: isHeaderSelected ? 'var(--accent-subtle)' : 'transparent',
                                  border: isHeaderSelected ? '1px solid var(--border-accent)' : '1px solid transparent',
                                }}
                                title={headerSection.title}
                              >
                                <div className="flex items-center gap-2">
                                  {getSectionIcon('markdown_header')}
                                  <span
                                    className="truncate flex-1"
                                    style={{
                                      color: isHeaderSelected ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                                    }}
                                  >
                                    {headerSection.title}
                                  </span>
                                  <ChevronRight
                                    className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ color: 'var(--text-muted)' }}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Editor Container */}
        <div className="flex-1 flex min-w-0 relative overflow-hidden">
          <div className="flex-1 flex min-w-0 relative">
          {/* Line Numbers */}
          {hasContent && !isWrapEnabled && (
            <div
              ref={lineNumbersRef}
              className="w-12 border-r text-right py-4 pr-3 select-none overflow-hidden flex-shrink-0"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {lineNumbers.map((num) => (
                <div
                  key={num}
                  className="font-mono text-[11px]"
                  style={{
                    height: '22px',
                    lineHeight: '22px',
                    color: num <= lineCount ? 'var(--text-muted)' : 'transparent',
                  }}
                >
                  {num}
                </div>
              ))}
            </div>
          )}

          {/* Main Editor */}
          <div
            ref={editorContainerRef}
            className="flex-1 relative"
            style={{ background: 'var(--bg-editor)' }}
          >

            {/* Annotation Markers Overlay */}
            {hasContent && !isWrapEnabled && (
              <AnnotationMarkers
                ref={annotationOverlayRef}
                annotations={annotations}
                promptText={currentPrompt}
                onAnnotationClick={handleAnnotationClick}
              />
            )}

            {/* Mini sidebar with annotation icons */}
            {hasContent && !isWrapEnabled && annotations.length > 0 && (
              <AnnotationsSidebar
                annotations={annotations}
                onAnnotationClick={(annotation) => {
                  if (textareaRef.current) {
                    const textarea = textareaRef.current;
                    if (isWrapEnabled) {
                      scrollTextareaToOffset(textarea, annotation.startOffset);
                    } else {
                      const textBeforeAnnotation = currentPrompt.substring(0, annotation.startOffset);
                      const linesBeforeAnnotation = textBeforeAnnotation.split('\n');
                      const lineNumber = linesBeforeAnnotation.length;
                      const lineHeight = 22;
                      textarea.scrollTop = Math.max(0, (lineNumber - 3) * lineHeight);
                    }
                  }
                  const rect = editorContainerRef.current?.getBoundingClientRect();
                  if (rect) {
                    handleAnnotationClick(annotation, { x: rect.left + rect.width / 2, y: rect.top + 100 });
                  }
                }}
              />
            )}

            {/* Empty State */}
            {!hasContent && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <FileText className="h-10 w-10" style={{ color: 'var(--text-muted)' }} />
                </div>

                <h3
                  className="text-lg font-semibold mb-2 text-center"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Pega tu prompt para comenzar
                </h3>
                <p
                  className="text-sm text-center max-w-md mb-6"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  El editor detectará automáticamente las secciones de tu prompt
                  y te ayudará a organizarlo mejor.
                </p>

                <button
                  onClick={handlePasteFromClipboard}
                  disabled={isPasting}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: 'var(--gradient-primary)',
                    color: '#0a0e14',
                    boxShadow: 'var(--shadow-glow)',
                  }}
                >
                  {isPasting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clipboard className="h-4 w-4" />
                  )}
                  {isPasting ? 'Pegando...' : 'Pegar desde portapapeles'}
                </button>

                <p
                  className="text-xs mt-4"
                  style={{ color: 'var(--text-muted)' }}
                >
                  o simplemente usa Cmd/Ctrl + V
                </p>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={currentPrompt}
              onChange={handlePromptChange}
              onScroll={handleScroll}
              onSelect={handleTextSelection}
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
              wrap={isWrapEnabled ? 'soft' : 'off'}
              className={`absolute inset-0 w-full h-full font-mono text-sm resize-none focus:outline-none ${
                hasContent ? 'py-4 px-4' : 'opacity-0'
              }`}
              style={{
                lineHeight: '22px',
                color: 'var(--text-primary)',
                background: 'transparent',
                caretColor: 'var(--accent-primary)',
                pointerEvents: hasContent ? 'auto' : 'none',
                whiteSpace: isWrapEnabled ? 'pre-wrap' : 'pre',
                overflowX: isWrapEnabled ? 'hidden' : 'auto',
                overflowY: 'auto',
                wordBreak: isWrapEnabled ? 'break-word' : 'normal',
              }}
              aria-hidden={!hasContent}
              tabIndex={hasContent ? 0 : -1}
              spellCheck={false}
            />
          </div>
          </div>

          {/* Contextual Suggestions Panel */}
          {hasContent && showSuggestions && selectedSection && (
            <div
              className="w-80 border-l flex-shrink-0 overflow-hidden"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <ContextualSuggestions
                currentSection={selectedSection}
                onApplyLearning={handleApplyLearning}
                onClose={() => setShowSuggestions(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowSaveModal(false)}
          />
          <div
            className="relative rounded-2xl w-full max-w-sm mx-4 overflow-hidden animate-slideUp"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }}
                >
                  <Save className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Guardar versión
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Versión #{promptHistory.length + 1}
                  </p>
                </div>
              </div>

              <input
                type="text"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="Nombre de la versión..."
                className="w-full px-4 py-3 rounded-xl text-sm mb-4"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
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
                  disabled={!saveLabel.trim() || isSaving}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: 'var(--gradient-primary)',
                    color: '#0a0e14',
                  }}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Apply Learning Modal */}
      {applyLearningModal && (
        <ApplyLearningModal
          learning={applyLearningModal.learning}
          section={applyLearningModal.section}
          originalText={applyLearningModal.originalText}
          suggestedText={applyLearningModal.suggestedText}
          onConfirm={confirmApplyLearning}
          onCancel={() => setApplyLearningModal(null)}
        />
      )}
    </div>
  );
}
