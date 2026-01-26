'use client';

import { useState } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useOptimization } from '@/lib/hooks/useOptimization';
import { RedundancyPanel } from './RedundancyPanel';
import { CompressionCard } from './CompressionCard';
import { TokenUsageDisplay } from '@/components/analysis/TokenUsageDisplay';
import { formatTokens } from '@/types/tokens';
import {
  Zap,
  Loader2,
  AlertCircle,
  Copy,
  CheckCircle,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

type OptimizationTab = 'redundancy' | 'compression';

export function OptimizationPanel() {
  const { currentPrompt, setPrompt } = useAnalysisStore();
  const [activeTab, setActiveTab] = useState<OptimizationTab>('redundancy');

  const {
    isOptimizing,
    result,
    tokenUsage,
    compressionStates,
    error,
    optimize,
    applySuggestion,
    rejectSuggestion,
    reset,
  } = useOptimization();

  const handleOptimize = () => {
    optimize(currentPrompt);
  };

  const handleApplySuggestion = (suggestionId: string) => {
    const suggestion = result?.suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) return;

    // Apply the compression to the prompt
    const before = currentPrompt.substring(0, suggestion.startIndex);
    const after = currentPrompt.substring(suggestion.endIndex);
    const newPrompt = before + suggestion.compressedText + after;

    setPrompt(newPrompt);
    applySuggestion(suggestionId);
  };

  const handleApplyAll = () => {
    if (!result) return;

    // Apply all pending suggestions (in reverse order to maintain indices)
    const pendingSuggestions = result.suggestions
      .filter((s) => compressionStates[s.id]?.status === 'pending')
      .sort((a, b) => b.startIndex - a.startIndex);

    let newPrompt = currentPrompt;
    for (const suggestion of pendingSuggestions) {
      const before = newPrompt.substring(0, suggestion.startIndex);
      const after = newPrompt.substring(suggestion.endIndex);
      newPrompt = before + suggestion.compressedText + after;
      applySuggestion(suggestion.id);
    }

    setPrompt(newPrompt);
  };

  const pendingCount = result?.suggestions.filter(
    (s) => compressionStates[s.id]?.status === 'pending'
  ).length || 0;

  const appliedCount = result?.suggestions.filter(
    (s) => compressionStates[s.id]?.status === 'applied'
  ).length || 0;

  const tabs: { id: OptimizationTab; label: string }[] = [
    { id: 'redundancy', label: 'Redundancias' },
    { id: 'compression', label: 'Compresión' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Header */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'redundancy' && <RedundancyPanel />}

        {activeTab === 'compression' && (
          <div className="p-4 space-y-4">
            {/* Token Usage Display */}
            <TokenUsageDisplay />

            {/* Optimize Button */}
            {!result && (
              <button
                onClick={handleOptimize}
                disabled={isOptimizing || !currentPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Obtener Sugerencias de Compresión
                  </>
                )}
              </button>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Results Summary */}
            {result && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Sugerencias de Compresión
                  </h3>
                  <button
                    onClick={reset}
                    className="text-xs text-purple-600 hover:text-purple-800"
                  >
                    Reiniciar
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatTokens(result.originalTokenCount)}
                    </p>
                    <p className="text-xs text-purple-600">Original</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      -{formatTokens(result.totalPotentialSavings)}
                    </p>
                    <p className="text-xs text-green-600">Ahorro potencial</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatTokens(result.optimizedTokenCount)}
                    </p>
                    <p className="text-xs text-purple-600">Optimizado</p>
                  </div>
                </div>

                {pendingCount > 0 && (
                  <button
                    onClick={handleApplyAll}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aplicar todas ({pendingCount})
                  </button>
                )}

                {appliedCount > 0 && pendingCount === 0 && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Todas las sugerencias aplicadas</span>
                  </div>
                )}
              </div>
            )}

            {/* Suggestion Cards */}
            {result && result.suggestions.length > 0 && (
              <div className="space-y-3">
                {result.suggestions.map((suggestion) => (
                  <CompressionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    status={compressionStates[suggestion.id]?.status || 'pending'}
                    onApply={() => handleApplySuggestion(suggestion.id)}
                    onReject={() => rejectSuggestion(suggestion.id)}
                  />
                ))}
              </div>
            )}

            {result && result.suggestions.length === 0 && (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-gray-600">
                  No se encontraron oportunidades de compresión significativas.
                </p>
              </div>
            )}

            {/* Empty State */}
            {!result && !isOptimizing && !currentPrompt.trim() && (
              <div className="text-center py-6">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">
                  Ingresa un prompt para obtener sugerencias de compresión.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
