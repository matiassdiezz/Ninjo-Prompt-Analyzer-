import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KnowledgeEntry, SuggestionDecision, Project, PromptVersion, Agent } from '@/types/prompt';
import { migrateProjectsToAgents } from '@/lib/migrations/migrateToAgents';
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
type EntityType = 'project' | 'version' | 'knowledge' | 'decision' | 'agent';

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
  lastError: { operation: string; message: string; timestamp: number } | null;
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

  // Actions - Agents
  createAgent: (projectId: string, name: string, channelType: string, description?: string) => string;
  updateAgent: (projectId: string, agentId: string, updates: Partial<Agent>) => void;
  deleteAgent: (projectId: string, agentId: string) => void;
  setCurrentAgent: (projectId: string, agentId: string | null) => void;
  getCurrentAgent: () => Agent | null;

  // Actions - Search
  searchEntries: (query: string, tags?: string[]) => KnowledgeEntry[];
  getEntriesByFeedbackType: (feedbackType: string) => KnowledgeEntry[];
  getPatterns: () => KnowledgeEntry[];
  getAntiPatterns: () => KnowledgeEntry[];
  findRelevantLearnings: (sectionTitle: string, sectionContent: string, sectionType?: string, limit?: number) => KnowledgeEntry[];

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

// Helper: ordenar versiones topológicamente (padres antes que hijos)
function topologicalSortVersions(versionOps: PendingOperation[]): PendingOperation[] {
  const sorted: PendingOperation[] = [];
  const visited = new Set<string>();
  const opMap = new Map(versionOps.map(op => [op.entityId, op]));

  function visit(op: PendingOperation) {
    if (visited.has(op.entityId)) return;
    visited.add(op.entityId);

    // Si tiene parent, visitar primero
    const parentId = (op.data as { parentVersionId?: string })?.parentVersionId;
    if (parentId && opMap.has(parentId)) {
      visit(opMap.get(parentId)!);
    }

    sorted.push(op);
  }

  for (const op of versionOps) {
    visit(op);
  }

  return sorted;
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
        lastError: null,
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
          status: 'en_proceso',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: [],
          agents: [],
          currentAgentId: null,
          sharedContext: '',
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
        const project = get().projects.find((p) => p.id === id);
        if (!project) return;

        // Excluir agents del update del proyecto (se manejan via updateAgent)
        const { agents: _agents, ...projectUpdates } = updates;

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
          sync: {
            ...state.sync,
            pendingOperations: [
              ...state.sync.pendingOperations,
              ...(Object.keys(projectUpdates).length > 0
                ? [createPendingOperation('update', 'project', id, projectUpdates)]
                : []),
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

        const agent = project.agents.find(a => a.id === project.currentAgentId);
        if (!agent) return;

        const newVersion: PromptVersion = {
          id: crypto.randomUUID(),
          content,
          timestamp: Date.now(),
          label,
          changes,
          parentVersionId: agent.versions.length > 0 ? agent.versions[agent.versions.length - 1].id : undefined,
        };

        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;

            return {
              ...p,
              agents: p.agents.map(a => {
                if (a.id !== p.currentAgentId) return a;
                return {
                  ...a,
                  currentPrompt: content,
                  versions: [...a.versions, newVersion],
                  updatedAt: Date.now(),
                };
              }),
              updatedAt: Date.now(),
            };
          }),
          sync: {
            ...state.sync,
            pendingOperations: [
              ...state.sync.pendingOperations,
              createPendingOperation('create', 'version', newVersion.id, { ...newVersion, projectId }),
            ],
          },
        }));

        get().syncToSupabase();
      },

      // Agent CRUD
      createAgent: (projectId, name, channelType, description) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project) return '';

        const agent: Agent = {
          id: crypto.randomUUID(),
          projectId,
          name,
          channelType,
          description,
          currentPrompt: '',
          versions: [],
          annotations: [],
          chatMessages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              agents: [...p.agents, agent],
              currentAgentId: agent.id,
              updatedAt: Date.now(),
            };
          }),
        }));

        return agent.id;
      },

      updateAgent: (projectId, agentId, updates) => {
        set((state) => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              agents: p.agents.map(a => {
                if (a.id !== agentId) return a;
                return { ...a, ...updates, updatedAt: Date.now() };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteAgent: (projectId, agentId) => {
        set((state) => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            const filtered = p.agents.filter(a => a.id !== agentId);
            return {
              ...p,
              agents: filtered,
              currentAgentId: p.currentAgentId === agentId
                ? (filtered.length > 0 ? filtered[0].id : null)
                : p.currentAgentId,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      setCurrentAgent: (projectId, agentId) => {
        set((state) => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, currentAgentId: agentId };
          }),
        }));
      },

      getCurrentAgent: () => {
        const { projects, currentProjectId } = get();
        const project = projects.find(p => p.id === currentProjectId);
        if (!project) return null;
        return project.agents.find(a => a.id === project.currentAgentId) || null;
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

      findRelevantLearnings: (sectionTitle, sectionContent, sectionType, limit = 5) => {
        const { entries } = get();
        
        // Extract keywords from section
        const extractKeywords = (text: string): string[] => {
          const words = text
            .toLowerCase()
            .replace(/[^\w\sáéíóúñ]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3);
          
          const stopWords = new Set(['para', 'que', 'con', 'por', 'como', 'este', 'esta', 'esto', 'the', 'and', 'for', 'with']);
          return words.filter(w => !stopWords.has(w));
        };
        
        const sectionKeywords = extractKeywords(sectionTitle + ' ' + sectionContent);
        
        // Calculate relevance score for each entry
        const scored = entries.map(entry => {
          let score = 0;
          
          // Match by tags
          const sectionTags = [
            sectionType,
            ...sectionKeywords.slice(0, 5)
          ].filter(Boolean);
          
          const matchingTags = entry.tags.filter(t => 
            sectionTags.some(st => st && st.toLowerCase().includes(t.toLowerCase()))
          );
          score += matchingTags.length * 10;
          
          // Match by keywords in title/description
          const entryText = (entry.title + ' ' + entry.description).toLowerCase();
          sectionKeywords.forEach(kw => {
            if (entryText.includes(kw.toLowerCase())) {
              score += 5;
            }
          });
          
          // Boost by effectiveness
          score += entry.effectiveness === 'high' ? 15 : 
                   entry.effectiveness === 'medium' ? 10 : 5;
          
          // Boost by usage frequency
          score += Math.min(entry.usageCount * 2, 20);
          
          return { entry, score };
        });
        
        // Filter by minimum score and sort
        return scored
          .filter(s => s.score > 10)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(s => s.entry);
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
          data.data.projects.forEach((p: any) => {
            newOperations.push(createPendingOperation('create', 'project', p.id, p));
            // Versions are now inside agents
            const agents = p.agents || [];
            agents.forEach((a: any) => {
              a.versions?.forEach((v: any) => {
                newOperations.push(createPendingOperation('create', 'version', v.id, { ...v, projectId: p.id }));
              });
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

        if (!isSupabaseConfigured()) {
          set((state) => ({
            sync: {
              ...state.sync,
              lastError: {
                operation: 'syncToSupabase',
                message: 'Supabase no está configurado',
                timestamp: Date.now(),
              },
            },
          }));
          return;
        }

        if (sync.isSyncing) {
          // Already syncing, don't start another sync
          return;
        }

        if (!sync.isOnline) {
          set((state) => ({
            sync: {
              ...state.sync,
              lastError: {
                operation: 'syncToSupabase',
                message: 'Sin conexión a internet',
                timestamp: Date.now(),
              },
            },
          }));
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
          set((state) => ({
            sync: {
              ...state.sync,
              lastError: {
                operation: 'processPendingOperations',
                message: 'Device ID no encontrado',
                timestamp: Date.now(),
              },
            },
          }));
          return;
        }

        set((state) => ({
          sync: { ...state.sync, isSyncing: true, syncError: null },
        }));

        // Sort operations by dependency order:
        // 1. Projects first (versions depend on them)
        // 2. Versions second (sorted topologically so parents come before children)
        // 3. Knowledge and decisions last
        const entityOrder: Record<string, number> = {
          project: 1,
          version: 2,
          knowledge: 3,
          decision: 4,
        };

        // First, separate operations by entity type
        const pendingOps = [...sync.pendingOperations];
        const versionOps = pendingOps.filter(op => op.entity === 'version');
        const otherOps = pendingOps.filter(op => op.entity !== 'version');

        // Sort non-version operations by entity order
        otherOps.sort((a, b) => {
          return (entityOrder[a.entity] || 99) - (entityOrder[b.entity] || 99);
        });

        // Topological sort of versions by parentVersionId (parents before children)
        const sortedVersionOps = topologicalSortVersions(versionOps);

        // Combine: projects first, then sorted versions, then knowledge/decisions
        const operations = [
          ...otherOps.filter(op => entityOrder[op.entity] < 2), // projects
          ...sortedVersionOps,                                   // versions (topologically sorted)
          ...otherOps.filter(op => entityOrder[op.entity] > 2),  // knowledge, decisions
        ];

        const processedIds: string[] = [];
        const failedOperations: { op: PendingOperation; error: string }[] = [];
        const MAX_RETRIES = 3;

        for (const op of operations) {
          let success = false;
          let lastError = '';

          // Retry loop
          for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
            try {
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
            } catch (error) {
              lastError = error instanceof Error ? error.message : 'Error desconocido';
              console.error(`Error processing operation ${op.id} (attempt ${attempt}/${MAX_RETRIES}):`, error);

              // Wait before retry (exponential backoff)
              if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
              }
            }
          }

          if (success) {
            processedIds.push(op.id);
          } else {
            failedOperations.push({ op, error: lastError || 'Operación falló después de reintentos' });
          }
        }

        // Update state with results
        const remainingOps = sync.pendingOperations.filter(
          (op) => !processedIds.includes(op.id)
        );

        set((state) => ({
          sync: {
            ...state.sync,
            isSyncing: false,
            lastSyncedAt: processedIds.length > 0 ? Date.now() : state.sync.lastSyncedAt,
            pendingOperations: remainingOps,
            lastError: failedOperations.length > 0
              ? {
                  operation: `${failedOperations[0].op.type} ${failedOperations[0].op.entity}`,
                  message: failedOperations[0].error,
                  timestamp: Date.now(),
                }
              : state.sync.lastError,
            syncError: failedOperations.length > 0
              ? `${failedOperations.length} operación(es) fallaron`
              : null,
          },
        }));
      },

      clearSyncError: () => {
        set((state) => ({
          sync: { ...state.sync, syncError: null, lastError: null },
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
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Migrate legacy projects (currentPrompt at project level) to agents[]
        const needsMigration = state.projects.some((p: any) => !Array.isArray(p.agents));
        if (needsMigration) {
          state.projects = migrateProjectsToAgents(state.projects);
        }
      },
    }
  )
);
