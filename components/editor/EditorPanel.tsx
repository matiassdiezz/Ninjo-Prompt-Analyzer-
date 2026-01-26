'use client';

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { parsePromptSections, type ParsedSection } from '@/lib/promptParser';
import { estimateTokens } from '@/lib/hooks/useTokenEstimation';
import { List, Code, ChevronLeft, Coins } from 'lucide-react';

export function EditorPanel() {
  const { currentPrompt, setPrompt } = useAnalysisStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [highlightedLines, setHighlightedLines] = useState<{ start: number; end: number } | null>(null);

  const lines = currentPrompt.split('\n');
  const lineCount = lines.length;
  const estimatedTokenCount = useMemo(() => estimateTokens(currentPrompt), [currentPrompt]);

  const sections = useMemo(() => {
    return parsePromptSections(currentPrompt);
  }, [currentPrompt]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleSectionClick = (section: ParsedSection) => {
    setHighlightedLines({ start: section.startLine, end: section.endLine });

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
  };

  // Clear highlight after delay
  useEffect(() => {
    if (highlightedLines) {
      const timer = setTimeout(() => setHighlightedLines(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedLines]);

  const isLineHighlighted = (lineNum: number) => {
    if (!highlightedLines) return false;
    return lineNum >= highlightedLines.start && lineNum <= highlightedLines.end;
  };

  const lineNumbers = Array.from({ length: Math.max(lineCount, 20) }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title={sidebarOpen ? 'Ocultar secciones' : 'Mostrar secciones'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            ) : (
              <List className="h-4 w-4 text-gray-600" />
            )}
          </button>
          <span className="text-sm font-medium text-gray-700">
            Prompt Editor
          </span>
          {sections.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {sections.length} secciones
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>{lineCount} líneas</span>
          <span className="text-gray-300">·</span>
          <span>{currentPrompt.length} caracteres</span>
          <span className="text-gray-300">·</span>
          <Coins className="h-3 w-3 text-gray-400" />
          <span>~{estimatedTokenCount} tokens</span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sections Sidebar */}
        {sidebarOpen && (
          <div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0">
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Secciones
              </h3>
              {sections.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  {currentPrompt.trim()
                    ? 'No se detectaron secciones XML'
                    : 'Pega tu prompt...'}
                </p>
              ) : (
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section)}
                      className={`
                        w-full text-left px-2 py-1.5 rounded text-xs transition-colors
                        ${highlightedLines?.start === section.startLine
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'hover:bg-gray-200 text-gray-700'
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5">
                        <Code className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        <span className="truncate">&lt;{section.tagName}&gt;</span>
                      </div>
                      <span className="text-gray-400 ml-4.5 text-[10px]">
                        L{section.startLine}
                      </span>
                    </button>
                  ))}
                </nav>
              )}
            </div>
          </div>
        )}

        {/* Code Editor */}
        <div className="flex flex-1 min-w-0">
          {/* Line Numbers */}
          <div
            ref={lineNumbersRef}
            className="bg-gray-100 border-r border-gray-200 text-right py-3 px-2 select-none overflow-hidden flex-shrink-0"
            style={{ width: '40px' }}
          >
            {lineNumbers.map((num) => (
              <div
                key={num}
                className={`
                  leading-5 text-xs font-mono transition-colors
                  ${isLineHighlighted(num)
                    ? 'text-yellow-700 bg-yellow-200 font-bold'
                    : 'text-gray-400'
                  }
                `}
                style={{ height: '20px' }}
              >
                {num <= lineCount ? num : ''}
              </div>
            ))}
          </div>

          {/* Textarea */}
          <div className="flex-1 relative">
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
                      className={isLineHighlighted(lineNum) ? 'bg-yellow-100' : ''}
                      style={{ height: '20px' }}
                    />
                  );
                })}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={currentPrompt}
              onChange={(e) => setPrompt(e.target.value)}
              onScroll={handleScroll}
              placeholder="Pega tu prompt aquí...

Tip: Usa tags XML como <instructions>...</instructions> para organizar las secciones."
              className="absolute inset-0 w-full h-full font-mono text-sm py-3 px-3 resize-none text-gray-900 focus:outline-none bg-transparent"
              style={{ lineHeight: '20px' }}
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
