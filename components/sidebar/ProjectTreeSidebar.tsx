'use client';

import { useState, useMemo } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { useToastStore } from '@/store/toastStore';
import type { Project, Agent } from '@/types/prompt';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Brain,
  Settings,
  LayoutGrid,
  Instagram,
  MessageCircle,
  Music,
  Globe,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  Trash2,
  Pencil,
} from 'lucide-react';
import Image from 'next/image';

type ActiveView = 'workspace' | 'memory' | 'projects' | 'history' | 'flowchart' | 'simulator';

interface ProjectTreeSidebarProps {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  onCreateProject: () => void;
  onCreateAgent: (projectId: string) => void;
  onEditAgent: (projectId: string, agent: Agent) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const CHANNEL_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  instagram: { icon: Instagram, color: '#E4405F' },
  whatsapp: { icon: MessageCircle, color: '#25D366' },
  tiktok: { icon: Music, color: '#ffffff' },
  web: { icon: Globe, color: '#58a6ff' },
};

function getChannelIcon(channelType: string) {
  return CHANNEL_ICONS[channelType.toLowerCase()] || { icon: Sparkles, color: 'var(--text-secondary)' };
}

export function ProjectTreeSidebar({
  activeView,
  onChangeView,
  onCreateProject,
  onCreateAgent,
  onEditAgent,
  collapsed,
  onToggleCollapse,
}: ProjectTreeSidebarProps) {
  const {
    projects,
    currentProjectId,
    setCurrentProject,
    setCurrentAgent,
    deleteAgent,
    getCurrentAgent,
  } = useKnowledgeStore();
  const { addToast } = useToastStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => {
    // Start with current project expanded
    return new Set(currentProjectId ? [currentProjectId] : []);
  });
  const [agentMenuId, setAgentMenuId] = useState<string | null>(null);

  const currentAgent = getCurrentAgent();

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.clientName?.toLowerCase().includes(q) ||
      p.agents.some(a => a.name.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const toggleExpand = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleSelectAgent = (project: Project, agent: Agent) => {
    setCurrentProject(project.id);
    setCurrentAgent(project.id, agent.id);
    onChangeView('workspace');
    // Ensure project is expanded
    setExpandedProjects(prev => new Set(prev).add(project.id));
  };

  const handleDeleteAgent = (projectId: string, agentId: string, agentName: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || project.agents.length <= 1) {
      addToast('No puedes eliminar el unico agente', 'error');
      return;
    }
    deleteAgent(projectId, agentId);
    addToast(`Agente "${agentName}" eliminado`, 'success');
    setAgentMenuId(null);
  };

  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center py-3 gap-2 h-full"
        style={{
          width: 60,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
          title="Expandir sidebar"
        >
          <PanelLeft className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>

        <div className="h-8 w-8 relative mt-1">
          <Image src="/images/LogoNazare.png" alt="Ninjo" width={32} height={32} />
        </div>

        <div className="flex-1" />

        <button
          onClick={() => onChangeView(activeView === 'memory' ? 'workspace' : 'memory')}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: activeView === 'memory' ? 'var(--accent-glow)' : 'transparent',
            color: activeView === 'memory' ? 'var(--accent-primary)' : 'var(--text-secondary)',
          }}
          title="Memoria"
        >
          <Brain className="h-4 w-4" />
        </button>

        <button
          onClick={() => onChangeView(activeView === 'projects' ? 'workspace' : 'projects')}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: activeView === 'projects' ? 'var(--accent-glow)' : 'transparent',
            color: activeView === 'projects' ? 'var(--accent-primary)' : 'var(--text-secondary)',
          }}
          title="Proyectos"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>

        <button
          onClick={onCreateProject}
          className="p-2 rounded-lg transition-colors hover:bg-[var(--accent-glow)]"
          style={{ color: 'var(--accent-primary)' }}
          title="Nuevo proyecto"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: 280,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 relative flex-shrink-0">
            <Image src="/images/LogoNazare.png" alt="Ninjo" width={28} height={28} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Ninjo
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-tertiary)]"
          title="Colapsar sidebar"
        >
          <PanelLeftClose className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Project Tree */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1">
        {filteredProjects.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? 'Sin resultados' : 'Sin proyectos'}
            </p>
          </div>
        ) : (
          filteredProjects.map(project => {
            const isExpanded = expandedProjects.has(project.id);
            const isActive = project.id === currentProjectId;

            return (
              <div key={project.id} className="mb-0.5">
                {/* Project Row */}
                <button
                  onClick={() => toggleExpand(project.id)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors group"
                  style={{
                    background: isActive ? 'var(--accent-subtle)' : 'transparent',
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  )}
                  <span
                    className="text-xs font-medium truncate flex-1"
                    style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  >
                    {project.name}
                  </span>
                  {project.clientName && (
                    <span className="text-[10px] truncate max-w-[60px]" style={{ color: 'var(--text-muted)' }}>
                      {project.clientName}
                    </span>
                  )}
                </button>

                {/* Agents */}
                {isExpanded && (
                  <div className="ml-3 mt-0.5">
                    {project.agents.map(agent => {
                      const { icon: ChannelIcon, color: channelColor } = getChannelIcon(agent.channelType);
                      const isAgentActive = isActive && agent.id === project.currentAgentId;

                      return (
                        <div key={agent.id} className="relative group">
                          <div className="flex items-center">
                            <button
                              onClick={() => handleSelectAgent(project, agent)}
                              className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors min-w-0"
                              style={{
                                background: isAgentActive ? 'var(--accent-glow)' : 'transparent',
                              }}
                            >
                              <ChannelIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: channelColor }} />
                              <span
                                className="text-xs truncate flex-1"
                                style={{
                                  color: isAgentActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                  fontWeight: isAgentActive ? 500 : 400,
                                }}
                              >
                                {agent.name}
                              </span>
                              {isAgentActive && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: 'var(--accent-primary)' }}
                                />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAgentMenuId(agentMenuId === agent.id ? null : agent.id);
                              }}
                              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg-tertiary)] flex-shrink-0"
                            >
                              <MoreHorizontal className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                            </button>
                          </div>

                          {/* Agent context menu */}
                          {agentMenuId === agent.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setAgentMenuId(null)} />
                              <div
                                className="absolute right-0 top-full mt-1 z-40 rounded-lg overflow-hidden py-1"
                                style={{
                                  background: 'var(--bg-elevated)',
                                  border: '1px solid var(--border-default)',
                                  boxShadow: 'var(--shadow-lg)',
                                  minWidth: 140,
                                }}
                              >
                                <button
                                  onClick={() => {
                                    onEditAgent(project.id, agent);
                                    setAgentMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--bg-tertiary)]"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  <Pencil className="h-3 w-3" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteAgent(project.id, agent.id, agent.name)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--error-subtle)]"
                                  style={{ color: 'var(--error)' }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Eliminar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Add agent button */}
                    <button
                      onClick={() => onCreateAgent(project.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-[var(--bg-tertiary)]"
                    >
                      <Plus className="h-3 w-3" style={{ color: 'var(--accent-primary)' }} />
                      <span className="text-[11px]" style={{ color: 'var(--accent-primary)' }}>
                        Agregar agente
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Links */}
      <div className="border-t px-2 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={() => onChangeView(activeView === 'memory' ? 'workspace' : 'memory')}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors"
          style={{
            background: activeView === 'memory' ? 'var(--accent-glow)' : 'transparent',
            color: activeView === 'memory' ? 'var(--accent-primary)' : 'var(--text-secondary)',
          }}
        >
          <Brain className="h-4 w-4" />
          <span className="text-xs font-medium">Memoria</span>
        </button>

        <button
          onClick={() => onChangeView(activeView === 'projects' ? 'workspace' : 'projects')}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors"
          style={{
            background: activeView === 'projects' ? 'var(--accent-glow)' : 'transparent',
            color: activeView === 'projects' ? 'var(--accent-primary)' : 'var(--text-secondary)',
          }}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="text-xs font-medium">Proyectos</span>
        </button>
      </div>

      {/* Create Project Button */}
      <div className="px-3 pb-3">
        <button
          onClick={onCreateProject}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: 'var(--accent-glow)',
            color: 'var(--accent-primary)',
            border: '1px solid var(--accent-primary)',
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo Proyecto
        </button>
      </div>
    </div>
  );
}
