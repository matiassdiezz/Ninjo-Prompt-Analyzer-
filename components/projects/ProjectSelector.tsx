'use client';

import { useState } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { useAnalysisStore } from '@/store/analysisStore';
import type { Project } from '@/types/prompt';
import {
  FolderOpen,
  Plus,
  ChevronDown,
  Check,
  Trash2,
} from 'lucide-react';

export function ProjectSelector() {
  const {
    projects,
    currentProjectId,
    createProject,
    deleteProject,
    setCurrentProject,
    saveVersionToProject,
  } = useKnowledgeStore();
  const { currentPrompt } = useAnalysisStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const id = createProject(newProjectName, '', newProjectClient || undefined);
    if (currentPrompt) {
      saveVersionToProject(id, currentPrompt, 'Versión inicial');
    }
    setNewProjectName('');
    setNewProjectClient('');
    setShowNewForm(false);
    setIsOpen(false);
  };

  const handleSelectProject = (project: Project) => {
    // Save current work to current project if exists
    if (currentProjectId && currentPrompt) {
      saveVersionToProject(currentProjectId, currentPrompt, 'Auto-guardado');
    }

    // Just change the project - the useProjectSync hook will load the prompt
    setCurrentProject(project.id);
    setIsOpen(false);
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este proyecto?')) {
      deleteProject(projectId);
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'deployed':
        return { bg: 'var(--success-subtle)', text: 'var(--success)', border: 'rgba(63, 185, 80, 0.2)' };
      case 'in_progress':
        return { bg: 'var(--info-subtle)', text: 'var(--info)', border: 'rgba(88, 166, 255, 0.2)' };
      case 'archived':
        return { bg: 'var(--bg-elevated)', text: 'var(--text-muted)', border: 'var(--border-subtle)' };
      default:
        return { bg: 'var(--warning-subtle)', text: 'var(--warning)', border: 'rgba(240, 180, 41, 0.2)' };
    }
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-4 py-2 rounded-lg transition-all duration-200"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <FolderOpen className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
        <span className="text-sm max-w-[150px] truncate" style={{ color: 'var(--text-primary)' }}>
          {currentProject?.name || 'Sin proyecto'}
        </span>
        <ChevronDown
          className="h-4 w-4 transition-transform duration-200"
          style={{
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)'
          }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div
            className="absolute top-full right-0 mt-2 w-80 rounded-xl overflow-hidden z-20 animate-slideDown"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {/* New Project Form */}
            {showNewForm ? (
              <div className="p-4" style={{ background: 'var(--accent-subtle)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Nuevo proyecto
                </p>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Nombre del proyecto"
                  className="input w-full mb-2"
                  autoFocus
                />
                <input
                  type="text"
                  value={newProjectClient}
                  onChange={(e) => setNewProjectClient(e.target.value)}
                  placeholder="Cliente (opcional)"
                  className="input w-full mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-lg btn-primary disabled:opacity-50"
                  >
                    Crear
                  </button>
                  <button
                    onClick={() => setShowNewForm(false)}
                    className="px-4 py-2.5 text-sm font-medium rounded-lg btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-[var(--accent-subtle)] border-b"
                style={{ color: 'var(--accent-primary)', borderColor: 'var(--border-subtle)' }}
              >
                <Plus className="h-4 w-4" />
                Nuevo proyecto
              </button>
            )}

            {/* Projects List */}
            {!showNewForm && (
              <div className="max-h-72 overflow-y-auto">
                {projects.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No hay proyectos</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Crea uno para empezar
                    </p>
                  </div>
                ) : (
                  projects.map((project) => {
                    const statusColors = getStatusColor(project.status);
                    return (
                      <div
                        key={project.id}
                        onClick={() => handleSelectProject(project)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 group"
                        style={{
                          background: project.id === currentProjectId ? 'var(--accent-subtle)' : 'transparent',
                          borderLeft: project.id === currentProjectId ? '2px solid var(--accent-primary)' : '2px solid transparent'
                        }}
                      >
                        {project.id === currentProjectId && (
                          <Check className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                        )}
                        <div className={`flex-1 min-w-0 ${project.id !== currentProjectId ? 'ml-6' : ''}`}>
                          <div className="flex items-center gap-2">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {project.name}
                            </p>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={{
                                background: statusColors.bg,
                                color: statusColors.text,
                                border: `1px solid ${statusColors.border}`
                              }}
                            >
                              {project.status === 'deployed' ? 'Deploy' :
                               project.status === 'in_progress' ? 'WIP' :
                               project.status === 'archived' ? 'Arch' : 'Draft'}
                            </span>
                          </div>
                          {project.clientName && (
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                              {project.clientName}
                            </p>
                          )}
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {project.versions.length} versiones
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteProject(e, project.id)}
                          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[var(--error-subtle)]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Trash2 className="h-3.5 w-3.5 hover:text-[var(--error)]" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
