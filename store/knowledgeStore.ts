import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KnowledgeEntry, SuggestionDecision, Project, PromptVersion } from '@/types/prompt';
import {
  type ExportData,
  type MergeOptions,
  exportProject,
  exportAllProjects,
  exportKnowledgeBase,
  exportFullBackup,
  downloadAsJson,
  generateFilename,
  validateExportData,
  mergeProjects,
  mergeKnowledgeEntries,
  mergeDecisions,
} from '@/lib/exportImport';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  projectsRepository,
  versionsRepository,
  knowledgeRepository,
  decisionsRepository,
} from '@/lib/supabase/repositories';
import { getSupabaseDeviceId } from '@/lib/supabase/device';

// Types for pending operations
type OperationType = 'create' | 'update' | 'delete';
type EntityType = 'project' | 'version' | 'knowledge' | 'decision';

interface PendingOperation {
  id: string;
  type: OperationType;
  entity: EntityType;
  entityId: string;
  data?: unknown;
  timestamp: number;
}

// Sync state
interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingOperations: PendingOperation[];
  syncError: string | null;
}

interface KnowledgeStore {
  // State
  entries: KnowledgeEntry[];
  decisions: SuggestionDecision[];
  projects: Project[];
  currentProjectId: string | null;

  // Sync State
  sync: SyncState;

  // Actions - Knowledge Entries
  addEntry: (entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'usageCount' | 'projectIds'>) => void;
  updateEntry: (id: string, updates: Partial<KnowledgeEntry>) => void;
  deleteEntry: (id: string) => void;
  incrementUsage: (id: string, projectId: string) => void;

  // Actions - Decisions
  recordDecision: (decision: Omit<SuggestionDecision, 'id' | 'timestamp'>) => void;
  getDecisionsByCategory: (category: string) => SuggestionDecision[];
  getDecisionsByProject: (projectId: string) => SuggestionDecision[];

  // Actions - Projects
  createProject: (name: string, description: string, clientName?: string) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  getCurrentProject: () => Project | null;
  saveVersionToProject: (projectId: string, content: string, label: string, changes?: PromptVersion['changes']) => void;

  // Actions - Search
  searchEntries: (query: string, tags?: string[]) => KnowledgeEntry[];
  getEntriesByFeedbackType: (feedbackType: string) => KnowledgeEntry[];
  getPatterns: () => KnowledgeEntry[];
  getAntiPatterns: () => KnowledgeEntry[];

  // Actions - Export/Import
  exportCurrentProject: () => void;
  exportAllProjects: () => void;
  exportKnowledgeBase: () => void;
  exportFullBackup: () => void;
  importData: (data: unknown, options: MergeOptions) => { success: boolean; message: string; details?: { added: number; updated: number; skipped: number } };

  // Actions - Supabase Sync
  initializeFromSupabase: () => Promise<void>;
  syncToSupabase: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
  addPendingOperation: (operation: Omit<PendingOperation, 'id' | 'timestamp'>) => void;
  processPendingOperations: () => Promise<void>;
  clearSyncError: () => void;
}

// Helper to create pending operation
function createPendingOperation(
  type: OperationType,
  entity: EntityType,
  entityId: string,
  data?: unknown
): PendingOperation {
  return {
    id: crypto.randomUUID(),
    type,
    entity,
    entityId,
    data,
    timestamp: Date.now(),
  };
}

