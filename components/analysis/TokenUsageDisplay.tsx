'use client';

import { useAnalysisStore } from '@/store/analysisStore';
import { formatTokens, formatCost } from '@/types/tokens';
import { Coins, ArrowDown, ArrowUp, Calculator } from 'lucide-react';

interface TokenUsageDisplayProps {
  compact?: boolean;
}

export function TokenUsageDisplay({ compact = false }: TokenUsageDisplayProps) {
  const { tokenUsage } = useAnalysisStore();

  if (!tokenUsage) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Coins className="h-3 w-3" />
        <span>{formatTokens(tokenUsage.totalTokens)} tokens</span>
        <span className="text-gray-300">|</span>
        <span>{formatCost(tokenUsage.estimatedCost)}</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">Uso de Tokens</h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
            <ArrowDown className="h-3 w-3" />
            <span className="text-xs font-medium">Input</span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {formatTokens(tokenUsage.inputTokens)}
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
            <ArrowUp className="h-3 w-3" />
            <span className="text-xs font-medium">Output</span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {formatTokens(tokenUsage.outputTokens)}
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
            <Coins className="h-3 w-3" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {formatTokens(tokenUsage.totalTokens)}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 text-center">
        <span className="text-xs text-gray-500">Costo estimado: </span>
        <span className="text-sm font-semibold text-gray-900">
          {formatCost(tokenUsage.estimatedCost)}
        </span>
      </div>
    </div>
  );
}
