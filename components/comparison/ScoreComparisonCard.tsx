'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { ScoreDifference } from '@/types/comparison';

interface ScoreComparisonCardProps {
  difference: ScoreDifference;
}

export function ScoreComparisonCard({ difference }: ScoreComparisonCardProps) {
  const { label, original, modified, difference: diff, improved } = difference;

  const getDiffColor = () => {
    if (diff === 0) return 'text-gray-500';
    return improved ? 'text-green-600' : 'text-red-600';
  };

  const getDiffBgColor = () => {
    if (diff === 0) return 'bg-gray-50';
    return improved ? 'bg-green-50' : 'bg-red-50';
  };

  const getDiffIcon = () => {
    if (diff === 0) return <Minus className="h-3 w-3" />;
    return improved ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const formatDiff = () => {
    if (diff === 0) return '0';
    return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-gray-100">
      <span className="text-sm text-gray-700 font-medium">{label}</span>

      <div className="flex items-center gap-3">
        {/* Original Score */}
        <div className="text-right">
          <span className="text-sm font-mono text-gray-500">{original.toFixed(1)}</span>
        </div>

        {/* Arrow */}
        <span className="text-gray-300">→</span>

        {/* Modified Score */}
        <div className="text-right">
          <span className="text-sm font-mono text-gray-900 font-semibold">
            {modified.toFixed(1)}
          </span>
        </div>

        {/* Difference Badge */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${getDiffBgColor()} ${getDiffColor()}`}
        >
          {getDiffIcon()}
          <span className="text-xs font-medium">{formatDiff()}</span>
        </div>
      </div>
    </div>
  );
}

interface ScoreSummaryProps {
  improved: number;
  worsened: number;
  unchanged: number;
}

export function ScoreSummary({ improved, worsened, unchanged }: ScoreSummaryProps) {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
      {improved > 0 && (
        <div className="flex items-center gap-1.5 text-green-600">
          <ArrowUp className="h-4 w-4" />
          <span className="text-sm font-medium">{improved} mejoraron</span>
        </div>
      )}
      {worsened > 0 && (
        <div className="flex items-center gap-1.5 text-red-600">
          <ArrowDown className="h-4 w-4" />
          <span className="text-sm font-medium">{worsened} empeoraron</span>
        </div>
      )}
      {unchanged > 0 && (
        <div className="flex items-center gap-1.5 text-gray-500">
          <Minus className="h-4 w-4" />
          <span className="text-sm font-medium">{unchanged} sin cambio</span>
        </div>
      )}
    </div>
  );
}
