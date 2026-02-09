'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';

/**
 * Hook that synchronizes the editor state with the current project.
 *
 * This hook ensures that:
 * - When switching projects: saves current data to old project, loads new project data
 * - While editing: auto-saves prompt, annotations, versions, and chat messages to the project
 * - All project-specific data (prompt, versions, annotations, chat) stays with the project
 */
export function useProjectSync() {
  const {
    currentPrompt,
    promptHistory,
    annotations,
    chatMessages,
    loadProjectData,
    getProjectData,
    clearProjectData,
  } = useAnalysisStore();

  const {
    currentProjectId,
    projects,
    updateProject,
    getCurrentProject,
  } = useKnowledgeStore();

  // Track previous project ID to detect changes
  const prevProjectIdRef = useRef<string | null>(null);
  // Track if we're in the middle of loading a project (to avoid save loops)
  const isLoadingRef = useRef(false);
  // Debounce timer for auto-saving
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track if this is the first mount
  const isFirstMountRef = useRef(true);

  /**
   * Save current editor state to the specified project
   */
  const saveToProject = useCallback((projectId: string) => {
    if (!projectId || isLoadingRef.current) return;

    const project = projects.find(p => p.id === projectId);
    if (!project?.currentAgentId) return;

    const data = getProjectData();
    const { updateAgent } = useKnowledgeStore.getState();

    updateAgent(projectId, project.currentAgentId, {
      currentPrompt: data.prompt,
      versions: data.versions,
      annotations: data.annotations,
      chatMessages: data.chatMessages,
    });
  }, [getProjectData, projects]);

  /**
   * Load project data into the editor
   */
  const loadFromProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    isLoadingRef.current = true;

    // Load data from current agent within the project
    const agent = project.agents?.find(a => a.id === project.currentAgentId);
    loadProjectData({
      prompt: agent?.currentPrompt || '',
      versions: agent?.versions || [],
      annotations: agent?.annotations || [],
      chatMessages: agent?.chatMessages || [],
    });

    // Reset loading flag after state is settled
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, [projects, loadProjectData]);

  /**
   * Handle project change
   */
  useEffect(() => {
    // Skip on first mount if there's existing data in analysisStore
    // This preserves data when the page reloads
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;

      // If we have a current project, sync the existing editor state to it
      if (currentProjectId && currentPrompt) {
        prevProjectIdRef.current = currentProjectId;
        // Don't load from project on first mount if editor already has content
        // This preserves the user's current work
        return;
      }
    }

    const prevProjectId = prevProjectIdRef.current;

    // If project hasn't changed, skip
    if (prevProjectId === currentProjectId) {
      return;
    }

    // Clear any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // Save current state to the previous project (if any)
    if (prevProjectId && !isLoadingRef.current) {
      saveToProject(prevProjectId);
    }

    // Update the ref
    prevProjectIdRef.current = currentProjectId;

    // Load the new project (or clear if no project)
    if (currentProjectId) {
      loadFromProject(currentProjectId);
    } else {
      clearProjectData();
    }
  }, [currentProjectId, saveToProject, loadFromProject, clearProjectData, currentPrompt]);

  /**
   * Auto-save changes to current project (debounced)
   */
  useEffect(() => {
    // Don't save while loading
    if (isLoadingRef.current) return;
    // Don't save if no project selected
    if (!currentProjectId) return;

    // Clear previous timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Debounce save (1.5 seconds)
    saveTimerRef.current = setTimeout(() => {
      saveToProject(currentProjectId);
    }, 1500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [currentPrompt, promptHistory, annotations, chatMessages, currentProjectId, saveToProject]);

  /**
   * Save before page unload
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentProjectId && !isLoadingRef.current) {
        // Clear timer and save immediately
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        saveToProject(currentProjectId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentProjectId, saveToProject]);

  /**
   * Force save function (for manual trigger)
   */
  const forceSave = useCallback(() => {
    if (!currentProjectId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    saveToProject(currentProjectId);
  }, [currentProjectId, saveToProject]);

  return { forceSave };
}
