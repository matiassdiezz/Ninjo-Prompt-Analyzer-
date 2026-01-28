'use client';

import { useState } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { ContextCollapsible } from '@/components/editor/ContextCollapsible';
import { NinjoChatPanel } from '@/components/chat/NinjoChatPanel';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { ProjectsDashboard } from '@/components/projects/ProjectsDashboard';
import { DataManager } from '@/components/projects/DataManager';
import { VersionHistoryModal } from '@/components/versions/VersionHistoryModal';
import { NinjoMemory } from '@/components/memory/NinjoMemory';
import { SyncStatus } from '@/components/ui/SyncStatus';
import { useSupabaseInit } from '@/lib/supabase/hooks/useSupabaseInit';
import { useProjectSync } from '@/lib/hooks/useProjectSync';
import {
  AlertCircle,
  GitBranch,
  LayoutGrid,
  Brain,
  Settings,
} from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  const { error } = useAnalysisStore();

  const { getCurrentProject } = useKnowledgeStore();
  const project = getCurrentProject();
  const versionsCount = project?.versions?.length || 0;

  // Initialize Supabase sync
  useSupabaseInit();

  // Sync editor prompt with current project
  useProjectSync();

  // Active view: 'workspace' | 'memory' | 'projects' | 'history'
  type ActiveView = 'workspace' | 'memory' | 'projects' | 'history';
  const [activeView, setActiveView] = useState<ActiveView>('workspace');
  const [showDataManager, setShowDataManager] = useState(false);

  // Get memory entries count for badge
  const { entries } = useKnowledgeStore();
  const memoryCount = entries.filter((e) => e.tags.includes('from-chat')).length;

  return (
    <div className="h-screen flex flex-col noise-overlay" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="flex-shrink-0 glass border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center ">
            <div className="h-24 w-24 relative">
              <Image
                src="/images/LogoNazare.png"
                alt="Ninjo Logo"
                fill
                className="object-contain drop-shadow-lg"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Ninjo
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Nazáre Edition
              </p>
            </div>
          </div>

          {/* Project Selector & Sync Status */}
          <div className="flex items-center gap-3">
            <SyncStatus />

            {/* Tab Buttons */}
            <div
              className="flex items-center gap-1 p-1 rounded-lg"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              {/* Memory Tab */}
              <button
                onClick={() => setActiveView(activeView === 'memory' ? 'workspace' : 'memory')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200"
                style={{
                  background: activeView === 'memory' ? 'var(--accent-glow)' : 'transparent',
                  color: activeView === 'memory' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
                title="Ver memoria de aprendizajes"
              >
                <Brain className="h-4 w-4" />
                <span className="text-sm hidden sm:inline">Memoria</span>
                {memoryCount > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      background: activeView === 'memory' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      color: activeView === 'memory' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {memoryCount}
                  </span>
                )}
              </button>

              {/* History Tab */}
              <button
                onClick={() => setActiveView(activeView === 'history' ? 'workspace' : 'history')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200"
                style={{
                  background: activeView === 'history' ? 'var(--accent-glow)' : 'transparent',
                  color: activeView === 'history' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
                title="Ver historial de versiones"
              >
                <GitBranch className="h-4 w-4" />
                <span className="text-sm hidden sm:inline">Historial</span>
                {versionsCount > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      background: activeView === 'history' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      color: activeView === 'history' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {versionsCount}
                  </span>
                )}
              </button>

              {/* Projects Tab */}
              <button
                onClick={() => setActiveView(activeView === 'projects' ? 'workspace' : 'projects')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200"
                style={{
                  background: activeView === 'projects' ? 'var(--accent-glow)' : 'transparent',
                  color: activeView === 'projects' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
                title="Ver todos los proyectos"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="text-sm hidden sm:inline">Proyectos</span>
              </button>
            </div>

            <ProjectSelector />

            {/* Settings / Data Manager */}
            <div className="relative">
              <button
                onClick={() => setShowDataManager(!showDataManager)}
                className="flex items-center justify-center p-2 rounded-lg transition-all duration-200"
                style={{
                  background: showDataManager ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                  color: showDataManager ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
                title="Gestión de datos"
              >
                <Settings className="h-4 w-4" />
              </button>

              {/* Data Manager Dropdown */}
              {showDataManager && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDataManager(false)}
                  />
                  <div
                    className="absolute top-full right-0 mt-2 w-80 rounded-xl overflow-hidden z-20 animate-slideDown"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  >
                    <DataManager onClose={() => setShowDataManager(false)} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        {activeView === 'memory' && (
          <NinjoMemory onClose={() => setActiveView('workspace')} />
        )}
        {activeView === 'projects' && (
          <ProjectsDashboard
            onClose={() => setActiveView('workspace')}
            onSelectProject={() => setActiveView('workspace')}
          />
        )}
        {activeView === 'history' && (
          <VersionHistoryModal
            isOpen={true}
            onClose={() => setActiveView('workspace')}
          />
        )}
        {(activeView === 'workspace' || activeView === 'history') && (
        <div className="h-full p-4">
        <div className="h-full max-w-[1800px] mx-auto">
          {/* Workspace Layout - 55% Editor / 45% Chat */}
          <div className="h-full flex gap-4">
            {/* Left Column - Editor (55%) */}
            <div className="flex-[55] flex flex-col gap-4 min-w-0">
              {/* Editor */}
              <div className="flex-1 card overflow-hidden min-h-0 glow-border animate-fadeIn">
                <EditorPanel />
              </div>

              {/* Context (Collapsible) */}
              <div className="flex-shrink-0 animate-slideUp" style={{ animationDelay: '0.1s' }}>
                <ContextCollapsible />
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex-shrink-0 rounded-xl p-4 flex items-start gap-3 animate-slideUp"
                  style={{
                    background: 'var(--error-subtle)',
                    border: '1px solid rgba(248, 81, 73, 0.2)'
                  }}
                >
                  <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--error)' }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--error)' }}>Error</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Ninjo Chat (45%) */}
            <div className="flex-[45] flex-shrink-0 card overflow-hidden animate-slideUp" style={{ animationDelay: '0.05s' }}>
              <NinjoChatPanel />
            </div>
          </div>
        </div>
        </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="flex-shrink-0 border-t"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="max-w-[1800px] mx-auto px-6 py-2.5">
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Powered by <span style={{ color: 'var(--accent-primary)' }}>Claude Sonnet 4.5</span>
          </p>
        </div>
      </footer>

    </div>
  );
}
