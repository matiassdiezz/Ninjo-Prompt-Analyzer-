'use client';

import { useComparisonStore } from '@/store/comparisonStore';
import { usePromptComparison } from '@/lib/hooks/usePromptComparison';
import { ScoreComparisonCard, ScoreSummary } from './ScoreComparisonCard';
import { formatTokens } from '@/types/tokens';
import {
  ArrowLeftRight,
  Loader2,
  AlertCircle,
  BarChart3,
  Coins,
  ArrowDown,
  ArrowUp,
  Sparkles,
} from 'lucide-react';

export function ComparisonPanel() {
  const {
    originalPrompt,
    modifiedPrompt,
    setOriginalPrompt,
    setModifiedPrompt,
    swapPrompts,
  } = useComparisonStore();

  const { compare, canCompare, isComparing, comparisonResult, error } = usePromptComparison();

  return (
    <div className="flex flex-col h-full">
      {/* Editors Side by Side */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 min-h-0">
        {/* Original Prompt */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-t-lg border border-b-0 border-gray-200">
            <span className="text-sm font-medium text-gray-700">Original</span>
            <span className="text-xs text-gray-500">
              {originalPrompt.length} caracteres
            </span>
          </div>
          <textarea
            value={originalPrompt}
            onChange={(e) => setOriginalPrompt(e.target.value)}
            placeholder="Pega el prompt original aquí..."
            className="flex-1 w-full p-3 font-mono text-sm border border-gray-200 rounded-b-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Swap Button */}
        <button
          onClick={swapPrompts}
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 p-2 bg-white border border-gray-200 rounded-full shadow-md hover:bg-gray-50 transition-colors"
          title="Intercambiar prompts"
        >
          <ArrowLeftRight className="h-4 w-4 text-gray-600" />
        </button>

        {/* Modified Prompt */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-t-lg border border-b-0 border-blue-200">
            <span className="text-sm font-medium text-blue-700">Modificado</span>
            <span className="text-xs text-blue-500">
              {modifiedPrompt.length} caracteres
            </span>
          </div>
          <textarea
            value={modifiedPrompt}
            onChange={(e) => setModifiedPrompt(e.target.value)}
            placeholder="Pega el prompt modificado aquí..."
            className="flex-1 w-full p-3 font-mono text-sm border border-blue-200 rounded-b-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Compare Button */}
      <div className="flex-shrink-0 px-4 pb-4">
        <button
          onClick={compare}
          disabled={!canCompare || isComparing}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-md hover:shadow-lg"
        >
          {isComparing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Comparando...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Comparar Prompts
            </>
          )}
        </button>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {comparisonResult && (
        <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 max-h-80 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Resultados de Comparación
          </h3>

          {/* Summary */}
          <ScoreSummary
            improved={comparisonResult.summary.improved}
            worsened={comparisonResult.summary.worsened}
            unchanged={comparisonResult.summary.unchanged}
          />

          {/* Score Differences */}
          <div className="mt-4 space-y-2">
            {comparisonResult.scoreDifferences.map((diff) => (
              <ScoreComparisonCard key={diff.metric} difference={diff} />
            ))}
          </div>

          {/* Token Comparison */}
          {comparisonResult.tokenDifference && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-900">Uso de Tokens</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  {comparisonResult.originalTokens &&
                    formatTokens(comparisonResult.originalTokens.totalTokens)}{' '}
                  → {comparisonResult.modifiedTokens &&
                    formatTokens(comparisonResult.modifiedTokens.totalTokens)}
                </div>

                <div
                  className={`flex items-center gap-1 ${
                    comparisonResult.tokenDifference.totalDiff < 0
                      ? 'text-green-600'
                      : comparisonResult.tokenDifference.totalDiff > 0
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {comparisonResult.tokenDifference.totalDiff < 0 ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : comparisonResult.tokenDifference.totalDiff > 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : null}
                  <span className="font-medium">
                    {comparisonResult.tokenDifference.percentageChange > 0 ? '+' : ''}
                    {comparisonResult.tokenDifference.percentageChange}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
