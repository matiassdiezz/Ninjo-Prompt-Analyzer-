'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useFlowStore } from '@/store/flowStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { parseFlowFromPrompt } from '@/lib/utils/flowParser';
import { isFlowEmpty, insertAsciiFlowInPrompt } from '@/lib/utils/flowSerializer';
import { detectAsciiFlow, parseAsciiFlow, getAsciiFlowBounds } from '@/lib/utils/asciiFlowParser';
import { detectTextFlows } from '@/lib/utils/textFlowDetector';
import { flowDataToText } from '@/lib/utils/flowToText';
import { findTextInPrompt } from '@/lib/utils/textMatcher';
import { useToastStore } from '@/store/toastStore';
import { migrateAgentToFlows } from '@/lib/migrations/migrateToFlows';
import type { FlowSourceOrigin, FlowTextFormat, NamedFlow } from '@/types/flow';

/**
 * Hook that synchronizes the flow store with agent.flows[] (multi-flow).
 *
 * - Flow data is persisted in agent.flows[activeFlowId].flowData
 * - On agent switch: migrates legacy flowData if needed, populates availableFlows, loads active flow
 * - On flow switch: saves current, loads target flow
 * - Auto-saves flow changes to the active NamedFlow (debounced)
 * - Extraction methods create individual NamedFlows (not merged)
 */
