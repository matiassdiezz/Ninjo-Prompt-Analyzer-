import { supabase } from '../client';
import type { PromptVersion } from '@/types/prompt';
import { mapAppVersionToDbInsert, mapDbVersionToApp, type DbPromptVersion } from '../types';

export const versionsRepository = {
  async getByProjectId(projectId: string): Promise<PromptVersion[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching versions:', error);
      return [];
    }

    return ((data || []) as DbPromptVersion[]).map((v) => mapDbVersionToApp(v));
  },

  async create(version: PromptVersion, projectId: string): Promise<PromptVersion | null> {
    if (!supabase) return null;

    const dbVersion = mapAppVersionToDbInsert(version, projectId);

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

  async createWithId(version: PromptVersion, projectId: string): Promise<PromptVersion | null> {
    if (!supabase) return null;

    const dbVersion = {
      id: version.id,
      ...mapAppVersionToDbInsert(version, projectId),
    };

    const { data, error } = await supabase
      .from('prompt_versions')
      .upsert(dbVersion, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error creating version with ID:', {
        error,
        code: error.code,
        message: error.message,
      });
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

  async deleteByProjectId(projectId: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from('prompt_versions')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      console.error('Error deleting versions by project:', error);
      return false;
    }

    return true;
  },
};
