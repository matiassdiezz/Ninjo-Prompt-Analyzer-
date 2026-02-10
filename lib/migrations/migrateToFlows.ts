import type { Agent } from '@/types/prompt';
import type { NamedFlow } from '@/types/flow';

/**
 * Migrates an agent from the legacy single flowData/flowSourceOrigin
 * to the new multi-flow structure (flows[] + activeFlowId).
 *
 * - If agent.flows already exists with items -> already migrated, return as-is
 * - If agent.flowData has nodes -> create a single NamedFlow from it
 * - Otherwise -> flows: [], activeFlowId: null
 */
export function migrateAgentToFlows(agent: Agent): Agent {
  // Already migrated
  if (agent.flows && agent.flows.length > 0) return agent;

  // No flow data to migrate
  if (!agent.flowData || !agent.flowData.nodes || agent.flowData.nodes.length === 0) {
    return {
      ...agent,
      flows: [],
      activeFlowId: null,
    };
  }

  // Create single NamedFlow from legacy data
  const flow: NamedFlow = {
    id: crypto.randomUUID(),
    name: agent.flowSourceOrigin?.name || 'Flujo Principal',
    flowData: agent.flowData,
    sourceOrigin: agent.flowSourceOrigin || undefined,
    createdAt: agent.updatedAt || Date.now(),
    updatedAt: agent.updatedAt || Date.now(),
  };

  return {
    ...agent,
    flows: [flow],
    activeFlowId: flow.id,
  };
}

/**
 * Migrates all agents in a project array from legacy to multi-flow.
 * Safe to call multiple times (idempotent).
 */
export function migrateProjectsToFlows(projects: any[]): any[] {
  return projects.map((project) => {
    if (!Array.isArray(project.agents)) return project;

    const migratedAgents = project.agents.map((agent: Agent) => migrateAgentToFlows(agent));
    const hasChanges = migratedAgents.some((a: Agent, i: number) => a !== project.agents[i]);

    return hasChanges ? { ...project, agents: migratedAgents } : project;
  });
}
