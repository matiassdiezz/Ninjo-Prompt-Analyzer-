import { supabase } from '../client';
import type { Agent } from '@/types/prompt';
import {
  mapDbAgentToApp,
  mapAppAgentToDbInsert,
  type DbAgent,
  type DbPromptVersion,
} from '../types';

export const agentsRepository = {
  async getByProjectId(projectId: string): Promise<Agent[]> {
    if (!supabase) return [];

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching agents:', error);
      return [];
    }

    if (!agents || agents.length === 0) return [];

    // Fetch versions for all agents
    const agentIds = (agents as DbAgent[]).map((a) => a.id);
    const { data: versions } = await supabase
      .from('prompt_versions')
      .select('*')
      .in('agent_id', agentIds)
      .order('created_at', { ascending: true });

    const versionsByAgent = ((versions || []) as DbPromptVersion[]).reduce((acc, v) => {
      if (!acc[v.agent_id]) acc[v.agent_id] = [];
      acc[v.agent_id].push(v);
      return acc;
    }, {} as Record<string, DbPromptVersion[]>);

    return (agents as DbAgent[]).map((a) =>
      mapDbAgentToApp(a, versionsByAgent[a.id] || [])
    );
  },

  async create(agent: Agent): Promise<Agent | null> {
    if (!supabase) return null;

    const dbAgent = mapAppAgentToDbInsert(agent);

    const { data, error } = await supabase
      .from('agents')
      .upsert(dbAgent, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      return null;
    }

    return mapDbAgentToApp(data as DbAgent, []);
  },

  async update(agentId: string, updates: Partial<Agent>): Promise<boolean> {
    if (!supabase) return false;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.channelType !== undefined) dbUpdates.channel_type = updates.channelType;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.currentPrompt !== undefined) dbUpdates.current_prompt = updates.currentPrompt;
    if (updates.annotations !== undefined) dbUpdates.annotations = updates.annotations;
    if (updates.chatMessages !== undefined) dbUpdates.chat_messages = updates.chatMessages;
    if (updates.flowData !== undefined) dbUpdates.flow_data = updates.flowData;
    if (updates.flowSourceOrigin !== undefined) dbUpdates.flow_source_origin = updates.flowSourceOrigin;

    if (Object.keys(dbUpdates).length === 0) return true;

    const { error } = await supabase
      .from('agents')
      .update(dbUpdates)
      .eq('id', agentId);

    if (error) {
      console.error('Error updating agent:', error);
      return false;
    }

    return true;
  },

  async delete(agentId: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.from('agents').delete().eq('id', agentId);

    if (error) {
      console.error('Error deleting agent:', error);
      return false;
    }

    return true;
  },

  async deleteByProjectId(projectId: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      console.error('Error deleting agents by project:', error);
      return false;
    }

    return true;
  },
};
