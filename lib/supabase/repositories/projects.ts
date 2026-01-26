import { supabase } from '../client';
import type { Project } from '@/types/prompt';
import {
  mapDbProjectToApp,
  mapAppProjectToDbInsert,
  type DbProject,
  type DbPromptVersion,
} from '../types';

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

    // Fetch versions for all projects
    const projectIds = (projects as DbProject[]).map((p) => p.id);
    const { data: versions } = await supabase
      .from('prompt_versions')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: true });

    const versionsByProject = ((versions || []) as DbPromptVersion[]).reduce((acc, v) => {
      if (!acc[v.project_id]) acc[v.project_id] = [];
      acc[v.project_id].push(v);
      return acc;
    }, {} as Record<string, DbPromptVersion[]>);

    return (projects as DbProject[]).map((p) =>
      mapDbProjectToApp(p, versionsByProject[p.id] || [])
    );
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

    const { data: versions } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true });

    return mapDbProjectToApp(project as DbProject, ((versions || []) as DbPromptVersion[]));
  },

  async create(project: Project, deviceId: string): Promise<Project | null> {
    if (!supabase) return null;

    const dbProject = {
      id: project.id, // Preserve the local ID so versions can reference it
      ...mapAppProjectToDbInsert(project, deviceId),
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(dbProject)
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return null;
    }

    return mapDbProjectToApp(data as DbProject, []);
  },

  async update(id: string, updates: Partial<Project>): Promise<boolean> {
    if (!supabase) return false;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.currentPrompt !== undefined) dbUpdates.current_prompt = updates.currentPrompt;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

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