export function useFlowSync() {
  const { currentPrompt, setPrompt } = useAnalysisStore();
  const {
    nodes,
    edges,
    hasUnsavedChanges,
    activeFlowId: storeActiveFlowId,
    setFlowData,
    markAsSaved,
    getFlowData,
    setAsciiDetected,
    clearAsciiDetection,
    setTextFlowsDetected,
    clearTextFlowDetection,
    setExtractingFlow,
    markAsChanged,
    setActiveFlowId: setStoreActiveFlowId,
    setAvailableFlows,
    setFlowSourceOrigin: setStoreFlowSourceOrigin,
  } = useFlowStore();

  const {
    currentProjectId,
    projects,
    updateAgent,
    addFlow,
    updateFlow,
    deleteFlow: deleteFlowFromStore,
    setActiveFlowId: setAgentActiveFlowId,
  } = useKnowledgeStore();

  // Derive current agent
  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentAgentId = currentProject?.currentAgentId || null;
  const currentAgent = currentProject?.agents.find(a => a.id === currentAgentId) || null;

  // Refs
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevAgentKeyRef = useRef<string | null>(null);
  const prevFlowIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // --- Helper: sync availableFlows from agent.flows to flowStore ---
  const syncAvailableFlows = useCallback((agent: { flows?: NamedFlow[] }) => {
    const flows = agent.flows || [];
    setAvailableFlows(flows.map(f => ({ id: f.id, name: f.name })));
  }, [setAvailableFlows]);

  // --- Helper: load a specific flow into the canvas ---
  const loadFlowIntoCanvas = useCallback((flow: NamedFlow | undefined) => {
    if (flow && flow.flowData && flow.flowData.nodes.length > 0) {
      setFlowData(flow.flowData);
      setStoreFlowSourceOrigin(flow.sourceOrigin || null);
    } else {
      setFlowData({ nodes: [], edges: [] });
      setStoreFlowSourceOrigin(null);
    }
  }, [setFlowData, setStoreFlowSourceOrigin]);

  /**
   * Load flows when agent changes.
   * 1. Run migration if needed (legacy flowData -> flows[])
   * 2. Populate availableFlows
   * 3. Load activeFlowId data into canvas
   * 4. If no flows: fallback to text/ASCII detection
   */
  useEffect(() => {
    const agentKey = currentProjectId && currentAgentId
      ? `${currentProjectId}:${currentAgentId}`
      : null;

    // Skip if same agent
    if (agentKey === prevAgentKeyRef.current) return;
    prevAgentKeyRef.current = agentKey;
    prevFlowIdRef.current = null; // Reset flow tracking on agent switch

    if (!agentKey || !currentProject || !currentAgent) {
      setFlowData({ nodes: [], edges: [] });
      setAvailableFlows([]);
      setStoreActiveFlowId(null);
      clearAsciiDetection();
      clearTextFlowDetection();
      return;
    }

    isLoadingRef.current = true;

    // Step 1: Migrate if needed (will be no-op if already migrated)
    let agent = currentAgent;
    const migrated = migrateAgentToFlows(agent);
    if (migrated !== agent) {
      // Save migration result
      updateAgent(currentProjectId!, currentAgentId!, {
        flows: migrated.flows,
        activeFlowId: migrated.activeFlowId,
      });
      agent = migrated;
    }

    const flows = agent.flows || [];

    // Step 2: If agent has flows, load them
    if (flows.length > 0) {
      syncAvailableFlows(agent);

      // Determine active flow
      const activeId = agent.activeFlowId || flows[0].id;
      const activeFlow = flows.find(f => f.id === activeId) || flows[0];

      setStoreActiveFlowId(activeFlow.id);
      prevFlowIdRef.current = activeFlow.id;
      loadFlowIntoCanvas(activeFlow);
      clearAsciiDetection();
      clearTextFlowDetection();
      isLoadingRef.current = false;
      return;
    }

    // Step 3: No flows — check legacy <flow> tag in prompt
    const flowFromPrompt = parseFlowFromPrompt(agent.currentPrompt);
    if (flowFromPrompt && flowFromPrompt.nodes.length > 0) {
      // Create a NamedFlow from legacy <flow> tag
      const flowId = addFlow(currentProjectId!, currentAgentId!, 'Flujo Principal');
      updateFlow(currentProjectId!, currentAgentId!, flowId, {
        flowData: flowFromPrompt,
      });

      setFlowData(flowFromPrompt);
      setStoreActiveFlowId(flowId);
      setAvailableFlows([{ id: flowId, name: 'Flujo Principal' }]);
      clearAsciiDetection();
      clearTextFlowDetection();
      isLoadingRef.current = false;
      return;
    }

    // Step 4: Text flow detection (show banner, user decides)
    const textFlows = detectTextFlows(agent.currentPrompt);
    if (textFlows.length > 0) {
      setTextFlowsDetected(textFlows);
      clearAsciiDetection();
      setFlowData({ nodes: [], edges: [] });
      setAvailableFlows([]);
      setStoreActiveFlowId(null);
      isLoadingRef.current = false;
      return;
    }

    // Step 5: ASCII art detection (show banner)
    const asciiDetection = detectAsciiFlow(agent.currentPrompt);
    if (asciiDetection && asciiDetection.confidence > 0.5) {
      setAsciiDetected(true, asciiDetection.rawBlock);
      clearTextFlowDetection();
    } else {
      setAsciiDetected(false);
      clearTextFlowDetection();
    }

    setFlowData({ nodes: [], edges: [] });
    setAvailableFlows([]);
    setStoreActiveFlowId(null);
    isLoadingRef.current = false;
  }, [currentProjectId, currentAgentId, currentProject, currentAgent, setFlowData, clearAsciiDetection, setAsciiDetected, updateAgent, setTextFlowsDetected, clearTextFlowDetection, syncAvailableFlows, loadFlowIntoCanvas, setStoreActiveFlowId, setAvailableFlows, addFlow, updateFlow, setStoreFlowSourceOrigin]);

  /**
   * Handle flow tab switch: when storeActiveFlowId changes (from FlowTabBar click),
   * save current flow and load the new one.
   */
  useEffect(() => {
    if (isLoadingRef.current) return;
    if (!currentAgent || !currentProjectId || !currentAgentId) return;

    const newFlowId = storeActiveFlowId;
    const prevFlowId = prevFlowIdRef.current;

    // Skip if same flow or no change
    if (newFlowId === prevFlowId) return;

    const flows = currentAgent.flows || [];
    if (flows.length === 0) {
      prevFlowIdRef.current = null;
      return;
    }

    isLoadingRef.current = true;

    // Save current flow if it has unsaved changes
    if (prevFlowId && hasUnsavedChanges) {
      const flowData = getFlowData();
      const { flowSourceOrigin } = useFlowStore.getState();
      updateFlow(currentProjectId, currentAgentId, prevFlowId, {
        flowData,
        sourceOrigin: flowSourceOrigin || undefined,
      });
      markAsSaved();
    }

    // Update agent's activeFlowId
    if (newFlowId) {
      setAgentActiveFlowId(currentProjectId, currentAgentId, newFlowId);
    }

    // Load target flow
    const targetFlow = newFlowId ? flows.find(f => f.id === newFlowId) : flows[0];
    loadFlowIntoCanvas(targetFlow);

    prevFlowIdRef.current = newFlowId;
    isLoadingRef.current = false;
  }, [storeActiveFlowId, currentAgent, currentProjectId, currentAgentId, hasUnsavedChanges, getFlowData, updateFlow, markAsSaved, loadFlowIntoCanvas, setAgentActiveFlowId]);

  /**
   * Auto-save flow changes to agent.flows[activeFlowId].flowData (debounced 500ms).
   * Writes to the specific NamedFlow, not agent.flowData.
   */
  useEffect(() => {
    if (isLoadingRef.current) return;
    if (!hasUnsavedChanges) return;
    if (!currentProjectId || !currentAgentId) return;

    const activeId = storeActiveFlowId;
    if (!activeId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const flowData = getFlowData();
      const { flowSourceOrigin } = useFlowStore.getState();
      updateFlow(currentProjectId, currentAgentId, activeId, {
        flowData,
        sourceOrigin: flowSourceOrigin || undefined,
      });
      markAsSaved();
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [nodes, edges, hasUnsavedChanges, currentProjectId, currentAgentId, storeActiveFlowId, getFlowData, updateFlow, markAsSaved]);

  /**
   * Convert detected ASCII art to visual flow.
   * Creates a new NamedFlow from the parsed ASCII.
   */
  const convertAsciiToFlow = useCallback(() => {
    const bounds = getAsciiFlowBounds(currentPrompt);
    if (!bounds) return;

    const flowData = parseAsciiFlow(bounds.block);
    if (!flowData || flowData.nodes.length === 0) return;

    if (currentProjectId && currentAgentId) {
      const flowId = addFlow(currentProjectId, currentAgentId, 'Flujo ASCII');
      updateFlow(currentProjectId, currentAgentId, flowId, { flowData });

      setFlowData(flowData);
      setStoreActiveFlowId(flowId);
      clearAsciiDetection();

      // Refresh available flows
      const agent = useKnowledgeStore.getState().projects
        .find(p => p.id === currentProjectId)?.agents.find(a => a.id === currentAgentId);
      if (agent) syncAvailableFlows(agent);
    }
  }, [currentPrompt, setFlowData, clearAsciiDetection, currentProjectId, currentAgentId, addFlow, updateFlow, setStoreActiveFlowId, syncAvailableFlows]);

  /**
   * Convert a single detected text flow to visual flow via LLM extraction.
   * Creates a new NamedFlow and switches to it.
   */
  const convertTextFlowToVisual = useCallback(async (flowIndex: number) => {
    const { detectedTextFlows } = useFlowStore.getState();
    const flow = detectedTextFlows[flowIndex];
    if (!flow) return;
    if (!currentProjectId || !currentAgentId) return;

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
        const origin: FlowSourceOrigin = {
          rawText: flow.rawText,
          name: flow.name,
          headerAnchor: flow.rawText.split('\n')[0].trim(),
        };

        // Create NamedFlow
        const flowId = addFlow(currentProjectId, currentAgentId, flow.name);
        updateFlow(currentProjectId, currentAgentId, flowId, {
          flowData: data.flow,
          sourceOrigin: origin,
        });

        // Load into canvas
        setFlowData(data.flow);
        setStoreActiveFlowId(flowId);
        setStoreFlowSourceOrigin(origin);
        markAsChanged();
        clearTextFlowDetection();

        // Refresh available flows
        const agent = useKnowledgeStore.getState().projects
          .find(p => p.id === currentProjectId)?.agents.find(a => a.id === currentAgentId);
        if (agent) syncAvailableFlows(agent);

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
  }, [currentPrompt, setFlowData, markAsChanged, clearTextFlowDetection, setExtractingFlow, currentProjectId, currentAgentId, addFlow, updateFlow, setStoreActiveFlowId, setStoreFlowSourceOrigin, syncAvailableFlows]);

  /**
   * Convert ALL detected text flows to separate NamedFlows via LLM extraction.
   * Each detected flow becomes its own NamedFlow (tab). Auto-connects cross-flow refs.
   */
  const convertAllTextFlows = useCallback(async () => {
    const { detectedTextFlows } = useFlowStore.getState();
    if (detectedTextFlows.length < 2) return;
    if (!currentProjectId || !currentAgentId) return;

    setExtractingFlow(true);

    let totalNodes = 0;
    let successCount = 0;
    let firstFlowId: string | null = null;

    // Track created flows for cross-ref post-processing
    const createdFlows: { id: string; name: string; flowData: typeof nodes extends (infer T)[] ? { nodes: T[]; edges: any[] } : never }[] = [];

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
            const origin: FlowSourceOrigin = {
              rawText: flow.rawText,
              name: flow.name,
              headerAnchor: flow.rawText.split('\n')[0].trim(),
            };

            // Create individual NamedFlow
            const flowId = addFlow(currentProjectId, currentAgentId, flow.name);
            updateFlow(currentProjectId, currentAgentId, flowId, {
              flowData: data.flow,
              sourceOrigin: origin,
            });

            createdFlows.push({ id: flowId, name: flow.name, flowData: data.flow });
            totalNodes += data.flow.nodes.length;
            successCount++;

            if (!firstFlowId) firstFlowId = flowId;
          }
        } catch {
          // Skip failed flows, continue with rest
        }
      }

      if (successCount > 0) {
        // Post-process: auto-connect cross-flow references
        autoConnectCrossFlowRefs(createdFlows);

        // Refresh available flows
        const agent = useKnowledgeStore.getState().projects
          .find(p => p.id === currentProjectId)?.agents.find(a => a.id === currentAgentId);
        if (agent) syncAvailableFlows(agent);

        // Load first created flow into canvas
        if (firstFlowId) {
          const firstCreated = createdFlows[0];
          if (firstCreated) {
            setFlowData(firstCreated.flowData);
            setStoreActiveFlowId(firstFlowId);
          }
        }

        clearTextFlowDetection();

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
  }, [currentPrompt, setFlowData, clearTextFlowDetection, setExtractingFlow, currentProjectId, currentAgentId, addFlow, updateFlow, setStoreActiveFlowId, syncAvailableFlows]);

  /**
   * Auto-connect cross-flow references after extracting multiple flows.
   * Matches end node labels like "-> FLUJO_X" against created flow names.
   */
  const autoConnectCrossFlowRefs = useCallback((
    createdFlows: { id: string; name: string; flowData: { nodes: any[]; edges: any[] } }[]
  ) => {
    if (!currentProjectId || !currentAgentId) return;

    const nameToId = new Map(createdFlows.map(f => [f.name.toLowerCase(), f.id]));

    for (const flow of createdFlows) {
      let hasChanges = false;
      const updatedNodes = flow.flowData.nodes.map((node: any) => {
        if (node.type !== 'end') return node;

        // Check label for cross-flow pattern: "-> FLOW_NAME" or "→ FLOW_NAME"
        const label = (node.label || '').trim();
        const crossRefMatch = label.match(/^(?:->|→|>>|ir a|goto)\s*(.+)$/i);
        if (!crossRefMatch) return node;

        const targetName = crossRefMatch[1].trim().toLowerCase();
        const targetFlowId = nameToId.get(targetName);
        if (!targetFlowId || targetFlowId === flow.id) return node;

        hasChanges = true;
        return {
          ...node,
          data: { ...node.data, crossFlowRef: targetFlowId },
        };
      });

      if (hasChanges) {
        updateFlow(currentProjectId, currentAgentId, flow.id, {
          flowData: { nodes: updatedNodes, edges: flow.flowData.edges },
        });
      }
    }
  }, [currentProjectId, currentAgentId, updateFlow]);

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

  /**
   * Replace the original flow text in the prompt with new text.
   * Uses fuzzy matching to find the original block even if the prompt was edited.
   */
  const replaceFlowInPrompt = useCallback((
    prompt: string,
    origin: FlowSourceOrigin,
    newText: string
  ): { prompt: string; replacedInPlace: boolean } => {
    // Strategy 1: Find the original rawText using fuzzy matching
    const match = findTextInPrompt(prompt, origin.rawText, {
      enableFuzzy: true,
      fuzzyThreshold: 0.85,
    });

    if (match.found && match.confidence >= 0.85) {
      const before = prompt.substring(0, match.startIndex);
      const after = prompt.substring(match.endIndex);
      return {
        prompt: `${before.trimEnd()}\n\n${newText}\n\n${after.trimStart()}`.trim(),
        replacedInPlace: true,
      };
    }

    // Strategy 2: Find the header anchor and replace that section
    const headerIndex = prompt.indexOf(origin.headerAnchor);
    if (headerIndex !== -1) {
      const headerLevel = (origin.headerAnchor.match(/^#{1,6}/) || ['##'])[0].length;
      const afterHeader = prompt.substring(headerIndex + origin.headerAnchor.length);
      const nextHeaderPattern = new RegExp(`^#{1,${headerLevel}}\\s`, 'm');
      const nextHeaderMatch = afterHeader.match(nextHeaderPattern);

      let endIndex: number;
      if (nextHeaderMatch && nextHeaderMatch.index !== undefined) {
        endIndex = headerIndex + origin.headerAnchor.length + nextHeaderMatch.index;
      } else {
        endIndex = prompt.length;
      }

      const before = prompt.substring(0, headerIndex);
      const after = prompt.substring(endIndex);
      return {
        prompt: `${before.trimEnd()}\n\n${newText}\n\n${after.trimStart()}`.trim(),
        replacedInPlace: true,
      };
    }

    // Strategy 3: Append at end
    return {
      prompt: `${prompt.trimEnd()}\n\n${newText}`,
      replacedInPlace: false,
    };
  }, []);

  /**
   * Re-insert the active flow back into the prompt, replacing the original text block.
   * Uses the active NamedFlow's sourceOrigin for positioning.
   */
  const insertFlowBackInPrompt = useCallback((format: FlowTextFormat) => {
    const flowData = getFlowData();
    if (isFlowEmpty(flowData)) return;

    // Use per-flow sourceOrigin from the active NamedFlow
    const { flowSourceOrigin } = useFlowStore.getState();
    const flowName = flowSourceOrigin?.name || 'FLUJO';

    // Generate text from flow (include cross-flow references)
    const { availableFlows } = useFlowStore.getState();
    const newFlowText = flowDataToText(flowData, flowName, format, availableFlows);

    useAnalysisStore.getState().pushUndo();

    if (flowSourceOrigin) {
      // Replace in place
      const result = replaceFlowInPrompt(currentPrompt, flowSourceOrigin, newFlowText);
      setPrompt(result.prompt);

      // Update origin for future roundtrips (on the NamedFlow)
      const updatedOrigin: FlowSourceOrigin = {
        rawText: newFlowText,
        name: flowSourceOrigin.name,
        headerAnchor: newFlowText.split('\n')[0].trim(),
      };
      setStoreFlowSourceOrigin(updatedOrigin);

      // Persist updated origin to the NamedFlow
      const activeId = useFlowStore.getState().activeFlowId;
      if (currentProjectId && currentAgentId && activeId) {
        updateFlow(currentProjectId, currentAgentId, activeId, {
          sourceOrigin: updatedOrigin,
        });
      }

      if (result.replacedInPlace) {
        useToastStore.getState().addToast('Flujo reinsertado en su posicion original', 'success');
      } else {
        useToastStore.getState().addToast('No se encontro la posicion original. Flujo agregado al final.', 'warning');
      }
    } else {
      // No origin — copy to clipboard so user can paste where they want
      navigator.clipboard.writeText(newFlowText).then(() => {
        useToastStore.getState().addToast('Flujo copiado al portapapeles — pegalo donde quieras en el prompt', 'success');
      }).catch(() => {
        useToastStore.getState().addToast('No se pudo copiar al portapapeles', 'error');
      });
    }
  }, [getFlowData, currentPrompt, setPrompt, replaceFlowInPrompt, currentProjectId, currentAgentId, updateFlow, setStoreFlowSourceOrigin]);

  /**
   * Extract selected text from the editor as a new NamedFlow.
   * Calls /api/flow/extract, creates a NamedFlow, switches to it.
   */
  const extractSelectionAsFlow = useCallback(async (selectedText: string) => {
    if (!selectedText || selectedText.split('\n').length < 3) return;
    if (!currentProjectId || !currentAgentId) return;

    const firstLine = selectedText.split('\n')[0].trim();
    const headerMatch = firstLine.match(/^#{1,3}\s+(.+)$/);
    const name = headerMatch ? headerMatch[1].replace(/[:\-–—]\s*$/, '').trim() : 'FLUJO_SELECCIONADO';

    const origin: FlowSourceOrigin = {
      rawText: selectedText,
      name,
      headerAnchor: firstLine,
    };

    setExtractingFlow(true);

    try {
      const response = await fetch('/api/flow/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowText: selectedText,
          flowName: name,
          context: currentPrompt.substring(0, 1500),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al extraer el flujo');
      }

      const data = await response.json();

      if (data.flow && data.flow.nodes && data.flow.nodes.length > 0) {
        // Create NamedFlow
        const flowId = addFlow(currentProjectId, currentAgentId, name);
        updateFlow(currentProjectId, currentAgentId, flowId, {
          flowData: data.flow,
          sourceOrigin: origin,
        });

        // Load into canvas
        setFlowData(data.flow);
        setStoreActiveFlowId(flowId);
        setStoreFlowSourceOrigin(origin);
        markAsChanged();
        clearTextFlowDetection();

        // Refresh available flows
        const agent = useKnowledgeStore.getState().projects
          .find(p => p.id === currentProjectId)?.agents.find(a => a.id === currentAgentId);
        if (agent) syncAvailableFlows(agent);

        useToastStore.getState().addToast(
          `Flujo "${name}" extraido con ${data.flow.nodes.length} nodos`,
          'success'
        );
      } else {
        throw new Error('El modelo no genero nodos validos');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al extraer el flujo';
      useToastStore.getState().addToast(message, 'error');
    } finally {
      setExtractingFlow(false);
    }
  }, [currentPrompt, setFlowData, markAsChanged, clearTextFlowDetection, setExtractingFlow, currentProjectId, currentAgentId, addFlow, updateFlow, setStoreActiveFlowId, setStoreFlowSourceOrigin, syncAvailableFlows]);

  return {
    convertAsciiToFlow,
    insertAsciiInPrompt,
    convertTextFlowToVisual,
    convertAllTextFlows,
    insertFlowBackInPrompt,
    extractSelectionAsFlow,
  };
}
