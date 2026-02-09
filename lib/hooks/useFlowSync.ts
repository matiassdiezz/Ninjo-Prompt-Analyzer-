'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useFlowStore } from '@/store/flowStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { parseFlowFromPrompt } from '@/lib/utils/flowParser';
import { isFlowEmpty, insertAsciiFlowInPrompt } from '@/lib/utils/flowSerializer';
import { detectAsciiFlow, parseAsciiFlow, getAsciiFlowBounds } from '@/lib/utils/asciiFlowParser';
import { detectTextFlows } from '@/lib/utils/textFlowDetector';
import { useToastStore } from '@/store/toastStore';

/**
 * Hook that synchronizes the flow store with agent.flowData.
 *
 * - Flow data is persisted in agent.flowData (NOT in the prompt text)
 * - On agent switch: loads flowData from agent, with fallback to <flow> tag / text flows / ASCII detection
 * - Auto-saves flow changes to agent.flowData (debounced)
 * - Provides insertAsciiInPrompt() to manually insert readable ASCII art into the prompt
 * - Provides convertTextFlowToVisual() to extract text flows via LLM
 */
export function useFlowSync() {
  const { currentPrompt, setPrompt } = useAnalysisStore();
  const {
    nodes,
    edges,
    hasUnsavedChanges,
    setFlowData,
    markAsSaved,
    getFlowData,
    setAsciiDetected,
    clearAsciiDetection,
    setTextFlowsDetected,
    clearTextFlowDetection,
    setExtractingFlow,
    markAsChanged,
  } = useFlowStore();

  const {
    currentProjectId,
    projects,
    updateAgent,
  } = useKnowledgeStore();

  // Derive current agent ID
  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentAgentId = currentProject?.currentAgentId || null;

  // Refs
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevAgentKeyRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  /**
   * Load flow data when agent changes.
   * Priority:
   * 1. agent.flowData (if has nodes)
   * 2. <flow> JSON tag in prompt (migration fallback)
   * 3. Text flow detection (show banner, no auto-convert)
   * 4. ASCII art detection (show banner)
   */
  useEffect(() => {
    const agentKey = currentProjectId && currentAgentId
      ? `${currentProjectId}:${currentAgentId}`
      : null;

    // Skip if same agent
    if (agentKey === prevAgentKeyRef.current) return;
    prevAgentKeyRef.current = agentKey;

    if (!agentKey || !currentProject) {
      setFlowData({ nodes: [], edges: [] });
      clearAsciiDetection();
      clearTextFlowDetection();
      return;
    }

    const agent = currentProject.agents.find(a => a.id === currentAgentId);
    if (!agent) {
      setFlowData({ nodes: [], edges: [] });
      clearAsciiDetection();
      clearTextFlowDetection();
      return;
    }

    isLoadingRef.current = true;

    // Priority 1: agent.flowData
    if (agent.flowData && agent.flowData.nodes && agent.flowData.nodes.length > 0) {
      setFlowData(agent.flowData);
      clearAsciiDetection();
      clearTextFlowDetection();
      isLoadingRef.current = false;
      return;
    }

    // Priority 2: <flow> JSON tag in prompt (migration)
    const flowFromPrompt = parseFlowFromPrompt(agent.currentPrompt);
    if (flowFromPrompt && flowFromPrompt.nodes.length > 0) {
      setFlowData(flowFromPrompt);
      clearAsciiDetection();
      clearTextFlowDetection();
      // Migrate: save to agent.flowData so next time it loads from there
      updateAgent(currentProjectId!, currentAgentId!, { flowData: flowFromPrompt });
      isLoadingRef.current = false;
      return;
    }

    // Priority 3: Text flow detection
    const textFlows = detectTextFlows(agent.currentPrompt);
    if (textFlows.length > 0) {
      setTextFlowsDetected(textFlows);
      clearAsciiDetection();
      setFlowData({ nodes: [], edges: [] });
      isLoadingRef.current = false;
      return;
    }

    // Priority 4: ASCII art detection
    const asciiDetection = detectAsciiFlow(agent.currentPrompt);
    if (asciiDetection && asciiDetection.confidence > 0.5) {
      setAsciiDetected(true, asciiDetection.rawBlock);
      clearTextFlowDetection();
      setFlowData({ nodes: [], edges: [] });
    } else {
      setAsciiDetected(false);
      clearTextFlowDetection();
      setFlowData({ nodes: [], edges: [] });
    }

    isLoadingRef.current = false;
  }, [currentProjectId, currentAgentId, currentProject, setFlowData, clearAsciiDetection, setAsciiDetected, updateAgent, setTextFlowsDetected, clearTextFlowDetection]);

  /**
   * Auto-save flow changes to agent.flowData (debounced 500ms).
   * Does NOT touch the prompt text.
   */
  useEffect(() => {
    if (isLoadingRef.current) return;
    if (!hasUnsavedChanges) return;
    if (!currentProjectId || !currentAgentId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const flowData = getFlowData();
      updateAgent(currentProjectId, currentAgentId, { flowData });
      markAsSaved();
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [nodes, edges, hasUnsavedChanges, currentProjectId, currentAgentId, getFlowData, updateAgent, markAsSaved]);

  /**
   * Convert detected ASCII art to visual flow.
   * Parses ASCII, loads into flow store, saves to agent.flowData.
   */
  const convertAsciiToFlow = useCallback(() => {
    const bounds = getAsciiFlowBounds(currentPrompt);
    if (!bounds) return;

    const flowData = parseAsciiFlow(bounds.block);
    if (!flowData || flowData.nodes.length === 0) return;

    setFlowData(flowData);
    clearAsciiDetection();

    // Save to agent.flowData
    if (currentProjectId && currentAgentId) {
      updateAgent(currentProjectId, currentAgentId, { flowData });
    }
  }, [currentPrompt, setFlowData, clearAsciiDetection, currentProjectId, currentAgentId, updateAgent]);

  /**
   * Convert a detected text flow to visual flow via LLM extraction.
   * Calls /api/flow/extract, loads result into flow store, saves to agent.flowData.
   */
  const convertTextFlowToVisual = useCallback(async (flowIndex: number) => {
    const { detectedTextFlows } = useFlowStore.getState();
    const flow = detectedTextFlows[flowIndex];
    if (!flow) return;

    setExtractingFlow(true);

    try {
      const response = await fetch('/api/flow/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowText: flow.rawText,
          flowName: flow.name,
          context: currentPrompt.substring(0, 1500),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al extraer el flujo');
      }

      const data = await response.json();

      if (data.flow && data.flow.nodes && data.flow.nodes.length > 0) {
        setFlowData(data.flow);
        markAsChanged();
        clearTextFlowDetection();

        // Save to agent.flowData
        if (currentProjectId && currentAgentId) {
          updateAgent(currentProjectId, currentAgentId, { flowData: data.flow });
        }

        useToastStore.getState().addToast(
          `Flujo "${flow.name}" extraido con ${data.flow.nodes.length} nodos`,
          'success'
        );
      } else {
        throw new Error('El modelo no generó nodos válidos');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al extraer el flujo';
      useToastStore.getState().addToast(message, 'error');
      setExtractingFlow(false);
    }
  }, [currentPrompt, setFlowData, markAsChanged, clearTextFlowDetection, setExtractingFlow, currentProjectId, currentAgentId, updateAgent]);

  /**
   * Convert ALL detected text flows to visual flow via LLM extraction.
   * Calls /api/flow/extract sequentially for each flow, combines results with Y offset.
   */
  const convertAllTextFlows = useCallback(async () => {
    const { detectedTextFlows } = useFlowStore.getState();
    if (detectedTextFlows.length < 2) return;

    setExtractingFlow(true);

    const allNodes: typeof nodes = [];
    const allEdges: typeof edges = [];
    let totalNodes = 0;
    let successCount = 0;
    const Y_OFFSET = 500;

    try {
      for (let i = 0; i < detectedTextFlows.length; i++) {
        const flow = detectedTextFlows[i];

        try {
          const response = await fetch('/api/flow/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              flowText: flow.rawText,
              flowName: flow.name,
              context: currentPrompt.substring(0, 1500),
            }),
          });

          if (!response.ok) continue;

          const data = await response.json();

          if (data.flow && data.flow.nodes && data.flow.nodes.length > 0) {
            const yOffset = i * Y_OFFSET;

            // Offset nodes and give unique IDs to avoid collisions
            const prefix = `flow${i}_`;
            const offsetNodes = data.flow.nodes.map((node: typeof nodes[0]) => ({
              ...node,
              id: `${prefix}${node.id}`,
              position: {
                x: node.position.x,
                y: node.position.y + yOffset,
              },
            }));

            const offsetEdges = data.flow.edges.map((edge: typeof edges[0]) => ({
              ...edge,
              id: `${prefix}${edge.id}`,
              source: `${prefix}${edge.source}`,
              target: `${prefix}${edge.target}`,
            }));

            allNodes.push(...offsetNodes);
            allEdges.push(...offsetEdges);
            totalNodes += data.flow.nodes.length;
            successCount++;
          }
        } catch {
          // Skip failed flows, continue with rest
        }
      }

      if (allNodes.length > 0) {
        const combined = { nodes: allNodes, edges: allEdges };
        setFlowData(combined);
        markAsChanged();
        clearTextFlowDetection();

        if (currentProjectId && currentAgentId) {
          updateAgent(currentProjectId, currentAgentId, { flowData: combined });
        }

        useToastStore.getState().addToast(
          `${successCount} flujos extraidos con ${totalNodes} nodos total`,
          'success'
        );
      } else {
        useToastStore.getState().addToast('No se pudieron extraer los flujos', 'error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al extraer los flujos';
      useToastStore.getState().addToast(message, 'error');
    } finally {
      setExtractingFlow(false);
    }
  }, [currentPrompt, setFlowData, markAsChanged, clearTextFlowDetection, setExtractingFlow, currentProjectId, currentAgentId, updateAgent]);

  /**
   * Insert ASCII art diagram into the prompt (manual action).
   */
  const insertAsciiInPrompt = useCallback(() => {
    const flowData = getFlowData();
    if (isFlowEmpty(flowData)) return;

    const newPrompt = insertAsciiFlowInPrompt(currentPrompt, flowData);
    useAnalysisStore.getState().pushUndo();
    setPrompt(newPrompt);

    useToastStore.getState().addToast('Flujo insertado en el prompt', 'success');
  }, [getFlowData, currentPrompt, setPrompt]);

  return { convertAsciiToFlow, insertAsciiInPrompt, convertTextFlowToVisual, convertAllTextFlows };
}
