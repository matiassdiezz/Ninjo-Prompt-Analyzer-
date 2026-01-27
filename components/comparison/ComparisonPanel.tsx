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
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Editors Side by Side */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 min-h-0 relative">
        {/* Original Prompt */}
        <div className="flex flex-col min-h-0">
          <div
            className="flex items-center justify-between px-4 py-2.5 rounded-t-xl border border-b-0"
            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Original</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {originalPrompt.length} caracteres
            </span>
          </div>
          <textarea
            value={originalPrompt}
            onChange={(e) => setOriginalPrompt(e.target.value)}
            placeholder="Pega el prompt original aquí..."
            className="flex-1 w-full p-4 font-mono text-sm rounded-b-xl resize-none focus:outline-none"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              caretColor: 'var(--accent-primary)'
            }}
          />
        </div>

        {/* Swap Button */}
        <button
          onClick={swapPrompts}
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 p-3 rounded-full transition-all duration-200"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-md)'
          }}
          title="Intercambiar prompts"
        >
          <ArrowLeftRight className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>

        {/* Modified Prompt */}
        <div className="flex flex-col min-h-0">
          <div
            className="flex items-center justify-between px-4 py-2.5 rounded-t-xl border border-b-0"
            style={{
              background: 'var(--accent-subtle)',
              borderColor: 'var(--border-accent)'
            }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>Modificado</span>
            <span className="text-xs" style={{ color: 'var(--accent-secondary)' }}>
              {modifiedPrompt.length} caracteres
            </span>
          </div>
          <textarea
            value={modifiedPrompt}
            onChange={(e) => setModifiedPrompt(e.target.value)}
            placeholder="Pega el prompt modificado aquí..."
            className="flex-1 w-full p-4 font-mono text-sm rounded-b-xl resize-none focus:outline-none"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-accent)',
              color: 'var(--text-primary)',
              caretColor: 'var(--accent-primary)'
            }}
          />
        </div>
      </div>

      {/* Compare Button */}
      <div className="flex-shrink-0 px-4 pb-4">
        <button
          onClick={compare}
          disabled={!canCompare || isComparing}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 btn-primary rounded-xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
          <div
            className="mt-3 rounded-xl p-4 flex items-start gap-3"
            style={{
              background: 'var(--error-subtle)',
              border: '1px solid rgba(248, 81, 73, 0.2)'
            }}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--error)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {comparisonResult && (
        <div
          className="flex-shrink-0 border-t p-4 max-h-80 overflow-y-auto"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
        >
          <h3
            className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <BarChart3 className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
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
            <div
              className="mt-4 p-4 rounded-xl"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Coins className="h-4 w-4" style={{ color: '#a855f7' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Uso de Tokens
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div style={{ color: 'var(--text-secondary)' }}>
                  {comparisonResult.originalTokens &&
                    formatTokens(comparisonResult.originalTokens.totalTokens)}{' '}
                  → {comparisonResult.modifiedTokens &&
                    formatTokens(comparisonResult.modifiedTokens.totalTokens)}
                </div>

                <div
                  className="flex items-center gap-1"
                  style={{
                    color: comparisonResult.tokenDifference.totalDiff < 0
                      ? 'var(--success)'
                      : comparisonResult.tokenDifference.totalDiff > 0
                      ? 'var(--error)'
                      : 'var(--text-muted)'
                  }}
                >
                  {comparisonResult.tokenDifference.totalDiff < 0 ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : comparisonResult.tokenDifference.totalDiff > 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : null}
                  <span className="font-semibold">
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
