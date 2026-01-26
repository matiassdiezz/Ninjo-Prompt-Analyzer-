import { supabase } from '../client';
import type { KnowledgeEntry } from '@/types/prompt';
import {
  mapDbKnowledgeEntryToApp,
  mapAppKnowledgeEntryToDbInsert,
  type DbKnowledgeEntry,
} from '../types';

export const knowledgeRepository = {
  async getAll(deviceId: string): Promise<KnowledgeEntry[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching knowledge entries:', error);
      return [];
    }

    return ((data || []) as DbKnowledgeEntry[]).map((e) => mapDbKnowledgeEntryToApp(e));
  },

  async create(entry: KnowledgeEntry, deviceId: string): Promise<KnowledgeEntry | null> {
    if (!supabase) return null;

    const dbEntry = mapAppKnowledgeEntryToDbInsert(entry, deviceId);

    const { data, error } = await supabase
      .from('knowledge_entries')
      .insert(dbEntry)
      .select()
      .single();

    if (error) {
      console.error('Error creating knowledge entry:', error);
      return null;
    }

    return mapDbKnowledgeEntryToApp(data as DbKnowledgeEntry);
  },

  async createWithId(entry: KnowledgeEntry, deviceId: string): Promise<KnowledgeEntry | null> {
    if (!supabase) return null;

    const dbEntry = {
      id: entry.id,
      ...mapAppKnowledgeEntryToDbInsert(entry, deviceId),
    };

    const { data, error } = await supabase
      .from('knowledge_entries')
      .insert(dbEntry)
      .select()
      .single();

    if (error) {
      console.error('Error creating knowledge entry with ID:', error);
      return null;
    }

    return mapDbKnowledgeEntryToApp(data as DbKnowledgeEntry);
  },

  async update(id: string, updates: Partial<KnowledgeEntry>): Promise<boolean> {
    if (!supabase) return false;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.example !== undefined) dbUpdates.example = updates.example;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.feedbackType !== undefined) dbUpdates.feedback_type = updates.feedbackType;
    if (updates.effectiveness !== undefined) dbUpdates.effectiveness = updates.effectiveness;
    if (updates.usageCount !== undefined) dbUpdates.usage_count = updates.usageCount;
    if (updates.projectIds !== undefined) dbUpdates.project_ids = updates.projectIds;

    const { error } = await supabase
      .from('knowledge_entries')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating knowledge entry:', error);
      return false;
    }

    return true;
  },

  async delete(id: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.from('knowledge_entries').delete().eq('id', id);

    if (error) {
      console.error('Error deleting knowledge entry:', error);
      return false;
    }

    return true;
  },
};
