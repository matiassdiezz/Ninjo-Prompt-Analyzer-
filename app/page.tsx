'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { ContextCollapsible } from '@/components/editor/ContextCollapsible';
import { ResultsPanel } from '@/components/results/ResultsPanel';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { ProjectsDashboard } from '@/components/projects/ProjectsDashboard';
import { SyncStatus } from '@/components/ui/SyncStatus';
import { AnalysisProgress } from '@/components/ui/AnalysisProgress';
import { ContextualSuggestionsPanel } from '@/components/workspace/ContextualSuggestionsPanel';
import { parseSemanticSections, type SemanticSection } from '@/lib/semanticParser';
import { mapSuggestionsToSections } from '@/lib/suggestionMapper';
import { useSupabaseInit } from '@/lib/supabase/hooks/useSupabaseInit';
import { useStreamingAnalysis } from '@/lib/hooks/useStreamingAnalysis';
import {
  AlertCircle,
  RotateCcw,
  StopCircle,
  PanelRightClose,
  PanelRight,
  Sparkles,
  Zap,
  LayoutGrid,
} from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  const {
    currentPrompt,
    feedbackItems,
    analysis,
    error,
    reset,
    selectedSectionId,
  } = useAnalysisStore();

  const {
    isStreaming,
    sectionsFound,
    startStreaming,
    cancelStreaming,
  } = useStreamingAnalysis();

  // Initialize Supabase sync
  useSupabaseInit();

  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(true);
  const [selectedSection, setSelectedSection] = useState<SemanticSection | null>(null);
  const [showProjectsDashboard, setShowProjectsDashboard] = useState(false);

  // Parse sections and map suggestions
  const semanticSections = useMemo(() => {
    return parseSemanticSections(currentPrompt);
  }, [currentPrompt]);

  const suggestionsBySection = useMemo(() => {
    if (!analysis?.sections) return new Map();
    return mapSuggestionsToSections(analysis.sections, semanticSections);
  }, [analysis?.sections, semanticSections]);

  // Get suggestions for the selected section
  const sectionSuggestions = useMemo(() => {
    if (!selectedSectionId || !analysis?.sections) return [];
    return suggestionsBySection.get(selectedSectionId) || [];
  }, [selectedSectionId, analysis?.sections, suggestionsBySection]);

  const handleSectionSelect = useCallback((section: SemanticSection | null) => {
    setSelectedSection(section);
  }, []);

  const handleAnalyze = async () => {
    if (!currentPrompt.trim()) {
      return;
    }
    await startStreaming(currentPrompt, feedbackItems);
  };

  const handleCancel = () => {
    cancelStreaming();
  };

  // Show results panel if we have analysis OR if we're streaming with sections found
  const showResults = !!analysis || (isStreaming && sectionsFound > 0);
  const hasSuggestions = analysis && analysis.sections.length > 0;

  return (
    <div className="h-screen flex flex-col noise-overlay" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="flex-shrink-0 glass border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 relative">
              <Image
                src="/images/logo_from_svg_transparent_4x.png"
                alt="Ninjo Logo"
                fill
                className="object-contain drop-shadow-lg"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Ninjo
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Prompt Analyzer
              </p>
            </div>
          </div>

          {/* Project Selector & Sync Status */}
          <div className="flex items-center gap-3">
            <SyncStatus />

            {/* Projects Dashboard Button */}
            <button
              onClick={() => setShowProjectsDashboard(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg btn-ghost transition-all duration-200"
              title="Ver todos los proyectos"
            >
              <LayoutGrid className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
              <span className="text-sm hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>Proyectos</span>
            </button>

            <ProjectSelector />

            {/* Toggle suggestions panel */}
            <button
              onClick={() => setShowSuggestionsPanel(!showSuggestionsPanel)}
              className="p-2.5 rounded-lg btn-ghost transition-all duration-200"
              title={showSuggestionsPanel ? 'Ocultar sugerencias' : 'Mostrar sugerencias'}
            >
              {showSuggestionsPanel ? (
                <PanelRightClose className="h-5 w-5" />
              ) : (
                <PanelRight className="h-5 w-5" />
              )}
            </button>

            <button
              onClick={reset}
              disabled={isStreaming}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg btn-ghost disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        {showProjectsDashboard ? (
          <ProjectsDashboard
            onClose={() => setShowProjectsDashboard(false)}
            onSelectProject={() => setShowProjectsDashboard(false)}
          />
        ) : (
        <div className="h-full p-4">
        <div className="h-full max-w-[1800px] mx-auto">
          {/* Workspace Layout */}
          <div className="h-full flex gap-4">
            {/* Left Column - Editor with integrated sections sidebar */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              {/* Editor */}
              <div className="flex-1 card overflow-hidden min-h-0 glow-border animate-fadeIn">
                <EditorPanel onSectionSelect={handleSectionSelect} />
              </div>

              {/* Context (Collapsible) */}
              <div className="flex-shrink-0 animate-slideUp" style={{ animationDelay: '0.1s' }}>
                <ContextCollapsible />
              </div>

              {/* Analyze/Cancel Button */}
              {isStreaming ? (
                <button
                  onClick={handleCancel}
                  className="flex-shrink-0 flex items-center justify-center gap-3 px-8 py-4 btn-danger rounded-xl font-semibold text-base transition-all duration-200 animate-slideUp"
                  style={{ animationDelay: '0.15s' }}
                >
                  <StopCircle className="h-5 w-5" />
                  Cancelar Análisis
                </button>
              ) : (
                <button
                  onClick={handleAnalyze}
                  disabled={!currentPrompt.trim()}
                  className="flex-shrink-0 flex items-center justify-center gap-3 px-8 py-4 btn-primary rounded-xl font-semibold text-base transition-all duration-200 animate-slideUp"
                  style={{ animationDelay: '0.15s' }}
                >
                  <Zap className="h-5 w-5" />
                  Analizar Prompt
                </button>
              )}

              {/* Error */}
              {error && (
                <div
                  className="flex-shrink-0 rounded-xl p-4 flex items-start gap-3 animate-slideUp"
                  style={{
                    background: 'var(--error-subtle)',
                    border: '1px solid rgba(248, 81, 73, 0.2)'
                  }}
                >
                  <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--error)' }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--error)' }}>Error</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Suggestions Panel + Results Tabs */}
            {showSuggestionsPanel && (
              <div className="w-[380px] flex-shrink-0 flex flex-col gap-4 min-h-0">
                {/* Progress indicator (when streaming) */}
                {isStreaming && (
                  <div className={`animate-fadeIn ${showResults ? '' : 'flex-1'}`}>
                    <AnalysisProgress compact={showResults} />
                  </div>
                )}

                {/* Contextual Suggestions Panel */}
                {hasSuggestions && (
                  <div
                    className="h-[50%] min-h-[200px] card overflow-hidden animate-slideUp"
                    style={{ animationDelay: '0.05s' }}
                  >
                    <ContextualSuggestionsPanel
                      selectedSection={selectedSection}
                      suggestions={sectionSuggestions}
                      allSuggestions={analysis?.sections || []}
                    />
                  </div>
                )}

                {/* Results Panel (existing tabs) */}
                {showResults ? (
                  <div
                    className={`card overflow-hidden animate-slideUp ${hasSuggestions ? 'flex-1' : 'h-full'}`}
                    style={{ animationDelay: '0.1s' }}
                  >
                    <ResultsPanel isStreaming={isStreaming} />
                  </div>
                ) : !isStreaming && (
                  <div
                    className="h-full card flex items-center justify-center animate-fadeIn"
                  >
                    <div className="text-center p-8">
                      <div
                        className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                        style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }}
                      >
                        <Sparkles className="h-8 w-8" style={{ color: 'var(--accent-primary)' }} />
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Ingresa un prompt y haz clic en <span style={{ color: 'var(--accent-primary)' }}>Analizar</span> para comenzar
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="flex-shrink-0 border-t"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="max-w-[1800px] mx-auto px-6 py-2.5">
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Powered by <span style={{ color: 'var(--accent-primary)' }}>Claude Sonnet 4.5</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
