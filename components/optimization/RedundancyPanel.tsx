'use client';

import { useMemo } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { analyzeRedundancy, getRedundancyLevel } from '@/lib/utils/redundancyDetector';
import { formatTokens } from '@/types/tokens';
import { AlertTriangle, CheckCircle, Copy, Eye, Merge } from 'lucide-react';
import type { RedundantPhrase } from '@/types/optimization';

export function RedundancyPanel() {
  const { currentPrompt } = useAnalysisStore();

  const redundancyResult = useMemo(() => {
    return analyzeRedundancy(currentPrompt);
  }, [currentPrompt]);

  const level = getRedundancyLevel(redundancyResult.redundancyScore);

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  };

  const colors = colorClasses[level.color] || colorClasses.gray;

  if (!currentPrompt.trim()) {
    return (
      <div className="p-4 text-center text-gray-500">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">Ingresa un prompt para analizar redundancias.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Score Header */}
      <div className={`rounded-lg p-4 ${colors.bg} ${colors.border} border`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Redundancias Detectadas
          </h3>
          <div className={`px-2 py-1 rounded text-xs font-medium ${colors.text} ${colors.bg}`}>
            {level.label}
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-2xl font-bold ${colors.text}`}>
            {redundancyResult.redundancyScore}
          </span>
          <span className="text-sm text-gray-500">/10</span>
          <span className="text-sm text-gray-500">
            (menor es mejor)
          </span>
        </div>

        <p className="text-sm text-gray-600">{level.description}</p>

        {redundancyResult.totalRedundantTokens > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">Tokens redundantes estimados: </span>
            <span className="text-sm font-semibold text-gray-900">
              ~{formatTokens(redundancyResult.totalRedundantTokens)}
            </span>
          </div>
        )}
      </div>

      {/* Redundant Phrases List */}
      {redundancyResult.phrases.length > 0 ? (
        <div className="space-y-3">
          {redundancyResult.phrases.map((phrase) => (
            <RedundantPhraseCard key={phrase.id} phrase={phrase} />
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm text-gray-600">
            No se detectaron frases redundantes.
          </p>
        </div>
      )}
    </div>
  );
}

function RedundantPhraseCard({ phrase }: { phrase: RedundantPhrase }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(phrase.phrase);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium truncate">
            &ldquo;{phrase.phrase}&rdquo;
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Aparece <span className="font-medium">{phrase.occurrences}x</span> en las líneas{' '}
            {phrase.locations.join(', ')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          ~{formatTokens(phrase.estimatedTokens)} tokens redundantes
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Copiar frase"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            title="Ver en editor"
          >
            <Eye className="h-3 w-3" />
            <span>Ver</span>
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
            title="Consolidar ocurrencias"
          >
            <Merge className="h-3 w-3" />
            <span>Consolidar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
