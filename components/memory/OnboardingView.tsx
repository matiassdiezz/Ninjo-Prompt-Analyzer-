'use client';

import { useState, useMemo } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import type { KnowledgeEntry } from '@/types/prompt';
import {
  GraduationCap,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  X,
  TrendingUp,
} from 'lucide-react';

interface OnboardingViewProps {
  onComplete: () => void;
  onClose: () => void;
}

export function OnboardingView({ onComplete, onClose }: OnboardingViewProps) {
  const { entries } = useKnowledgeStore();
  const [readLearnings, setReadLearnings] = useState<Set<string>>(new Set());

  // Get top 20 most important learnings for onboarding
  const topLearnings = useMemo(() => {
    return entries
      .filter(e => e.tags.includes('from-chat'))
      .sort((a, b) => {
        // Sort by effectiveness, usage, and recency
        const scoreA = 
          (a.effectiveness === 'high' ? 100 : a.effectiveness === 'medium' ? 50 : 10) +
          (a.usageCount * 5) +
          (a.tags.includes('recurrente') ? 30 : 0);
        const scoreB = 
          (b.effectiveness === 'high' ? 100 : b.effectiveness === 'medium' ? 50 : 10) +
          (b.usageCount * 5) +
          (b.tags.includes('recurrente') ? 30 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 20);
  }, [entries]);

  const progress = (readLearnings.size / topLearnings.length) * 100;
  const isComplete = readLearnings.size === topLearnings.length;

  const toggleRead = (learningId: string) => {
    const newSet = new Set(readLearnings);
    if (newSet.has(learningId)) {
      newSet.delete(learningId);
    } else {
      newSet.add(learningId);
    }
    setReadLearnings(newSet);
  };

  const handleComplete = () => {
    // Save onboarding progress to localStorage
    localStorage.setItem('ninjo-onboarding-completed', 'true');
    onComplete();
  };

  // Group by category
  const groupedLearnings = useMemo(() => {
    const groups = new Map<string, KnowledgeEntry[]>();
    
    topLearnings.forEach(learning => {
      const category = learning.tags.find(t => 
        !['from-chat', 'self-serve', 'único', 'ocasional', 'recurrente', 'annotation'].includes(t)
      ) || 'general';
      
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(learning);
    });
    
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [topLearnings]);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }}
            >
              <GraduationCap className="h-6 w-6" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Onboarding - Conocimiento Esencial
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Top {topLearnings.length} aprendizajes más importantes del equipo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
          >
            <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Progreso
            </span>
            <span className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {readLearnings.size} / {topLearnings.length}
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: isComplete ? 'var(--success)' : 'var(--gradient-primary)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {groupedLearnings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No hay learnings disponibles para onboarding
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedLearnings.map(([category, learnings]) => (
              <div key={category}>
                <h3
                  className="text-sm font-semibold mb-3 uppercase tracking-wider"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {category}
                </h3>
                <div className="space-y-2">
                  {learnings.map((learning) => {
                    const isRead = readLearnings.has(learning.id);
                    const isPattern = learning.type === 'pattern';

                    return (
                      <div
                        key={learning.id}
                        className="rounded-lg overflow-hidden transition-all duration-200"
                        style={{
                          background: isRead ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                          border: `1px solid ${isRead ? 'var(--border-subtle)' : 'var(--border-accent)'}`,
                          opacity: isRead ? 0.7 : 1,
                        }}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            {isPattern ? (
                              <div
                                className="p-1.5 rounded-lg flex-shrink-0"
                                style={{ background: 'var(--success-subtle)' }}
                              >
                                <Lightbulb className="h-4 w-4" style={{ color: 'var(--success)' }} />
                              </div>
                            ) : (
                              <div
                                className="p-1.5 rounded-lg flex-shrink-0"
                                style={{ background: 'var(--error-subtle)' }}
                              >
                                <AlertTriangle className="h-4 w-4" style={{ color: 'var(--error)' }} />
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {learning.title}
                                </h4>
                                <button
                                  onClick={() => toggleRead(learning.id)}
                                  className="flex-shrink-0 p-1.5 rounded-lg transition-all"
                                  style={{
                                    background: isRead ? 'var(--success-subtle)' : 'var(--bg-elevated)',
                                    border: `1px solid ${isRead ? 'rgba(63, 185, 80, 0.3)' : 'var(--border-subtle)'}`,
                                  }}
                                >
                                  <CheckCircle
                                    className="h-4 w-4"
                                    style={{ color: isRead ? 'var(--success)' : 'var(--text-muted)' }}
                                  />
                                </button>
                              </div>

                              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                                {learning.description}
                              </p>

                              {/* Example */}
                              {learning.example && (
                                <div
                                  className="text-xs p-2 rounded-lg font-mono mb-2"
                                  style={{
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-tertiary)',
                                  }}
                                >
                                  {learning.example.length > 150
                                    ? learning.example.substring(0, 150) + '...'
                                    : learning.example}
                                </div>
                              )}

                              {/* Meta */}
                              <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                <span
                                  className="px-2 py-0.5 rounded-full"
                                  style={{
                                    background:
                                      learning.effectiveness === 'high'
                                        ? 'var(--error-subtle)'
                                        : learning.effectiveness === 'medium'
                                        ? 'var(--warning-subtle)'
                                        : 'var(--bg-elevated)',
                                    color:
                                      learning.effectiveness === 'high'
                                        ? 'var(--error)'
                                        : learning.effectiveness === 'medium'
                                        ? 'var(--warning)'
                                        : 'var(--text-muted)',
                                  }}
                                >
                                  {learning.effectiveness === 'high' ? 'Alta' : learning.effectiveness === 'medium' ? 'Media' : 'Baja'}
                                </span>
                                {learning.usageCount > 0 && (
                                  <div className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    <span>{learning.usageCount} usos</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex-shrink-0 px-6 py-4 border-t"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {isComplete ? '¡Completado!' : 'Marca como leído cada aprendizaje'}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {isComplete
                ? 'Ya conoces los patrones más importantes del equipo'
                : 'Esto te ayudará a trabajar más rápido y consistente'}
            </p>
          </div>
          <button
            onClick={handleComplete}
            disabled={!isComplete}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-40"
            style={{
              background: isComplete ? 'var(--gradient-primary)' : 'var(--bg-elevated)',
              color: isComplete ? '#0a0e14' : 'var(--text-muted)',
              border: isComplete ? 'none' : '1px solid var(--border-subtle)',
            }}
          >
            {isComplete ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Finalizar Onboarding
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
