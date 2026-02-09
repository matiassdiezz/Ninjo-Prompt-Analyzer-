'use client';

import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  GitBranch,
  Target,
} from 'lucide-react';
import { LEAD_PERSONAS } from '@/lib/simulation/leadPersonas';
import type { BatchTestResult, SimulationOutcome } from '@/types/simulation';

interface BatchReportPanelProps {
  result: BatchTestResult;
}

const OUTCOME_LABELS: Record<SimulationOutcome, string> = {
  converted: 'Convertido',
  nurture: 'Nurture',
  lost: 'Perdido',
  blocked: 'Bloqueado',
  timeout: 'Timeout',
};

function ScoreDisplay({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'var(--success)'
      : score >= 60
        ? 'var(--warning)'
        : 'var(--error)';

  return (
    <div className="text-center">
      <div
        className="text-5xl font-bold"
        style={{ color }}
      >
        {Math.round(score)}
      </div>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        Score general
      </p>
    </div>
  );
}

export function BatchReportPanel({ result }: BatchReportPanelProps) {
  const overallScore =
    result.personaResults.filter((r) => r.verdict === 'pass').length /
    result.personaResults.length *
    100;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Score + Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div
          className="col-span-1 p-4 rounded-xl border flex items-center justify-center"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
        >
          <ScoreDisplay score={overallScore} />
        </div>

        <div className="col-span-3 grid grid-cols-3 gap-3">
          <div
            className="p-4 rounded-xl border"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--success)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Conversion
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {Math.round(result.conversionRate)}%
            </p>
          </div>

          <div
            className="p-4 rounded-xl border"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4" style={{ color: '#388bfd' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Msgs promedio
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {Math.round(result.avgMessages)}
            </p>
          </div>

          <div
            className="p-4 rounded-xl border"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Cobertura
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {Math.round(result.totalNodeCoveragePercent)}%
            </p>
          </div>
        </div>
      </div>

      {/* Per-persona results */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="px-4 py-3 border-b"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
        >
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Target className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            Resultados por Persona
          </h3>
        </div>
        <div style={{ background: 'var(--bg-primary)' }}>
          {result.personaResults.map((pr) => {
            const persona = LEAD_PERSONAS.find((p) => p.id === pr.personaId);
            const verdictConfig = {
              pass: { icon: CheckCircle, color: 'var(--success)', label: 'Pass' },
              fail: { icon: XCircle, color: 'var(--error)', label: 'Fail' },
              warning: { icon: AlertTriangle, color: 'var(--warning)', label: 'Warning' },
            }[pr.verdict];
            const VerdictIcon = verdictConfig.icon;

            return (
              <div
                key={pr.personaId}
                className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span className="text-xl">{persona?.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {persona?.name}
                  </p>
                  {pr.notes && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                      {pr.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {OUTCOME_LABELS[pr.outcome]}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {pr.messagesCount} msgs
                  </span>
                  {pr.issues.length > 0 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: pr.issues.some((i) => i.severity === 'critical') ? 'var(--error-subtle)' : 'var(--warning-subtle)',
                        color: pr.issues.some((i) => i.severity === 'critical') ? 'var(--error)' : 'var(--warning)',
                      }}
                    >
                      {pr.issues.length} issues
                    </span>
                  )}
                  <VerdictIcon className="h-4 w-4" style={{ color: verdictConfig.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="p-4 rounded-xl border"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
        >
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Resumen
          </h4>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Total simulaciones</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{result.totalRuns}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Conversiones</span>
              <span className="font-medium" style={{ color: 'var(--success)' }}>
                {result.personaResults.filter((r) => r.outcome === 'converted').length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Nodos cubiertos</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {result.nodeCoverage}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Issues criticos</span>
              <span
                className="font-medium"
                style={{
                  color: result.personaResults.flatMap((r) => r.issues).some((i) => i.severity === 'critical')
                    ? 'var(--error)'
                    : 'var(--success)',
                }}
              >
                {result.personaResults.flatMap((r) => r.issues).filter((i) => i.severity === 'critical').length}
              </span>
            </div>
          </div>
        </div>

        <div
          className="p-4 rounded-xl border"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
        >
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Veredictos
          </h4>
          <div className="space-y-1.5">
            {(['pass', 'warning', 'fail'] as const).map((verdict) => {
              const count = result.personaResults.filter((r) => r.verdict === verdict).length;
              const config = {
                pass: { color: 'var(--success)', label: 'Pass' },
                warning: { color: 'var(--warning)', label: 'Warning' },
                fail: { color: 'var(--error)', label: 'Fail' },
              }[verdict];
              return (
                <div key={verdict} className="flex items-center gap-2">
                  <div
                    className="w-full rounded-full h-2 overflow-hidden"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${result.personaResults.length > 0 ? (count / result.personaResults.length) * 100 : 0}%`,
                        background: config.color,
                      }}
                    />
                  </div>
                  <span className="text-xs shrink-0 w-16" style={{ color: config.color }}>
                    {count} {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
