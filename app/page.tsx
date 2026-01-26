'use client';

import { useAnalysisStore } from '@/store/analysisStore';
import { useComparisonStore } from '@/store/comparisonStore';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { ContextCollapsible } from '@/components/editor/ContextCollapsible';
import { ResultsPanel } from '@/components/results/ResultsPanel';
import { ComparisonPanel } from '@/components/comparison/ComparisonPanel';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { SyncStatus } from '@/components/ui/SyncStatus';
import { AnalysisProgress } from '@/components/ui/AnalysisProgress';
import { useSupabaseInit } from '@/lib/supabase/hooks/useSupabaseInit';
import { useStreamingAnalysis } from '@/lib/hooks/useStreamingAnalysis';
import { Sparkles, AlertCircle, RotateCcw, StopCircle, ArrowLeftRight } from 'lucide-react';

export default function Home() {
  const {
    currentPrompt,
    feedbackItems,
    analysis,
    error,
    reset,
  } = useAnalysisStore();

  const {
    mode,
    setMode,
    isComparing,
  } = useComparisonStore();

  const {
    isStreaming,
    sectionsFound,
    startStreaming,
    cancelStreaming,
  } = useStreamingAnalysis();

  // Initialize Supabase sync
  useSupabaseInit();

  const isCompareMode = mode === 'compare';

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

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Ninjo Prompt Analyzer</h1>
              <p className="text-xs text-gray-500">Mejora tus prompts con IA</p>
            </div>
          </div>

          {/* Project Selector & Sync Status */}
          <div className="flex items-center gap-3">
            <SyncStatus />
            <ProjectSelector />

            {/* Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setMode('analyze')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  !isCompareMode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Analizar</span>
              </button>
              <button
                onClick={() => setMode('compare')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isCompareMode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">Comparar</span>
              </button>
            </div>

            <button
              onClick={reset}
              disabled={isStreaming || isComparing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 p-4">
        <div className="h-full max-w-[1600px] mx-auto">
          {isCompareMode ? (
            /* Comparison Mode */
            <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <ComparisonPanel />
            </div>
          ) : (
            /* Normal Analysis Mode */
            <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column - Editor */}
              <div className="lg:col-span-7 flex flex-col gap-4 min-h-0">
                {/* Editor */}
                <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden min-h-0">
                  <EditorPanel />
                </div>

                {/* Context (Collapsible) */}
                <div className="flex-shrink-0">
                  <ContextCollapsible />
                </div>

                {/* Analyze/Cancel Button */}
                {isStreaming ? (
                  <button
                    onClick={handleCancel}
                    className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold shadow-md hover:shadow-lg"
                  >
                    <StopCircle className="h-5 w-5" />
                    Cancelar Análisis
                  </button>
                ) : (
                  <button
                    onClick={handleAnalyze}
                    disabled={!currentPrompt.trim()}
                    className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-md hover:shadow-lg disabled:hover:shadow-md"
                  >
                    <Sparkles className="h-5 w-5" />
                    Analizar Prompt
                  </button>
                )}

                {/* Error */}
                {error && (
                  <div className="flex-shrink-0 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-800 text-sm">Error</p>
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Results with Progress */}
              <div className="lg:col-span-5 min-h-0 flex flex-col gap-4">
                {/* Progress indicator (compact when showing results) */}
                {isStreaming && (
                  <div className={showResults ? '' : 'flex-1'}>
                    <AnalysisProgress compact={showResults} />
                  </div>
                )}

                {/* Results Panel */}
                {showResults && (
                  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${isStreaming ? 'flex-1' : 'h-full'}`}>
                    <ResultsPanel isStreaming={isStreaming} />
                  </div>
                )}

                {/* Empty state when not analyzing and no results */}
                {!isStreaming && !analysis && (
                  <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                    <div className="text-center p-8">
                      <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Ingresa un prompt y haz clic en &quot;Analizar&quot; para comenzar
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 py-2">
          <p className="text-xs text-gray-500 text-center">
            Powered by Claude Sonnet 4.5
          </p>
        </div>
      </footer>
    </div>
  );
}
