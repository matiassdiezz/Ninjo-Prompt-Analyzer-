import type { Project, Agent } from '@/types/prompt';

/**
 * Migrates legacy projects (with currentPrompt at project level)
 * to the new agents[] structure.
 *
 * Each legacy project gets a single "Agente Principal" agent
 * containing its prompt, versions, annotations, and chat messages.
 */
export function migrateProjectsToAgents(projects: any[]): Project[] {
  return projects.map((p) => {
    // Already migrated
    if (Array.isArray(p.agents)) return p as Project;

    // Create default agent from legacy project data
    const defaultAgent: Agent = {
      id: crypto.randomUUID(),
      projectId: p.id,
      name: 'Agente Principal',
      channelType: 'instagram',
      currentPrompt: p.currentPrompt || '',
      versions: p.versions || [],
      annotations: p.annotations || [],
      chatMessages: p.chatMessages || [],
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };

    // Build migrated project, removing legacy fields
    const { currentPrompt, versions, annotations, chatMessages, ...rest } = p;

    return {
      ...rest,
      agents: [defaultAgent],
      currentAgentId: defaultAgent.id,
      sharedContext: '',
    } as Project;
  });
}
