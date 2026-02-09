'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';

/**
 * Hook that synchronizes the editor state with the current agent.
 *
 * Replaces useProjectSync. Tracks both currentProjectId and currentAgentId.
 *
 * - When switching agents: saves current data to old agent, loads new agent data
 * - While editing: auto-saves prompt, annotations, versions, and chat messages to the agent
 * - All agent-specific data (prompt, versions, annotations, chat) stays with the agent
 */
export function useAgentSync() {
  const {
    currentPrompt,
    promptHistory,
    annotations,
    chatMessages,
    loadAgentData,
    getAgentData,
    clearAgentData,
  } = useAnalysisStore();

  const {
    currentProjectId,
    projects,
    updateAgent,
    getCurrentAgent,
  } = useKnowledgeStore();

  // Get current agent ID from current project
  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentAgentId = currentProject?.currentAgentId || null;

  // Track previous IDs to detect changes
  const prevProjectIdRef = useRef<string | null>(null);
  const prevAgentIdRef = useRef<string | null>(null);
  // Track if we're in the middle of loading (to avoid save loops)
  const isLoadingRef = useRef(false);
  // Debounce timer for auto-saving
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track if this is the first mount
  const isFirstMountRef = useRef(true);

  /**
   * Save current editor state to the specified agent
   */
  const saveToAgent = useCallback((projectId: string, agentId: string) => {
    if (!projectId || !agentId || isLoadingRef.current) return;

    const data = getAgentData();

    updateAgent(projectId, agentId, {
      currentPrompt: data.prompt,
      versions: data.versions,
      annotations: data.annotations,
      chatMessages: data.chatMessages,
    });
  }, [getAgentData, updateAgent]);

  /**
   * Load agent data into the editor
   */
  const loadFromAgent = useCallback((projectId: string, agentId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const agent = project.agents.find(a => a.id === agentId);
    if (!agent) return;

    isLoadingRef.current = true;

    loadAgentData({
      prompt: agent.currentPrompt || '',
      versions: agent.versions || [],
      annotations: agent.annotations || [],
      chatMessages: agent.chatMessages || [],
    });

    // Reset loading flag after state is settled
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, [projects, loadAgentData]);

  /**
   * Handle project/agent change
   */
  useEffect(() => {
    // Skip on first mount if there's existing data in analysisStore
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;

      if (currentProjectId && currentAgentId && currentPrompt) {
        prevProjectIdRef.current = currentProjectId;
        prevAgentIdRef.current = currentAgentId;
        return;
      }
    }

    const prevProjectId = prevProjectIdRef.current;
    const prevAgentId = prevAgentIdRef.current;

    // If neither project nor agent changed, skip
    if (prevProjectId === currentProjectId && prevAgentId === currentAgentId) {
      return;
    }

    // Clear any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // Save current state to the previous agent (if any)
    if (prevProjectId && prevAgentId && !isLoadingRef.current) {
      saveToAgent(prevProjectId, prevAgentId);
    }

    // Update the refs
    prevProjectIdRef.current = currentProjectId;
    prevAgentIdRef.current = currentAgentId;

    // Load the new agent (or clear if no project/agent)
    if (currentProjectId && currentAgentId) {
      loadFromAgent(currentProjectId, currentAgentId);
    } else {
      clearAgentData();
    }
  }, [currentProjectId, currentAgentId, saveToAgent, loadFromAgent, clearAgentData, currentPrompt]);

  /**
   * Auto-save changes to current agent (debounced)
   */
  useEffect(() => {
    if (isLoadingRef.current) return;
    if (!currentProjectId || !currentAgentId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveToAgent(currentProjectId, currentAgentId);
    }, 1500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [currentPrompt, promptHistory, annotations, chatMessages, currentProjectId, currentAgentId, saveToAgent]);

  /**
   * Save before page unload
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentProjectId && currentAgentId && !isLoadingRef.current) {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        saveToAgent(currentProjectId, currentAgentId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentProjectId, currentAgentId, saveToAgent]);

  /**
   * Force save function (for manual trigger)
   */
  const forceSave = useCallback(() => {
    if (!currentProjectId || !currentAgentId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    saveToAgent(currentProjectId, currentAgentId);
  }, [currentProjectId, currentAgentId, saveToAgent]);

  return { forceSave };
}