export const useKnowledgeStore = create<KnowledgeStore>()(
  persist(
    (set, get) => ({
      entries: [],
      decisions: [],
      projects: [],
      currentProjectId: null,

      // Initial sync state
      sync: {
        isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
        isSyncing: false,
        lastSyncedAt: null,
        pendingOperations: [],
        syncError: null,
      },

      // Knowledge Entries
      addEntry: (entryData) => {
        const entry: KnowledgeEntry = {
          ...entryData,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          usageCount: 0,
          projectIds: [],
        };

        set((state) => ({
          entries: [...state.entries, entry],
          sync: {
            ...state.sync,
            pendingOperations: [
              ...state.sync.pendingOperations,
              createPendingOperation('create', 'knowledge', entry.id, entry),
            ],
          },
        }));

        // Sync in background
        get().syncToSupabase();
      },

      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
          sync: {
            ...state.sync,
            pendingOperations: [
              ...state.sync.pendingOperations,
              createPendingOperation('update', 'knowledge', id, updates),
            ],
          },
        }));

        get().syncToSupabase();
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
          sync: {
            ...state.sync,
            pendingOperations: [
              ...state.sync.pendingOperations,
              createPendingOperation('delete', 'knowledge', id),
            ],
          },
        }));

        get().syncToSupabase();
      },

      incrementUsage: (id, projectId) => {
        const entry = get().entries.find((e) => e.id === id);
        if (entry) {
          const updates = {
            usageCount: entry.usageCount + 1,
            projectIds: entry.projectIds.includes(projectId)
              ? entry.projectIds
              : [...entry.projectIds, projectId],
          };

          set((state) => ({
            entries: state.entries.map((e) =>
              e.id === id ? { ...e, ...updates } : e
            ),
            sync: {
              ...state.sync,
              pendingOperations: [
                ...state.sync.pendingOperations,
                createPendingOperation('update', 'knowledge', id, updates),
              ],
            },
          }));

          get().syncToSupabase();
        }
      },

      // Decisions
      recordDecision: (decisionData) => {
        const decision: SuggestionDecision = {
          ...decisionData,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };

        set((state) => ({
          decisions: [...state.decisions, decision],
          sync: {
            ...state.sync,
            pendingOperations: [
              ...state.sync.pendingOperations,
              createPendingOperation('create', 'decision', decision.id, decision),
            ],
          },
        }));

        get().syncToSupabase();
      },

      getDecisionsByCategory: (category) => {
        return get().decisions.filter((d) => d.category === category);
      },

      getDecisionsByProject: (projectId) => {
        return get().decisions.filter((d) => d.projectId === projectId);
      },

      // Projects
      createProject: (name, description, clientName) => {
        const project: Project = {
          id: crypto.randomUUID(),
          name,
          description,
          clientName,
          status: 'draft',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          currentPrompt: '',
          versions: [],
          tags: [],
        };

        set((state) => ({
          projects: [...state.projects, project],
          currentProjectId: project.id,
          sync: {
            ...state.sync,
            pendingOperations: [
              ...state.sync.pendingOperations,
              createPendingOperation('create', 'project', project.id, project),
            ],
          },
        }));

        get().syncToSupabase();
        return project.id;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
          sync: {
            ...state.sync,
            pendingOperations: [
              ...state.sync.pendingOperations,
              createPendingOperation('update', 'project', id, updates),
            ],
          },
        }));

        get().syncToSupabase();
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId:
            state.currentProjectId === id ? null : state.currentProjectId,
          sync: {
            ...state.sync,
            pendingOperations: [
              ...state.sync.pendingOperations,
              createPendingOperation('delete', 'project', id),
            ],
          },
        }));

        get().syncToSupabase();
      },

      setCurrentProject: (id) => {
        set({ currentProjectId: id });
      },

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find((p) => p.id === currentProjectId) || null;
      },

      saveVersionToProject: (projectId, content, label, changes = []) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return;

        const newVersion: PromptVersion = {
          id: crypto.randomUUID(),
          content,
          timestamp: Date.now(),
          label,
          changes,
          parentVersionId: project.versions.length > 0 ? project.versions[project.versions.length - 1].id : undefined,
        };

        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;

            return {
              ...p,
              currentPrompt: content,
              versions: [...p.versions, newVersion],
              updatedAt: Date.now(),
            };
          }),
          sync: {
            ...state.sync,
            pendingOperations: [
              ...state.sync.pendingOperations,
              createPendingOperation('create', 'version', newVersion.id, { ...newVersion, projectId }),
              createPendingOperation('update', 'project', projectId, { currentPrompt: content }),
            ],
          },
        }));

        get().syncToSupabase();
      },

      // Search
      searchEntries: (query, tags) => {
        const { entries } = get();
        const lowerQuery = query.toLowerCase();

        return entries.filter((e) => {
          const matchesQuery =
            !query ||
            e.title.toLowerCase().includes(lowerQuery) ||
            e.description.toLowerCase().includes(lowerQuery) ||
            e.tags.some((t) => t.toLowerCase().includes(lowerQuery));

          const matchesTags =
            !tags || tags.length === 0 || tags.some((t) => e.tags.includes(t));

          return matchesQuery && matchesTags;
        });
      },

      getEntriesByFeedbackType: (feedbackType) => {
        return get().entries.filter((e) => e.feedbackType === feedbackType);
      },

      getPatterns: () => {
        return get().entries.filter((e) => e.type === 'pattern');
      },

      getAntiPatterns: () => {
        return get().entries.filter((e) => e.type === 'anti_pattern');
      },

      // Export/Import
      exportCurrentProject: () => {
        const { projects, currentProjectId, decisions } = get();
        const project = projects.find((p) => p.id === currentProjectId);
        if (!project) {
          alert('No hay proyecto seleccionado');
          return;
        }
        const data = exportProject(project, decisions);
        const filename = generateFilename('single_project', project.name);
        downloadAsJson(data, filename);
      },

      exportAllProjects: () => {
        const { projects, decisions } = get();
        if (projects.length === 0) {
          alert('No hay proyectos para exportar');
          return;
        }
        const data = exportAllProjects(projects, decisions);
        const filename = generateFilename('all_projects');
        downloadAsJson(data, filename);
      },

      exportKnowledgeBase: () => {
        const { entries } = get();
        if (entries.length === 0) {
          alert('No hay entradas en la base de conocimiento');
          return;
        }
        const data = exportKnowledgeBase(entries);
        const filename = generateFilename('knowledge_base');
        downloadAsJson(data, filename);
      },

      exportFullBackup: () => {
        const { projects, entries, decisions } = get();
        const data = exportFullBackup(projects, entries, decisions);
        const filename = generateFilename('full_backup');
        downloadAsJson(data, filename);
      },

      importData: (rawData, options) => {
        if (!validateExportData(rawData)) {
          return { success: false, message: 'El archivo no tiene un formato válido de Ninjo' };
        }

        const data = rawData as ExportData;
        const { projects, entries, decisions } = get();

        let totalAdded = 0;
        let totalUpdated = 0;
        let totalSkipped = 0;

        // Import projects
        if (data.data.projects && data.data.projects.length > 0) {
          const result = mergeProjects(projects, data.data.projects, options);
          set({ projects: result.merged });
          totalAdded += result.added;
          totalUpdated += result.updated;
          totalSkipped += result.skipped;
        }

        // Import knowledge entries
        if (data.data.knowledgeEntries && data.data.knowledgeEntries.length > 0) {
          const result = mergeKnowledgeEntries(entries, data.data.knowledgeEntries, options);
          set({ entries: result.merged });
          totalAdded += result.added;
          totalUpdated += result.updated;
          totalSkipped += result.skipped;
        }

        // Import decisions
        if (data.data.decisions && data.data.decisions.length > 0) {
          const result = mergeDecisions(decisions, data.data.decisions, options);
          set({ decisions: result.merged });
          totalAdded += result.added;
          totalUpdated += result.updated;
          totalSkipped += result.skipped;
        }

        // Mark all imported data for sync
        const newOperations: PendingOperation[] = [];

        if (data.data.projects) {
          data.data.projects.forEach((p) => {
            newOperations.push(createPendingOperation('create', 'project', p.id, p));
            p.versions?.forEach((v) => {
              newOperations.push(createPendingOperation('create', 'version', v.id, { ...v, projectId: p.id }));
            });
          });
        }

        if (data.data.knowledgeEntries) {
          data.data.knowledgeEntries.forEach((e) => {
            newOperations.push(createPendingOperation('create', 'knowledge', e.id, e));
          });
        }

        if (data.data.decisions) {
          data.data.decisions.forEach((d) => {
            newOperations.push(createPendingOperation('create', 'decision', d.id, d));
          });
        }

        set((state) => ({
          sync: {
            ...state.sync,
            pendingOperations: [...state.sync.pendingOperations, ...newOperations],
          },
        }));

        get().syncToSupabase();

        return {
          success: true,
          message: `Importación completada`,
          details: { added: totalAdded, updated: totalUpdated, skipped: totalSkipped },
        };
      },

      // Supabase Sync Actions
      initializeFromSupabase: async () => {
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured, using localStorage only');
          return;
        }

        const deviceId = getSupabaseDeviceId();
        if (!deviceId) {
          console.log('Device not registered, skipping Supabase initialization');
          return;
        }

        set((state) => ({
          sync: { ...state.sync, isSyncing: true, syncError: null },
        }));

        try {
          // Fetch all data from Supabase
          const [supabaseProjects, supabaseEntries, supabaseDecisions] = await Promise.all([
            projectsRepository.getAll(deviceId),
            knowledgeRepository.getAll(deviceId),
            decisionsRepository.getAll(deviceId),
          ]);

          const localState = get();

          // Merge logic: if Supabase has data and local is empty, use Supabase data
          // If both have data, prefer local (it was modified while offline)
          // If local has pending operations, those will sync soon

          const mergedProjects = localState.projects.length > 0
            ? localState.projects
            : supabaseProjects;

          const mergedEntries = localState.entries.length > 0
            ? localState.entries
            : supabaseEntries;

          const mergedDecisions = localState.decisions.length > 0
            ? localState.decisions
            : supabaseDecisions;

          set({
            projects: mergedProjects,
            entries: mergedEntries,
            decisions: mergedDecisions,
            sync: {
              ...localState.sync,
              isSyncing: false,
              lastSyncedAt: Date.now(),
            },
          });

          // Process any pending operations
          await get().processPendingOperations();
        } catch (error) {
          console.error('Error initializing from Supabase:', error);
          set((state) => ({
            sync: {
              ...state.sync,
              isSyncing: false,
              syncError: error instanceof Error ? error.message : 'Error al sincronizar',
            },
          }));
        }
      },

      syncToSupabase: async () => {
        const { sync } = get();

        if (!isSupabaseConfigured() || sync.isSyncing || !sync.isOnline) {
          return;
        }

        await get().processPendingOperations();
      },

      setOnlineStatus: (isOnline) => {
        set((state) => ({
          sync: { ...state.sync, isOnline },
        }));

        // If coming back online, try to sync pending operations
        if (isOnline) {
          get().processPendingOperations();
        }
      },

      addPendingOperation: (operation) => {
        set((state) => ({
          sync: {
            ...state.sync,
            pendingOperations: [
              ...state.sync.pendingOperations,
              { ...operation, id: crypto.randomUUID(), timestamp: Date.now() },
            ],
          },
        }));
      },

      processPendingOperations: async () => {
        const { sync } = get();

        if (!isSupabaseConfigured() || !sync.isOnline || sync.pendingOperations.length === 0) {
          return;
        }

        const deviceId = getSupabaseDeviceId();
        if (!deviceId) {
          return;
        }

        set((state) => ({
          sync: { ...state.sync, isSyncing: true, syncError: null },
        }));

        const operations = [...sync.pendingOperations];
        const processedIds: string[] = [];

        for (const op of operations) {
          try {
            let success = false;

            switch (op.entity) {
              case 'project': {
                if (op.type === 'create') {
                  const projectData = op.data as Project;
                  const result = await projectsRepository.create(
                    projectData,
                    deviceId
                  );
                  success = !!result;
                } else if (op.type === 'update') {
                  success = await projectsRepository.update(op.entityId, op.data as Partial<Project>);
                } else if (op.type === 'delete') {
                  success = await projectsRepository.delete(op.entityId);
                }
                break;
              }
              case 'version': {
                if (op.type === 'create') {
                  const versionData = op.data as PromptVersion & { projectId: string };
                  const result = await versionsRepository.createWithId(
                    versionData,
                    versionData.projectId
                  );
                  success = !!result;
                }
                break;
              }
              case 'knowledge': {
                if (op.type === 'create') {
                  const entryData = op.data as KnowledgeEntry;
                  const result = await knowledgeRepository.createWithId(entryData, deviceId);
                  success = !!result;
                } else if (op.type === 'update') {
                  success = await knowledgeRepository.update(op.entityId, op.data as Partial<KnowledgeEntry>);
                } else if (op.type === 'delete') {
                  success = await knowledgeRepository.delete(op.entityId);
                }
                break;
              }
              case 'decision': {
                if (op.type === 'create') {
                  const decisionData = op.data as SuggestionDecision;
                  const result = await decisionsRepository.createWithId(decisionData, deviceId);
                  success = !!result;
                } else if (op.type === 'update') {
                  success = await decisionsRepository.update(op.entityId, op.data as Partial<SuggestionDecision>);
                } else if (op.type === 'delete') {
                  success = await decisionsRepository.delete(op.entityId);
                }
                break;
              }
            }

            if (success) {
              processedIds.push(op.id);
            }
          } catch (error) {
            console.error(`Error processing operation ${op.id}:`, error);
            // Continue with other operations
          }
        }

        // Remove processed operations
        set((state) => ({
          sync: {
            ...state.sync,
            isSyncing: false,
            lastSyncedAt: processedIds.length > 0 ? Date.now() : state.sync.lastSyncedAt,
            pendingOperations: state.sync.pendingOperations.filter(
              (op) => !processedIds.includes(op.id)
            ),
          },
        }));
      },

      clearSyncError: () => {
        set((state) => ({
          sync: { ...state.sync, syncError: null },
        }));
      },
    }),
    {
      name: 'ninjo-knowledge-storage',
      partialize: (state) => ({
        entries: state.entries,
        decisions: state.decisions,
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        sync: {
          ...state.sync,
          // Don't persist transient sync state
          isSyncing: false,
        },
      }),
    }
  )
);
