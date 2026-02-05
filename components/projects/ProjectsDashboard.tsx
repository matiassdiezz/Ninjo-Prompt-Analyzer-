'use client';

import { useState, useMemo } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { useAnalysisStore } from '@/store/analysisStore';
import type { Project } from '@/types/prompt';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FolderOpen,
  Plus,
  Search,
  Clock,
  GitBranch,
  Trash2,
  Edit3,
  CheckCircle,
  AlertCircle,
  Archive,
  FileText,
  ArrowLeft,
  LayoutGrid,
  List,
  Filter,
} from 'lucide-react';

interface ProjectsDashboardProps {
  onClose: () => void;
  onSelectProject: (project: Project) => void;
}

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | Project['status'];

export function ProjectsDashboard({ onClose, onSelectProject }: ProjectsDashboardProps) {
  const {
    projects,
    currentProjectId,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    saveVersionToProject,
  } = useKnowledgeStore();
  const { currentPrompt } = useAnalysisStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // Filter and search projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const matchesSearch =
          !searchQuery ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [projects, searchQuery, filterStatus]);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const id = createProject(newProjectName, newProjectDescription, newProjectClient || undefined);
    if (currentPrompt) {
      saveVersionToProject(id, currentPrompt, 'Versión inicial');
    }
    resetForm();
  };

  const handleUpdateProject = () => {
    if (!editingProject || !newProjectName.trim()) return;
    updateProject(editingProject.id, {
      name: newProjectName,
      description: newProjectDescription,
      clientName: newProjectClient || undefined,
    });
    resetForm();
  };

  const handleSelectProject = (project: Project) => {
    // Save current work to current project if exists
    if (currentProjectId && currentPrompt) {
      saveVersionToProject(currentProjectId, currentPrompt, 'Auto-guardado');
    }
    // Just change the project - the useProjectSync hook will load the prompt
    setCurrentProject(project.id);
    onSelectProject(project);
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) {
      deleteProject(projectId);
    }
  };

  const handleEditProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setNewProjectName(project.name);
    setNewProjectClient(project.clientName || '');
    setNewProjectDescription(project.description || '');
    setShowNewForm(true);
  };

  const resetForm = () => {
    setShowNewForm(false);
    setEditingProject(null);
    setNewProjectName('');
    setNewProjectClient('');
    setNewProjectDescription('');
  };

  const getStatusConfig = (status: Project['status']) => {
    switch (status) {
      case 'finalizado':
        return {
          label: 'Finalizado',
          icon: <CheckCircle className="h-3.5 w-3.5" />,
          bg: 'var(--success-subtle)',
          text: 'var(--success)',
          border: 'rgba(63, 185, 80, 0.3)',
        };
      case 'revision_cliente':
        return {
          label: 'Revisión cliente',
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          bg: 'var(--warning-subtle)',
          text: 'var(--warning)',
          border: 'rgba(240, 180, 41, 0.3)',
        };
      case 'archivado':
        return {
          label: 'Archivado',
          icon: <Archive className="h-3.5 w-3.5" />,
          bg: 'var(--bg-elevated)',
          text: 'var(--text-muted)',
          border: 'var(--border-subtle)',
        };
      case 'en_proceso':
      default:
        return {
          label: 'En proceso',
          icon: <Clock className="h-3.5 w-3.5" />,
          bg: 'var(--info-subtle)',
          text: 'var(--info)',
          border: 'rgba(88, 166, 255, 0.3)',
        };
    }
  };

  const statusOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'revision_cliente', label: 'Revisión cliente' },
    { value: 'finalizado', label: 'Finalizado' },
    { value: 'archivado', label: 'Archivado' },
  ];

  // Stats
  const stats = useMemo(() => ({
    total: projects.length,
    enProceso: projects.filter((p) => p.status === 'en_proceso').length,
    revisionCliente: projects.filter((p) => p.status === 'revision_cliente').length,
    finalizado: projects.filter((p) => p.status === 'finalizado').length,
  }), [projects]);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg btn-ghost"
              title="Volver al workspace"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Proyectos
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {stats.total} proyectos en total
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg btn-primary font-medium"
          >
            <Plus className="h-4 w-4" />
            Nuevo Proyecto
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex gap-3 mb-4">
          {[
            { label: 'En proceso', count: stats.enProceso, color: 'var(--info)' },
            { label: 'Revisión', count: stats.revisionCliente, color: 'var(--warning)' },
            { label: 'Finalizado', count: stats.finalizado, color: 'var(--success)' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {stat.label}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {stat.count}
              </span>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar proyectos..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <Filter className="h-4 w-4 mx-2" style={{ color: 'var(--text-muted)' }} />
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value)}
                className="px-3 py-1.5 text-xs rounded-md transition-all"
                style={{
                  background: filterStatus === option.value ? 'var(--accent-subtle)' : 'transparent',
                  color: filterStatus === option.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 rounded-md transition-all"
              style={{
                background: viewMode === 'grid' ? 'var(--accent-subtle)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-md transition-all"
              style={{
                background: viewMode === 'list' ? 'var(--accent-subtle)' : 'transparent',
                color: viewMode === 'list' ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* New/Edit Project Form */}
        {showNewForm && (
          <div
            className="mb-6 p-5 rounded-xl animate-fadeIn"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-accent)',
            }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editingProject ? 'Editar proyecto' : 'Nuevo proyecto'}
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Nombre del proyecto *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Mi nuevo prompt"
                  className="input w-full"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Cliente
                </label>
                <input
                  type="text"
                  value={newProjectClient}
                  onChange={(e) => setNewProjectClient(e.target.value)}
                  placeholder="Nombre del cliente (opcional)"
                  className="input w-full"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Descripción
              </label>
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Descripción breve del proyecto..."
                className="input w-full h-20 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-4 py-2 text-sm rounded-lg btn-ghost">
                Cancelar
              </button>
              <button
                onClick={editingProject ? handleUpdateProject : handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg btn-primary disabled:opacity-50"
              >
                {editingProject ? 'Guardar cambios' : 'Crear proyecto'}
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            >
              <FolderOpen className="h-10 w-10" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {searchQuery || filterStatus !== 'all' ? 'No hay resultados' : 'No hay proyectos'}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
              {searchQuery || filterStatus !== 'all'
                ? 'Intenta con otros filtros'
                : 'Crea tu primer proyecto para comenzar'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg btn-primary font-medium"
              >
                <Plus className="h-4 w-4" />
                Crear proyecto
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => {
              const status = getStatusConfig(project.status);
              const isSelected = project.id === currentProjectId;

              return (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className="group p-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    boxShadow: isSelected ? '0 0 20px rgba(0, 230, 118, 0.15)' : 'none',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: status.bg,
                        color: status.text,
                        border: `1px solid ${status.border}`,
                      }}
                    >
                      {status.icon}
                      {status.label}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleEditProject(e, project)}
                        className="p-1.5 rounded-lg btn-ghost"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        className="p-1.5 rounded-lg hover:bg-[var(--error-subtle)]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3
                    className="text-sm font-semibold mb-1 truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {project.name}
                  </h3>

                  {project.clientName && (
                    <p className="text-xs mb-2 truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {project.clientName}
                    </p>
                  )}

                  {project.description && (
                    <p
                      className="text-xs mb-3 line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <GitBranch className="h-3.5 w-3.5" />
                      {project.versions.length} versiones
                    </div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="h-3.5 w-3.5" />
                      {formatDistanceToNow(project.updatedAt, { addSuffix: true, locale: es })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredProjects.map((project) => {
              const status = getStatusConfig(project.status);
              const isSelected = project.id === currentProjectId;

              return (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className="group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {project.name}
                      </h3>
                      <div
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: status.bg,
                          color: status.text,
                          border: `1px solid ${status.border}`,
                        }}
                      >
                        {status.icon}
                        {status.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {project.clientName && (
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {project.clientName}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {project.versions.length} versiones
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Actualizado {formatDistanceToNow(project.updatedAt, { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEditProject(e, project)}
                      className="p-2 rounded-lg btn-ghost"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="p-2 rounded-lg hover:bg-[var(--error-subtle)]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
