'use client';

import { useState } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { useAnalysisStore } from '@/store/analysisStore';
import type { Project } from '@/types/prompt';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToastStore } from '@/store/toastStore';
import {
  FolderOpen,
  Plus,
  ChevronDown,
  Check,
  Trash2,
  MoreVertical,
} from 'lucide-react';

export function ProjectSelector() {
  const {
    projects,
    currentProjectId,
    createProject,
    deleteProject,
    setCurrentProject,
    saveVersionToProject,
    updateProject,
  } = useKnowledgeStore();
  const { currentPrompt } = useAnalysisStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { addToast } = useToastStore();
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
    addToast('Proyecto creado', 'success');
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
    setConfirmDeleteId(projectId);
  };

  const handleStatusChange = (newStatus: Project['status']) => {
    if (currentProjectId) {
      updateProject(currentProjectId, { status: newStatus });
      setShowStatusMenu(false);
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'finalizado':
        return { bg: 'var(--success-subtle)', text: 'var(--success)', border: 'rgba(63, 185, 80, 0.2)' };
      case 'en_proceso':
        return { bg: 'var(--info-subtle)', text: 'var(--info)', border: 'rgba(88, 166, 255, 0.2)' };
      case 'revision_cliente':
        return { bg: 'var(--warning-subtle)', text: 'var(--warning)', border: 'rgba(240, 180, 41, 0.2)' };
      case 'archivado':
        return { bg: 'var(--bg-elevated)', text: 'var(--text-muted)', border: 'var(--border-subtle)' };
      default:
        return { bg: 'var(--warning-subtle)', text: 'var(--warning)', border: 'rgba(240, 180, 41, 0.2)' };
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Status Selector */}
      {currentProject && (
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: getStatusColor(currentProject.status).bg,
              color: getStatusColor(currentProject.status).text,
              border: `1px solid ${getStatusColor(currentProject.status).border}`
            }}
          >
            {currentProject.status === 'finalizado' ? 'Finalizado' :
             currentProject.status === 'en_proceso' ? 'En proceso' :
             currentProject.status === 'revision_cliente' ? 'Revisión' :
             currentProject.status === 'archivado' ? 'Archivado' : currentProject.status}
            <ChevronDown className="h-3 w-3" />
          </button>

          {showStatusMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowStatusMenu(false)}
              />
              <div
                className="absolute top-full right-0 mt-1 rounded-lg overflow-hidden z-20 animate-fadeIn"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: '140px'
                }}
              >
                {(['en_proceso', 'revision_cliente', 'finalizado', 'archivado'] as Project['status'][]).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all duration-200 hover:bg-[var(--bg-tertiary)]"
                    style={{
                      color: currentProject.status === status ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      background: currentProject.status === status ? 'var(--accent-subtle)' : 'transparent'
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: getStatusColor(status).text }}
                    />
                    {status === 'finalizado' ? 'Finalizado' :
                     status === 'en_proceso' ? 'En proceso' :
                     status === 'revision_cliente' ? 'Revisión cliente' :
                     status === 'archivado' ? 'Archivado' : status}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Project Selector */}
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
                            {project.status === 'finalizado' ? 'Finalizado' :
                             project.status === 'en_proceso' ? 'En proceso' :
                             project.status === 'revision_cliente' ? 'Revisión' :
                             project.status === 'archivado' ? 'Archivado' : project.status}
                            </span>
                          </div>
                          {project.clientName && (
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                              {project.clientName}
                            </p>
                          )}
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {project.agents.length} agentes
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

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onConfirm={() => {
          if (confirmDeleteId) {
            deleteProject(confirmDeleteId);
            addToast('Proyecto eliminado', 'success');
          }
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
        title="Eliminar proyecto"
        message="¿Eliminar este proyecto? Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
}
