'use client';

import { useState } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { DataManager } from './DataManager';
import type { Project } from '@/types/prompt';
import {
  FolderOpen,
  Plus,
  ChevronDown,
  Check,
  Trash2,
  Edit,
  X,
  Settings,
} from 'lucide-react';

export function ProjectSelector() {
  const {
    projects,
    currentProjectId,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    saveVersionToProject,
  } = useKnowledgeStore();
  const { currentPrompt, setPrompt } = useAnalysisStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);
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

    setCurrentProject(project.id);
    setPrompt(project.currentPrompt);
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
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'archived':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <FolderOpen className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-700 max-w-[150px] truncate">
          {currentProject?.name || 'Sin proyecto'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
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
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            {/* Data Manager */}
            {showDataManager ? (
              <DataManager onClose={() => setShowDataManager(false)} />
            ) : showNewForm ? (
              <div className="p-3 border-b border-gray-200 bg-blue-50">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Nuevo proyecto
                </p>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Nombre del proyecto"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded mb-2 focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <input
                  type="text"
                  value={newProjectClient}
                  onChange={(e) => setNewProjectClient(e.target.value)}
                  placeholder="Cliente (opcional)"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded mb-2 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Crear
                  </button>
                  <button
                    onClick={() => setShowNewForm(false)}
                    className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setShowNewForm(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo
                </button>
                <div className="w-px bg-gray-200" />
                <button
                  onClick={() => setShowDataManager(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Exportar / Importar"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Projects List */}
            <div className="max-h-64 overflow-y-auto">
              {projects.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No hay proyectos</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Crea uno para empezar
                  </p>
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                      project.id === currentProjectId
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {project.id === currentProjectId && (
                      <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    )}
                    <div className={`flex-1 min-w-0 ${project.id !== currentProjectId ? 'ml-6' : ''}`}>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {project.name}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(project.status)}`}>
                          {project.status === 'deployed' ? 'Deploy' :
                           project.status === 'in_progress' ? 'WIP' :
                           project.status === 'archived' ? 'Arch' : 'Draft'}
                        </span>
                      </div>
                      {project.clientName && (
                        <p className="text-xs text-gray-500 truncate">
                          {project.clientName}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400">
                        {project.versions.length} versiones
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
