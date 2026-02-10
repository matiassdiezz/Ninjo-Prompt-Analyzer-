'use client';

import { useState, useEffect } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { ContextCollapsible } from '@/components/editor/ContextCollapsible';
import { NinjoChatPanel } from '@/components/chat/NinjoChatPanel';
import { ProjectsDashboard } from '@/components/projects/ProjectsDashboard';
import { DataManager } from '@/components/projects/DataManager';
import { VersionHistoryModal } from '@/components/versions/VersionHistoryModal';
import { NinjoMemory } from '@/components/memory/NinjoMemory';
import { FlowchartView } from '@/components/flowchart/FlowchartView';

import { ProjectTreeSidebar } from '@/components/sidebar/ProjectTreeSidebar';
import { AgentModal } from '@/components/agents/AgentModal';
import { SyncStatus } from '@/components/ui/SyncStatus';
import { ToastContainer, NewLearningToast, GlobalToastContainer } from '@/components/ui/Toast';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ResizablePanels } from '@/components/ui/ResizablePanels';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { useSupabaseInit } from '@/lib/supabase/hooks/useSupabaseInit';
import { useAgentSync } from '@/lib/hooks/useAgentSync';
import type { KnowledgeEntry, Agent } from '@/types/prompt';
import { WelcomeModal } from '@/components/ui/WelcomeModal';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  AlertCircle,
  GitBranch,
  Settings,
  Workflow,
  FileText,
  Instagram,
  MessageCircle,
  Music,
  Globe,
  Sparkles,
  Loader2,
  LayoutGrid,
  FolderOpen,
} from 'lucide-react';
import Image from 'next/image';

type ActiveView = 'workspace' | 'memory' | 'projects' | 'history' | 'flowchart';

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  whatsapp: MessageCircle,
  tiktok: Music,
  web: Globe,
};

