import { supabase } from '../client';
import type { PromptVersion } from '@/types/prompt';
import { mapAppVersionToDbInsert, mapDbVersionToApp, type DbPromptVersion } from '../types';

export const versionsRepository = {
  async getByAgentId(agentId: string): Promise<PromptVersion[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching versions:', error);
      return [];
    }

    return ((data || []) as DbPromptVersion[]).map((v) => mapDbVersionToApp(v));
  },

  async create(version: PromptVersion, agentId: string): Promise<PromptVersion | null> {
    if (!supabase) return null;

    const dbVersion = mapAppVersionToDbInsert(version, agentId);

    const { data, error } = await supabase
      .from('prompt_versions')
      .insert(dbVersion)
      .select()
      .single();

    if (error) {
      console.error('Error creating version:', error);
      return null;
    }

    return mapDbVersionToApp(data as DbPromptVersion);
  },

  async createWithId(version: PromptVersion, agentId: string): Promise<PromptVersion | null | 'FK_ERROR'> {
    if (!supabase) return null;
    if (!agentId) {
      console.error('Cannot create version: missing agentId', { versionId: version.id });
      return null;
    }

    const dbVersion = mapAppVersionToDbInsert(version, agentId);

    const { data, error } = await supabase
      .from('prompt_versions')
      .upsert(dbVersion, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error(`Error creating version ${version.id} for agent ${agentId}:`, error.message || error.code || error);
      // FK constraint = permanent error, don't retry
      if (error.code === '23503') return 'FK_ERROR';
      return null;
    }

    return mapDbVersionToApp(data as DbPromptVersion);
  },

  async delete(id: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.from('prompt_versions').delete().eq('id', id);

    if (error) {
      console.error('Error deleting version:', error);
      return false;
    }

    return true;
  },

  async deleteByAgentId(agentId: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from('prompt_versions')
      .delete()
      .eq('agent_id', agentId);

    if (error) {
      console.error('Error deleting versions by agent:', error);
      return false;
    }

    return true;
  },
};
