'use client';

import { useEffect, useState } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { Search, CheckCircle, Circle, Loader2, Clock } from 'lucide-react';

export const ANALYSIS_STEPS = [
  { name: 'Preparando análisis', duration: 2, endPercent: 5 },
  { name: 'Analizando estructura del prompt', duration: 5, endPercent: 20 },
  { name: 'Evaluando claridad y consistencia', duration: 8, endPercent: 40 },
  { name: 'Identificando áreas de mejora', duration: 8, endPercent: 60 },
  { name: 'Generando sugerencias', duration: 10, endPercent: 85 },
  { name: 'Validando resultados', duration: 5, endPercent: 95 },
  { name: 'Finalizando', duration: 2, endPercent: 100 },
];

export const TOTAL_ESTIMATED_TIME = ANALYSIS_STEPS.reduce((acc, step) => acc + step.duration, 0);

interface AnalysisProgressProps {
  compact?: boolean;
}

export function AnalysisProgress({ compact = false }: AnalysisProgressProps) {
  const { analysisProgress } = useAnalysisStore();
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_ESTIMATED_TIME);

  useEffect(() => {
    if (!analysisProgress) {
      setTimeRemaining(TOTAL_ESTIMATED_TIME);
      return;
    }

    const updateTimeRemaining = () => {
      const elapsed = (Date.now() - analysisProgress.startTime) / 1000;
      const remaining = Math.max(0, analysisProgress.estimatedTotal - elapsed);
      setTimeRemaining(Math.ceil(remaining));
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [analysisProgress]);

  if (!analysisProgress) return null;

  const percentage = analysisProgress.percentage;

  // Compact mode - just a progress bar with step name
  if (compact) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-blue-700 font-medium truncate">
                {analysisProgress.stepName}
              </span>
              <span className="text-blue-600 ml-2">{Math.round(percentage)}%</span>
            </div>
            <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full mode
  const currentStep = analysisProgress.step;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header with icon and step name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Search className="h-5 w-5 text-blue-600 animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {analysisProgress.stepName}
          </h3>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progreso</span>
          <span className="font-medium">{Math.round(percentage)}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Time remaining */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Clock className="h-4 w-4" />
        <span>
          {timeRemaining > 0
            ? `~${timeRemaining} segundos restantes`
            : 'Finalizando...'}
        </span>
      </div>

      {/* Steps list */}
      <div className="space-y-2">
        {ANALYSIS_STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div
              key={index}
              className={`flex items-center gap-3 py-1.5 px-2 rounded-lg transition-colors ${
                isCurrent ? 'bg-blue-50' : ''
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  isCompleted
                    ? 'text-green-700'
                    : isCurrent
                    ? 'text-blue-700 font-medium'
                    : 'text-gray-400'
                }`}
              >
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
