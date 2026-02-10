import { supabase } from '../client';
import type { Project } from '@/types/prompt';
import {
  mapDbProjectToApp,
  mapAppProjectToDbInsert,
  mapAppAgentToDbInsert,
  type DbProject,
} from '../types';
import { agentsRepository } from './agents';

export const projectsRepository = {
  async getAll(deviceId: string): Promise<Project[]> {
    if (!supabase) return [];

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('device_id', deviceId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return [];
    }

    if (!projects || projects.length === 0) return [];

    // Fetch agents (with their versions) for each project
    const result: Project[] = [];
    for (const dbProject of projects as DbProject[]) {
      const agents = await agentsRepository.getByProjectId(dbProject.id);
      result.push(mapDbProjectToApp(dbProject, agents));
    }

    return result;
  },

  async getById(id: string): Promise<Project | null> {
    if (!supabase) return null;

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !project) {
      console.error('Error fetching project:', error);
      return null;
    }

    const agents = await agentsRepository.getByProjectId(id);
    return mapDbProjectToApp(project as DbProject, agents);
  },

  async create(project: Project, deviceId: string): Promise<Project | null> {
    if (!supabase) return null;

    // Insert project first (without current_agent_id to avoid FK violation)
    const dbProject = mapAppProjectToDbInsert(project, deviceId);
    const insertData = { ...dbProject, current_agent_id: null };

    const { data, error } = await supabase
      .from('projects')
      .upsert(insertData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return null;
    }

    // Create all agents
    const createdAgents = [];
    for (const agent of project.agents) {
      const created = await agentsRepository.create(agent);
      if (created) createdAgents.push(created);
    }

    // Set current_agent_id now that agents exist
    if (project.currentAgentId) {
      await supabase
        .from('projects')
        .update({ current_agent_id: project.currentAgentId })
        .eq('id', project.id);
    }

    return mapDbProjectToApp(data as DbProject, createdAgents);
  },

  async update(id: string, updates: Partial<Project>): Promise<boolean> {
    if (!supabase) return false;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.currentAgentId !== undefined) dbUpdates.current_agent_id = updates.currentAgentId;
    if (updates.sharedContext !== undefined) dbUpdates.shared_context = updates.sharedContext;

    if (Object.keys(dbUpdates).length === 0) return true;

    const { error } = await supabase
      .from('projects')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating project:', error);
      return false;
    }

    return true;
  },

  async delete(id: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      return false;
    }

    return true;
  },
};