export default function Home() {
  const { error } = useAnalysisStore();

  const {
    getCurrentProject,
    getCurrentAgent,
    currentProjectId,
    createProject,
    setCurrentProject,
    setCurrentAgent,
    sync,
    clearSyncError,
  } = useKnowledgeStore();

  const project = getCurrentProject();
  const agent = getCurrentAgent();
  const versionsCount = agent?.versions?.length || 0;

  // Initialize Supabase sync
  const { isLoading: isSupabaseLoading } = useSupabaseInit();

  // Sync editor prompt with current agent
  useAgentSync();

  // Track mounted state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for new learnings from other devices (Realtime)
  useEffect(() => {
    const handleNewLearning = (event: CustomEvent<KnowledgeEntry>) => {
      const newLearning = event.detail;
      setNewLearningToasts(prev => [...prev, newLearning]);

      setTimeout(() => {
        setNewLearningToasts(prev => prev.filter(l => l.id !== newLearning.id));
      }, 8000);
    };

    window.addEventListener('new-learning', handleNewLearning as EventListener);
    return () => window.removeEventListener('new-learning', handleNewLearning as EventListener);
  }, []);

  const [activeView, setActiveView] = useState<ActiveView>('workspace');
  const [showDataManager, setShowDataManager] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Agent modal state
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [agentModalProjectId, setAgentModalProjectId] = useState('');
  const [agentModalEdit, setAgentModalEdit] = useState<Agent | null>(null);

  // Welcome modal state
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (mounted && !localStorage.getItem('ninjo-welcome-dismissed')) {
      setShowWelcome(true);
    }
  }, [mounted]);

  // Toast notifications for new learnings
  const [newLearningToasts, setNewLearningToasts] = useState<KnowledgeEntry[]>([]);

  // Keyboard shortcut: "?" to open shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowShortcutsModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateProject = () => {
    const id = createProject('Nuevo Proyecto', '');
    setCurrentProject(id);
    setAgentModalProjectId(id);
    setAgentModalEdit(null);
    setAgentModalOpen(true);
    setActiveView('workspace');
  };

  const handleCreateAgent = (projectId: string) => {
    setAgentModalProjectId(projectId);
    setAgentModalEdit(null);
    setAgentModalOpen(true);
  };

  const handleEditAgent = (projectId: string, agentToEdit: Agent) => {
    setAgentModalProjectId(projectId);
    setAgentModalEdit(agentToEdit);
    setAgentModalOpen(true);
  };

  // Agent tabs (only show when an agent is selected)
  const agentTabs: { id: ActiveView; label: string; icon: React.ElementType }[] = [
    { id: 'workspace', label: 'Prompt', icon: FileText },
    { id: 'flowchart', label: 'Flujo', icon: Workflow },

    { id: 'history', label: 'Historial', icon: GitBranch },
  ];

  const ChannelIcon = agent ? (CHANNEL_ICONS[agent.channelType.toLowerCase()] || Sparkles) : null;

  // Loading state
  if (!mounted || isSupabaseLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse-slow">
            <Image src="/images/LogoNazare.png" alt="Nazare" width={48} height={48} />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex noise-overlay" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <ProjectTreeSidebar
        activeView={activeView}
        onChangeView={setActiveView}
        onCreateProject={handleCreateProject}
        onCreateAgent={handleCreateAgent}
        onEditAgent={handleEditAgent}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Slim Header */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Agent Bar */}
          <div className="flex items-center gap-3">
            {mounted && agent && ChannelIcon && (
              <>
                <div className="flex items-center gap-2">
                  <ChannelIcon className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                  <button
                    onClick={() => setActiveView('projects')}
                    className="text-sm transition-colors hover:underline"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {project?.name || 'Proyecto'}
                  </button>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {agent.name}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {agent.channelType}
                  </span>
                </div>

                {/* Agent View Tabs */}
                <div
                  className="flex items-center gap-0.5 p-0.5 rounded-lg ml-2"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  {agentTabs.map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = activeView === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveView(tab.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-xs"
                        style={{
                          background: isActive ? 'var(--accent-glow)' : 'transparent',
                          color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        <TabIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        {tab.id === 'history' && mounted && versionsCount > 0 && (
                          <span
                            className="text-[9px] px-1 py-0 rounded-full font-medium"
                            style={{
                              background: isActive ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                              color: isActive ? 'var(--bg-primary)' : 'var(--text-muted)',
                            }}
                          >
                            {versionsCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {mounted && !agent && currentProjectId && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveView('projects')}
                  className="text-sm transition-colors hover:underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {project?.name || 'Proyecto'}
                </button>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Selecciona un agente
                </span>
              </div>
            )}

            {mounted && !currentProjectId && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Selecciona un proyecto en el sidebar
              </span>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <SyncStatus />
            <ThemeToggle />

            {/* Settings / Data Manager */}
            <div className="relative">
              <Tooltip content="Gestion de datos" position="bottom">
                <button
                  onClick={() => setShowDataManager(!showDataManager)}
                  className="flex items-center justify-center p-2 rounded-lg transition-all duration-200"
                  style={{
                    background: showDataManager ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                    color: showDataManager ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <Settings className="h-4 w-4" />
                </button>
              </Tooltip>

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
        </header>

        {/* Sync error banner */}
        {sync.syncError && (
          <div
            className="flex items-center gap-2 px-4 py-2 text-xs animate-slideDown"
            style={{
              background: 'var(--error-subtle)',
              borderBottom: '1px solid rgba(248, 81, 73, 0.2)',
            }}
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--error)' }} />
            <span style={{ color: 'var(--error)' }}>
              Error de sincronizacion: {sync.syncError}
            </span>
            <button
              onClick={clearSyncError}
              className="ml-auto text-xs underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-0">
          {activeView === 'memory' && (
            <div className="h-full animate-viewEnter">
              <NinjoMemory onClose={() => setActiveView('workspace')} />
            </div>
          )}
          {activeView === 'projects' && (
            <div className="h-full animate-viewEnter">
              <ProjectsDashboard
                onClose={() => setActiveView('workspace')}
                onSelectProject={() => setActiveView('workspace')}
              />
            </div>
          )}
          {activeView === 'history' && (
            <div className="h-full animate-viewEnter">
              <VersionHistoryModal
                isOpen={true}
                onClose={() => setActiveView('workspace')}
              />
            </div>
          )}
          {activeView === 'flowchart' && (
            <div className="h-full animate-viewEnter">
              <FlowchartView onClose={() => setActiveView('workspace')} />
            </div>
          )}

          {(activeView === 'workspace' || activeView === 'history') && (
            <div className="h-full p-4">
              {/* Empty state when no project selected */}
              {!currentProjectId ? (
                <div className="h-full flex items-center justify-center animate-fadeIn">
                  <div className="text-center max-w-sm">
                    <div
                      className="mx-auto mb-4 h-14 w-14 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--accent-glow)' }}
                    >
                      <FolderOpen className="h-7 w-7" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      Selecciona o crea un proyecto para empezar
                    </h3>
                    <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
                      Usa el sidebar para navegar entre proyectos y agentes
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setActiveView('projects')}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg transition-colors"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Ver proyectos
                      </button>
                      <button
                        onClick={handleCreateProject}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors"
                        style={{
                          background: 'var(--accent-primary)',
                          color: 'var(--bg-primary)',
                        }}
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        Nuevo proyecto
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <ResizablePanels
                  defaultRatio={0.55}
                  minRatio={0.3}
                  maxRatio={0.8}
                  storageKey="ninjo-editor-chat-ratio"
                >
                  <div className="flex flex-col gap-4 min-w-0 h-full">
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
                          border: '1px solid rgba(248, 81, 73, 0.2)',
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

                  <div className="card overflow-hidden h-full animate-slideUp" style={{ animationDelay: '0.05s' }}>
                    <NinjoChatPanel />
                  </div>
                </ResizablePanels>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer>
        {newLearningToasts.map((learning) => (
          <NewLearningToast
            key={learning.id}
            learning={learning}
            onClose={() => setNewLearningToasts(prev => prev.filter(l => l.id !== learning.id))}
          />
        ))}
      </ToastContainer>

      {/* Global Toast System */}
      <GlobalToastContainer />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Agent Modal */}
      <AgentModal
        isOpen={agentModalOpen}
        onClose={() => setAgentModalOpen(false)}
        projectId={agentModalProjectId}
        editAgent={agentModalEdit}
      />

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
