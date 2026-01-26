'use client';

import { useAnalysisStore } from '@/store/analysisStore';
import { SuggestionCard } from './SuggestionCard';
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
} from 'lucide-react';
import { useState } from 'react';
import { CATEGORY_INFO } from '@/types/analysis';

export function AnalysisResults() {
  const { analysis, isAnalyzing } = useAnalysisStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: true,
    scores: true,
    priorities: true,
    issues: true,
    missing: false,
    inconsistencies: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mb-4" />
        <h3 className="text-base font-medium text-gray-900 mb-1">Analizando tu prompt...</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Evaluando misión, tono, flujo, guardrails y más. Esto puede tomar 30-60 segundos.
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
        <Sparkles className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-base font-medium text-gray-900 mb-1">Listo para analizar</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Pega tu prompt y haz click en Analizar para obtener un análisis completo.
        </p>
      </div>
    );
  }

  const { agentProfile, scores, topPriorities, sections, missingElements, inconsistencies, overallFeedback } = analysis;

  // Sort sections by severity
  const sortedSections = [...sections].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="flex-shrink-0">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
            scores.overall >= 8 ? 'bg-green-100 text-green-700' :
            scores.overall >= 6 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {scores.overall.toFixed(1)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{overallFeedback}</p>
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
              icon={<Target className="h-4 w-4 text-blue-500" />}
              label="Misión"
              value={agentProfile.detectedMission}
            />
            <InfoCard
              icon={<Users className="h-4 w-4 text-purple-500" />}
              label="Audiencia"
              value={agentProfile.targetAudience}
            />
          </div>
          <InfoCard
            icon={<MessageSquare className="h-4 w-4 text-green-500" />}
            label="Tono"
            value={agentProfile.tone}
          />

          {agentProfile.strengths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Fortalezas</p>
              <div className="flex flex-wrap gap-1.5">
                {agentProfile.strengths.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {agentProfile.concerns.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Preocupaciones</p>
              <div className="flex flex-wrap gap-1.5">
                {agentProfile.concerns.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full">
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
        <div className="grid grid-cols-2 gap-2">
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
              <li key={i} className="flex gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <span className="text-gray-700">{priority}</span>
              </li>
            ))}
          </ol>
        </CollapsibleSection>
      )}

      {/* Issues by Section */}
      {sortedSections.length > 0 && (
        <CollapsibleSection
          title="Problemas Detectados"
          icon={<AlertTriangle className="h-4 w-4" />}
          isOpen={expandedSections.issues}
          onToggle={() => toggleSection('issues')}
          badge={sortedSections.length}
        >
          <div className="space-y-3">
            {sortedSections.map((section) => (
              <SuggestionCard key={section.id} section={section} />
            ))}
          </div>
        </CollapsibleSection>
      )}

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
              <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <SeverityBadge severity={element.importance} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{element.element}</p>
                    <p className="text-xs text-gray-600 mt-1">{element.suggestion}</p>
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
              <div key={inc.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900">{inc.description}</p>
                <div className="mt-2 space-y-1">
                  {inc.locations.map((loc, i) => (
                    <p key={i} className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                      "{loc}"
                    </p>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  <strong>Sugerencia:</strong> {inc.suggestion}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* All Good State */}
      {sortedSections.length === 0 && missingElements.length === 0 && inconsistencies.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-2" />
          <h3 className="text-base font-medium text-green-900">¡Excelente!</h3>
          <p className="text-sm text-green-700">
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
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-700">{title}</span>
          {badge !== undefined && (
            <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="p-3 bg-white">{children}</div>}
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
    <div className="p-2 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = (score / 10) * 100;
  const color =
    score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{score}/10</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${colors[severity] || colors.medium}`}>
      {severity}
    </span>
  );
}
