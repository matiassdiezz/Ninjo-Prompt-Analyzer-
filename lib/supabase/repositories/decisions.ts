import { supabase } from '../client';
import type { SuggestionDecision } from '@/types/prompt';
import {
  mapDbDecisionToApp,
  mapAppDecisionToDbInsert,
  type DbSuggestionDecision,
} from '../types';

export const decisionsRepository = {
  async getAll(deviceId: string): Promise<SuggestionDecision[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('suggestion_decisions')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching decisions:', error);
      return [];
    }

    return ((data || []) as DbSuggestionDecision[]).map((d) => mapDbDecisionToApp(d));
  },

  async getByProjectId(projectId: string): Promise<SuggestionDecision[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('suggestion_decisions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching decisions by project:', error);
      return [];
    }

    return ((data || []) as DbSuggestionDecision[]).map((d) => mapDbDecisionToApp(d));
  },

  async create(decision: SuggestionDecision, deviceId: string): Promise<SuggestionDecision | null> {
    if (!supabase) return null;

    const dbDecision = mapAppDecisionToDbInsert(decision, deviceId);

    const { data, error } = await supabase
      .from('suggestion_decisions')
      .insert(dbDecision)
      .select()
      .single();

    if (error) {
      console.error('Error creating decision:', error);
      return null;
    }

    return mapDbDecisionToApp(data as DbSuggestionDecision);
  },

  async createWithId(decision: SuggestionDecision, deviceId: string): Promise<SuggestionDecision | null> {
    if (!supabase) return null;

    const dbDecision = mapAppDecisionToDbInsert(decision, deviceId);

    const { data, error } = await supabase
      .from('suggestion_decisions')
      .insert(dbDecision)
      .select()
      .single();

    if (error) {
      console.error('Error creating decision with ID:', error);
      return null;
    }

    return mapDbDecisionToApp(data as DbSuggestionDecision);
  },

  async update(id: string, updates: Partial<SuggestionDecision>): Promise<boolean> {
    if (!supabase) return false;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.decision !== undefined) dbUpdates.decision = updates.decision;
    if (updates.justification !== undefined) dbUpdates.justification = updates.justification;
    if (updates.finalText !== undefined) dbUpdates.final_text = updates.finalText;
    if (updates.savedToKnowledge !== undefined) dbUpdates.saved_to_knowledge = updates.savedToKnowledge;

    const { error } = await supabase
      .from('suggestion_decisions')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating decision:', error);
      return false;
    }

    return true;
  },

  async delete(id: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.from('suggestion_decisions').delete().eq('id', id);

    if (error) {
      console.error('Error deleting decision:', error);
      return false;
    }

    return true;
  },

  async deleteByProjectId(projectId: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from('suggestion_decisions')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      console.error('Error deleting decisions by project:', error);
      return false;
    }

    return true;
  },
};
