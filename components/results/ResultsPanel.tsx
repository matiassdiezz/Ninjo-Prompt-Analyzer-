'use client';

import { useState } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { AnalysisResults } from '@/components/analysis/AnalysisResults';
import { PromptChat } from '@/components/analysis/PromptChat';
import { SuggestionReviewPanel } from '@/components/review/SuggestionReviewPanel';
import { VersionTimeline } from '@/components/review/VersionTimeline';
import { KnowledgeBase } from '@/components/knowledge/KnowledgeBase';
import { OptimizationPanel } from '@/components/optimization/OptimizationPanel';
import {
  BarChart3,
  MessageCircle,
  CheckSquare,
  GitBranch,
  BookOpen,
  Sparkles,
  Zap,
} from 'lucide-react';

type TabType = 'analysis' | 'review' | 'chat' | 'history' | 'knowledge' | 'optimize';

interface ResultsPanelProps {
  isStreaming?: boolean;
}

export function ResultsPanel({ isStreaming = false }: ResultsPanelProps) {
  const { analysis, currentPrompt } = useAnalysisStore();
  const { getCurrentProject } = useKnowledgeStore();
  const [activeTab, setActiveTab] = useState<TabType>('analysis');

  const project = getCurrentProject();
  const hasSuggestions = analysis && analysis.sections.length > 0 ? true : undefined;

  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number; highlight?: boolean }[] = [
    {
      id: 'analysis',
      label: 'Análisis',
      icon: <BarChart3 className="h-4 w-4" />,
      badge: analysis?.sections.length,
    },
    {
      id: 'review',
      label: 'Revisar',
      icon: <CheckSquare className="h-4 w-4" />,
      badge: analysis?.sections.length,
      highlight: hasSuggestions,
    },
    {
      id: 'optimize',
      label: 'Optimizar',
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageCircle className="h-4 w-4" />,
    },
    {
      id: 'history',
      label: 'Versiones',
      icon: <GitBranch className="h-4 w-4" />,
      badge: project?.versions.length,
    },
    {
      id: 'knowledge',
      label: 'Base',
      icon: <BookOpen className="h-4 w-4" />,
    },
  ];

  const handleApplyChanges = () => {
    // After applying changes, switch to analysis tab to see updated prompt
    setActiveTab('analysis');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap
              ${activeTab === tab.id
                ? 'text-blue-600 bg-white'
                : tab.highlight
                ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : tab.highlight
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'analysis' && (
          <div className="h-full overflow-y-auto p-4">
            {!currentPrompt.trim() ? (
              <EmptyState
                icon={<Sparkles className="h-12 w-12 text-gray-300" />}
                title="Listo para analizar"
                description="Pega tu prompt en el editor y haz click en Analizar para comenzar."
              />
            ) : (
              <AnalysisResults />
            )}
          </div>
        )}

        {activeTab === 'review' && (
          <div className="h-full overflow-hidden">
            {!analysis || analysis.sections.length === 0 ? (
              <div className="h-full flex items-center justify-center p-4">
                <EmptyState
                  icon={<CheckSquare className="h-12 w-12 text-gray-300" />}
                  title="Sin sugerencias"
                  description="Ejecuta un análisis para ver sugerencias que puedas revisar y aplicar."
                />
              </div>
            ) : (
              <SuggestionReviewPanel onApplyChanges={handleApplyChanges} />
            )}
          </div>
        )}

        {activeTab === 'optimize' && (
          <div className="h-full overflow-hidden">
            <OptimizationPanel />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-full overflow-y-auto p-4">
            <PromptChat />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="h-full overflow-hidden">
            <VersionTimeline />
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="h-full overflow-hidden">
            <KnowledgeBase />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4">
      {icon}
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 max-w-xs">{description}</p>
    </div>
  );
}
