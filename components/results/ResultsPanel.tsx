'use client';

import { useState } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { AnalysisResults } from '@/components/analysis/AnalysisResults';
import { PromptChat } from '@/components/analysis/PromptChat';
import { VersionTimeline } from '@/components/review/VersionTimeline';
import {
  BarChart3,
  MessageCircle,
  GitBranch,
  Sparkles,
} from 'lucide-react';

type TabType = 'summary' | 'chat' | 'history';

interface ResultsPanelProps {
  isStreaming?: boolean;
}

export function ResultsPanel({ isStreaming = false }: ResultsPanelProps) {
  const { currentPrompt } = useAnalysisStore();
  const { getCurrentProject } = useKnowledgeStore();
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  const project = getCurrentProject();

  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'summary',
      label: 'Resumen',
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageCircle className="h-4 w-4" />,
    },
    {
      id: 'history',
      label: 'Historial',
      icon: <GitBranch className="h-4 w-4" />,
      badge: project?.versions.length,
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      {/* Tab Header */}
      <div
        className="flex border-b overflow-x-auto scrollbar-hide"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium transition-all duration-200 relative whitespace-nowrap hover:bg-[var(--accent-subtle)]"
            style={{
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className="px-1.5 py-0.5 text-[10px] rounded-full font-semibold"
                style={{
                  background: activeTab === tab.id ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                  color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                  border: `1px solid ${activeTab === tab.id ? 'var(--border-accent)' : 'var(--border-subtle)'}`
                }}
              >
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                style={{ background: 'var(--accent-primary)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'summary' && (
          <div className="h-full overflow-y-auto p-4">
            {!currentPrompt.trim() ? (
              <EmptyState
                icon={<Sparkles className="h-12 w-12" style={{ color: 'var(--text-muted)' }} />}
                title="Listo para analizar"
                description="Pega tu prompt en el editor y haz click en Analizar para comenzar."
              />
            ) : (
              <AnalysisResults />
            )}
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
    <div className="flex flex-col items-center justify-center text-center px-4 py-12">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-sm max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
        {description}
      </p>
    </div>
  );
}
