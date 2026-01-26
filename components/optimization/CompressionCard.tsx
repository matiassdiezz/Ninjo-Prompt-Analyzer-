'use client';

import { Check, X, ArrowRight, Sparkles, MinusCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { CompressionSuggestion, CompressionStatus } from '@/types/optimization';
import { formatTokens } from '@/types/tokens';

interface CompressionCardProps {
  suggestion: CompressionSuggestion;
  status: CompressionStatus;
  onApply: () => void;
  onReject: () => void;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  verbose: { label: 'Verboso', color: 'blue' },
  redundant: { label: 'Redundante', color: 'yellow' },
  filler: { label: 'Relleno', color: 'gray' },
  restructure: { label: 'Reestructurar', color: 'purple' },
};

const clarityImpactLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  none: { label: 'Sin impacto', icon: <Check className="h-3 w-3" />, color: 'green' },
  minimal: { label: 'Impacto mínimo', icon: <MinusCircle className="h-3 w-3" />, color: 'blue' },
  moderate: { label: 'Impacto moderado', icon: <AlertCircle className="h-3 w-3" />, color: 'yellow' },
  significant: { label: 'Impacto significativo', icon: <AlertCircle className="h-3 w-3" />, color: 'red' },
};

export function CompressionCard({ suggestion, status, onApply, onReject }: CompressionCardProps) {
  const category = categoryLabels[suggestion.category] || categoryLabels.verbose;
  const clarityImpact = clarityImpactLabels[suggestion.clarityImpact] || clarityImpactLabels.none;

  const isApplied = status === 'applied';
  const isRejected = status === 'rejected';
  const isPending = status === 'pending';

  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-opacity ${
        isRejected ? 'opacity-50' : ''
      } ${isApplied ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClasses[category.color]}`}>
            {category.label}
          </span>
          <span className="text-xs text-gray-500">
            ~{formatTokens(suggestion.tokenSavings)} tokens
          </span>
        </div>

        <div className={`flex items-center gap-1 text-xs ${colorClasses[clarityImpact.color]}`}>
          {clarityImpact.icon}
          <span>{clarityImpact.label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Original */}
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Original</span>
          <div className="mt-1 p-2 bg-gray-100 rounded text-sm text-gray-700 font-mono whitespace-pre-wrap">
            {suggestion.originalText}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </div>

        {/* Compressed */}
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Comprimido</span>
          <div className="mt-1 p-2 bg-blue-50 rounded text-sm text-blue-700 font-mono whitespace-pre-wrap">
            {suggestion.compressedText}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
        {isApplied && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-4 w-4" />
            Aplicado
          </span>
        )}

        {isRejected && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <X className="h-4 w-4" />
            Rechazado
          </span>
        )}

        {isPending && (
          <>
            <button
              onClick={onReject}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="h-4 w-4" />
              Rechazar
            </button>
            <button
              onClick={onApply}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
            >
              <Check className="h-4 w-4" />
              Aplicar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
