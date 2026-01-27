'use client';

import { useAnalysisStore } from '@/store/analysisStore';
import { TokenUsageDisplay } from './TokenUsageDisplay';
import {
  Sparkles,
  Target,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Shield,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Coins,
} from 'lucide-react';
import { useState } from 'react';

export function AnalysisResults() {
  const { analysis, isAnalyzing } = useAnalysisStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: true,
    scores: true,
    priorities: true,
    tokens: false,
    missing: false,
    inconsistencies: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
        <div
          className="rounded-full h-12 w-12 mb-4"
          style={{
            border: '3px solid var(--accent-primary)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite'
          }}
        />
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Analizando tu prompt...
        </h3>
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
          Evaluando misión, tono, flujo, guardrails y más.
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <Sparkles className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
        </div>
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Listo para analizar
        </h3>
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
          Pega tu prompt y haz click en Analizar para obtener un análisis completo.
        </p>
      </div>
    );
  }

  const { agentProfile, scores, topPriorities, missingElements, inconsistencies, overallFeedback } = analysis;

  const getScoreColor = (score: number) => {
    if (score >= 8) return { bg: 'var(--success-subtle)', text: 'var(--success)', border: 'rgba(63, 185, 80, 0.2)' };
    if (score >= 6) return { bg: 'var(--warning-subtle)', text: 'var(--warning)', border: 'rgba(240, 180, 41, 0.2)' };
    return { bg: 'var(--error-subtle)', text: 'var(--error)', border: 'rgba(248, 81, 73, 0.2)' };
  };

  const overallColor = getScoreColor(scores.overall);

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div
        className="flex items-center gap-4 p-5 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, var(--accent-subtle), var(--bg-tertiary))',
          border: '1px solid var(--border-accent)'
        }}
      >
        <div className="flex-shrink-0">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{
              background: overallColor.bg,
              color: overallColor.text,
              border: `1px solid ${overallColor.border}`
            }}
          >
            {scores.overall.toFixed(1)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {overallFeedback}
          </p>
        </div>
      </div>

      {/* Agent Profile */}
      <CollapsibleSection
        title="Perfil del Agente"
        icon={<Target className="h-4 w-4" />}
        isOpen={expandedSections.profile}
        onToggle={() => toggleSection('profile')}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon={<Target className="h-4 w-4" style={{ color: 'var(--info)' }} />}
              label="Misión"
              value={agentProfile.detectedMission}
            />
            <InfoCard
              icon={<Users className="h-4 w-4" style={{ color: '#a855f7' }} />}
              label="Audiencia"
              value={agentProfile.targetAudience}
            />
          </div>
          <InfoCard
            icon={<MessageSquare className="h-4 w-4" style={{ color: 'var(--success)' }} />}
            label="Tono"
            value={agentProfile.tone}
          />

          {agentProfile.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Fortalezas</p>
              <div className="flex flex-wrap gap-2">
                {agentProfile.strengths.map((s, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg"
                    style={{
                      background: 'var(--success-subtle)',
                      color: 'var(--success)',
                      border: '1px solid rgba(63, 185, 80, 0.2)'
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {agentProfile.concerns.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Preocupaciones</p>
              <div className="flex flex-wrap gap-2">
                {agentProfile.concerns.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg"
                    style={{
                      background: 'var(--warning-subtle)',
                      color: 'var(--warning)',
                      border: '1px solid rgba(240, 180, 41, 0.2)'
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Scores */}
      <CollapsibleSection
        title="Puntuaciones"
        icon={<TrendingUp className="h-4 w-4" />}
        isOpen={expandedSections.scores}
        onToggle={() => toggleSection('scores')}
      >
        <div className="grid grid-cols-2 gap-3">
          <ScoreBar label="Claridad" score={scores.clarity} />
          <ScoreBar label="Consistencia" score={scores.consistency} />
          <ScoreBar label="Completitud" score={scores.completeness} />
          <ScoreBar label="Engagement" score={scores.engagement} />
          <ScoreBar label="Seguridad" score={scores.safety} />
        </div>
      </CollapsibleSection>

      {/* Top Priorities */}
      {topPriorities.length > 0 && (
        <CollapsibleSection
          title="Prioridades"
          icon={<Lightbulb className="h-4 w-4" />}
          isOpen={expandedSections.priorities}
          onToggle={() => toggleSection('priorities')}
          badge={topPriorities.length}
        >
          <ol className="space-y-2">
            {topPriorities.map((priority, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    background: 'var(--accent-subtle)',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--border-accent)'
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>{priority}</span>
              </li>
            ))}
          </ol>
        </CollapsibleSection>
      )}

      {/* Token Usage */}
      <CollapsibleSection
        title="Uso de Tokens"
        icon={<Coins className="h-4 w-4" />}
        isOpen={expandedSections.tokens}
        onToggle={() => toggleSection('tokens')}
      >
        <TokenUsageDisplay />
      </CollapsibleSection>

      {/* Missing Elements */}
      {missingElements.length > 0 && (
        <CollapsibleSection
          title="Elementos Faltantes"
          icon={<Shield className="h-4 w-4" />}
          isOpen={expandedSections.missing}
          onToggle={() => toggleSection('missing')}
          badge={missingElements.length}
        >
          <div className="space-y-2">
            {missingElements.map((element, i) => (
              <div
                key={i}
                className="p-4 rounded-xl"
                style={{
                  background: 'var(--warning-subtle)',
                  border: '1px solid rgba(240, 180, 41, 0.15)'
                }}
              >
                <div className="flex items-start gap-3">
                  <SeverityBadge severity={element.importance} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {element.element}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {element.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Inconsistencies */}
      {inconsistencies.length > 0 && (
        <CollapsibleSection
          title="Inconsistencias"
          icon={<AlertTriangle className="h-4 w-4" />}
          isOpen={expandedSections.inconsistencies}
          onToggle={() => toggleSection('inconsistencies')}
          badge={inconsistencies.length}
        >
          <div className="space-y-2">
            {inconsistencies.map((inc) => (
              <div
                key={inc.id}
                className="p-4 rounded-xl"
                style={{
                  background: 'var(--error-subtle)',
                  border: '1px solid rgba(248, 81, 73, 0.15)'
                }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {inc.description}
                </p>
                <div className="mt-2 space-y-1">
                  {inc.locations.map((loc, i) => (
                    <p
                      key={i}
                      className="text-xs px-2 py-1 rounded-lg font-mono"
                      style={{
                        background: 'rgba(248, 81, 73, 0.1)',
                        color: 'var(--error)'
                      }}
                    >
                      "{loc}"
                    </p>
                  ))}
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Sugerencia:</strong> {inc.suggestion}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* All Good State */}
      {missingElements.length === 0 && inconsistencies.length === 0 && (
        <div
          className="rounded-xl p-6 text-center"
          style={{
            background: 'var(--success-subtle)',
            border: '1px solid rgba(63, 185, 80, 0.2)'
          }}
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(63, 185, 80, 0.2)' }}
          >
            <CheckCircle className="h-7 w-7" style={{ color: 'var(--success)' }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--success)' }}>
            ¡Excelente!
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            No se encontraron problemas significativos en tu prompt.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper Components

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 transition-all duration-200 hover:bg-[var(--accent-subtle)]"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {title}
          </span>
          {badge !== undefined && (
            <span className="badge badge-accent">{badge}</span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        )}
      </button>
      {isOpen && (
        <div className="p-4" style={{ background: 'var(--bg-secondary)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="p-3 rounded-xl"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = (score / 10) * 100;

  const getBarColor = (s: number) => {
    if (s >= 8) return 'var(--success)';
    if (s >= 6) return 'var(--warning)';
    return 'var(--error)';
  };

  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          {score}/10
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: getBarColor(score)
          }}
        />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const getSeverityStyles = (sev: string) => {
    switch (sev) {
      case 'critical':
        return { bg: 'var(--error-subtle)', text: 'var(--error)', border: 'rgba(248, 81, 73, 0.2)' };
      case 'high':
        return { bg: 'rgba(255, 140, 66, 0.1)', text: '#ff8c42', border: 'rgba(255, 140, 66, 0.2)' };
      case 'medium':
        return { bg: 'var(--warning-subtle)', text: 'var(--warning)', border: 'rgba(240, 180, 41, 0.2)' };
      default:
        return { bg: 'var(--bg-elevated)', text: 'var(--text-muted)', border: 'var(--border-subtle)' };
    }
  };

  const styles = getSeverityStyles(severity);

  return (
    <span
      className="px-2 py-1 text-xs font-bold rounded-md uppercase"
      style={{
        background: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`
      }}
    >
      {severity}
    </span>
  );
}
