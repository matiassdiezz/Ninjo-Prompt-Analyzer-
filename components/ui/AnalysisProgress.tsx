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
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--accent-subtle)',
          border: '1px solid var(--border-accent)'
        }}
      >
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium truncate" style={{ color: 'var(--accent-primary)' }}>
                {analysisProgress.stepName}
              </span>
              <span className="ml-2 font-semibold" style={{ color: 'var(--accent-primary)' }}>
                {Math.round(percentage)}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${percentage}%`,
                  background: 'var(--gradient-primary)'
                }}
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
    <div
      className="rounded-xl p-6"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Header with icon and step name */}
      <div className="flex items-center gap-4 mb-5">
        <div
          className="p-3 rounded-xl"
          style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }}
        >
          <Search className="h-5 w-5 animate-pulse" style={{ color: 'var(--accent-primary)' }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {analysisProgress.stepName}
          </h3>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: 'var(--text-tertiary)' }}>Progreso</span>
          <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
            {Math.round(percentage)}%
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${percentage}%`,
              background: 'var(--gradient-primary)',
              boxShadow: 'var(--shadow-glow)'
            }}
          />
        </div>
      </div>

      {/* Time remaining */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
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
              className="flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200"
              style={{
                background: isCurrent ? 'var(--accent-subtle)' : 'transparent',
                border: isCurrent ? '1px solid var(--border-accent)' : '1px solid transparent'
              }}
            >
              {isCompleted ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
              ) : isCurrent ? (
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
              ) : (
                <Circle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              )}
              <span
                className={`text-sm ${isCurrent ? 'font-medium' : ''}`}
                style={{
                  color: isCompleted
                    ? 'var(--success)'
                    : isCurrent
                    ? 'var(--accent-primary)'
                    : 'var(--text-muted)'
                }}
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
