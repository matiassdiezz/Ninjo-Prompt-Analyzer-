import type { Project, KnowledgeEntry, SuggestionDecision } from '@/types/prompt';

// Export format version for future compatibility
const EXPORT_VERSION = '1.0';

export interface ExportData {
  version: string;
  exportedAt: number;
  type: 'single_project' | 'all_projects' | 'knowledge_base' | 'full_backup';
  data: {
    projects?: Project[];
    knowledgeEntries?: KnowledgeEntry[];
    decisions?: SuggestionDecision[];
  };
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported?: {
    projects: number;
    knowledgeEntries: number;
    decisions: number;
  };
  errors?: string[];
}

// Validate export data structure
export function validateExportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  if (typeof d.version !== 'string') return false;
  if (typeof d.exportedAt !== 'number') return false;
  if (!['single_project', 'all_projects', 'knowledge_base', 'full_backup'].includes(d.type as string)) return false;
  if (!d.data || typeof d.data !== 'object') return false;

  return true;
}

// Export a single project
export function exportProject(project: Project, decisions: SuggestionDecision[]): ExportData {
  const projectDecisions = decisions.filter(d => d.projectId === project.id);

  return {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    type: 'single_project',
    data: {
      projects: [project],
      decisions: projectDecisions,
    },
  };
}

// Export all projects
export function exportAllProjects(
  projects: Project[],
  decisions: SuggestionDecision[]
): ExportData {
  return {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    type: 'all_projects',
    data: {
      projects,
      decisions,
    },
  };
}

// Export knowledge base
export function exportKnowledgeBase(entries: KnowledgeEntry[]): ExportData {
  return {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    type: 'knowledge_base',
    data: {
      knowledgeEntries: entries,
    },
  };
}

// Export everything (full backup)
export function exportFullBackup(
  projects: Project[],
  knowledgeEntries: KnowledgeEntry[],
  decisions: SuggestionDecision[]
): ExportData {
  return {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    type: 'full_backup',
    data: {
      projects,
      knowledgeEntries,
      decisions,
    },
  };
}

// Download JSON file
export function downloadAsJson(data: ExportData, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate filename based on export type
export function generateFilename(type: ExportData['type'], projectName?: string): string {
  const date = new Date().toISOString().split('T')[0];

  switch (type) {
    case 'single_project':
      const safeName = (projectName || 'proyecto').toLowerCase().replace(/[^a-z0-9]/g, '-');
      return `ninjo-${safeName}-${date}.json`;
    case 'all_projects':
      return `ninjo-todos-proyectos-${date}.json`;
    case 'knowledge_base':
      return `ninjo-knowledge-base-${date}.json`;
    case 'full_backup':
      return `ninjo-backup-completo-${date}.json`;
    default:
      return `ninjo-export-${date}.json`;
  }
}

// Read file as JSON
export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (err) {
        reject(new Error('El archivo no es un JSON válido'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });
}

// Merge imported data with existing data (handles duplicates)
export interface MergeOptions {
  overwriteExisting: boolean;
  mergeVersions: boolean; // For projects, merge versions instead of replacing
}

export function mergeProjects(
  existing: Project[],
  imported: Project[],
  options: MergeOptions
): { merged: Project[]; added: number; updated: number; skipped: number } {
  const result = [...existing];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const importedProject of imported) {
    const existingIndex = result.findIndex(p => p.id === importedProject.id);

    if (existingIndex === -1) {
      // New project, add it
      result.push(importedProject);
      added++;
    } else if (options.overwriteExisting) {
      if (options.mergeVersions) {
        // Merge versions from both
        const existingVersionIds = new Set(result[existingIndex].versions.map(v => v.id));
        const newVersions = importedProject.versions.filter(v => !existingVersionIds.has(v.id));
        result[existingIndex] = {
          ...importedProject,
          versions: [...result[existingIndex].versions, ...newVersions],
          updatedAt: Date.now(),
        };
      } else {
        result[existingIndex] = importedProject;
      }
      updated++;
    } else {
      skipped++;
    }
  }

  return { merged: result, added, updated, skipped };
}

export function mergeKnowledgeEntries(
  existing: KnowledgeEntry[],
  imported: KnowledgeEntry[],
  options: MergeOptions
): { merged: KnowledgeEntry[]; added: number; updated: number; skipped: number } {
  const result = [...existing];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const importedEntry of imported) {
    const existingIndex = result.findIndex(e => e.id === importedEntry.id);

    if (existingIndex === -1) {
      result.push(importedEntry);
      added++;
    } else if (options.overwriteExisting) {
      result[existingIndex] = importedEntry;
      updated++;
    } else {
      skipped++;
    }
  }

  return { merged: result, added, updated, skipped };
}

export function mergeDecisions(
  existing: SuggestionDecision[],
  imported: SuggestionDecision[],
  options: MergeOptions
): { merged: SuggestionDecision[]; added: number; updated: number; skipped: number } {
  const result = [...existing];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const importedDecision of imported) {
    const existingIndex = result.findIndex(d => d.id === importedDecision.id);

    if (existingIndex === -1) {
      result.push(importedDecision);
      added++;
    } else if (options.overwriteExisting) {
      result[existingIndex] = importedDecision;
      updated++;
    } else {
      skipped++;
    }
  }

  return { merged: result, added, updated, skipped };
}
