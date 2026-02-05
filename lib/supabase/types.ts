import type { Project, PromptVersion, KnowledgeEntry, SuggestionDecision, VersionChange } from '@/types/prompt';

// Database row types
// Note: status now uses the same Spanish values as the app (enum nativo en Supabase)
export interface DbDevice {
  id: string;
  device_fingerprint: string;
  created_at: string;
  last_seen_at: string;
}

export interface DbProject {
  id: string;
  device_id: string;
  name: string;
  description: string;
  client_name: string | null;
  status: 'en_proceso' | 'revision_cliente' | 'finalizado' | 'archivado';
  current_prompt: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DbPromptVersion {
  id: string;
  project_id: string;
  content: string;
  label: string;
  parent_version_id: string | null;
  changes: VersionChange[];
  created_at: string;
}

export interface DbKnowledgeEntry {
  id: string;
  device_id: string;
  type: 'pattern' | 'anti_pattern';
  title: string;
  description: string;
  example: string | null;
  tags: string[];
  feedback_type: string | null;
  effectiveness: 'high' | 'medium' | 'low';
  usage_count: number;
  project_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface DbSuggestionDecision {
  id: string;
  device_id: string;
  project_id: string;
  section_id: string;
  decision: 'accepted' | 'rejected' | 'modified';
  justification: string;
  original_text: string;
  suggested_text: string;
  final_text: string | null;
  category: string;
  severity: string;
  saved_to_knowledge: boolean;
  created_at: string;
}

// Fase 4: Colaboración - Comentarios
export interface DbLearningComment {
  id: string;
  learning_id: string;
  device_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

// Fase 4: Colaboración - Votos
export interface DbLearningVote {
  id: string;
  learning_id: string;
  device_id: string;
  vote: -1 | 1;
  created_at: string;
}

// Fase 4: Colaboración - Onboarding
export interface DbOnboardingProgress {
  device_id: string;
  learning_id: string;
  marked_read: boolean;
  read_at: string | null;
}

// Mappers: DB -> App
export function mapDbProjectToApp(dbProject: DbProject, versions: DbPromptVersion[]): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description,
    clientName: dbProject.client_name || undefined,
    status: dbProject.status, // Direct mapping - same values in DB and app
    createdAt: new Date(dbProject.created_at).getTime(),
    updatedAt: new Date(dbProject.updated_at).getTime(),
    currentPrompt: dbProject.current_prompt,
    versions: versions.map(mapDbVersionToApp),
    tags: dbProject.tags,
  };
}

export function mapDbVersionToApp(dbVersion: DbPromptVersion): PromptVersion {
  return {
    id: dbVersion.id,
    content: dbVersion.content,
    timestamp: new Date(dbVersion.created_at).getTime(),
    label: dbVersion.label,
    changes: dbVersion.changes,
    parentVersionId: dbVersion.parent_version_id || undefined,
  };
}

export function mapDbKnowledgeEntryToApp(dbEntry: DbKnowledgeEntry): KnowledgeEntry {
  return {
    id: dbEntry.id,
    type: dbEntry.type,
    title: dbEntry.title,
    description: dbEntry.description,
    example: dbEntry.example || undefined,
    tags: dbEntry.tags,
    feedbackType: dbEntry.feedback_type || undefined,
    effectiveness: dbEntry.effectiveness,
    createdAt: new Date(dbEntry.created_at).getTime(),
    usageCount: dbEntry.usage_count,
    projectIds: dbEntry.project_ids,
  };
}

export function mapDbDecisionToApp(dbDecision: DbSuggestionDecision): SuggestionDecision {
  return {
    id: dbDecision.id,
    sectionId: dbDecision.section_id,
    projectId: dbDecision.project_id,
    decision: dbDecision.decision,
    justification: dbDecision.justification,
    originalText: dbDecision.original_text,
    suggestedText: dbDecision.suggested_text,
    finalText: dbDecision.final_text || undefined,
    category: dbDecision.category,
    severity: dbDecision.severity,
    timestamp: new Date(dbDecision.created_at).getTime(),
    savedToKnowledge: dbDecision.saved_to_knowledge,
  };
}

// Mappers: App -> DB Insert types
export interface DbProjectInsert {
  id?: string;
  device_id: string;
  name: string;
  description: string;
  client_name?: string | null;
  status: 'en_proceso' | 'revision_cliente' | 'finalizado' | 'archivado';
  current_prompt: string;
  tags: string[];
}

export interface DbPromptVersionInsert {
  id?: string;
  project_id: string;
  content: string;
  label: string;
  parent_version_id?: string | null;
  changes: VersionChange[];
}

export interface DbKnowledgeEntryInsert {
  id?: string;
  device_id: string;
  type: 'pattern' | 'anti_pattern';
  title: string;
  description: string;
  example?: string | null;
  tags: string[];
  feedback_type?: string | null;
  effectiveness: 'high' | 'medium' | 'low';
  usage_count: number;
  project_ids: string[];
}

export interface DbSuggestionDecisionInsert {
  id?: string;
  device_id: string;
  project_id: string;
  section_id: string;
  decision: 'accepted' | 'rejected' | 'modified';
  justification: string;
  original_text: string;
  suggested_text: string;
  final_text?: string | null;
  category: string;
  severity: string;
  saved_to_knowledge: boolean;
}

export function mapAppProjectToDbInsert(project: Project, deviceId: string): DbProjectInsert {
  return {
    device_id: deviceId,
    name: project.name,
    description: project.description,
    client_name: project.clientName || null,
    status: project.status, // Direct mapping - same values in DB and app
    current_prompt: project.currentPrompt,
    tags: project.tags,
  };
}

export function mapAppVersionToDbInsert(version: PromptVersion, projectId: string): DbPromptVersionInsert {
  return {
    project_id: projectId,
    content: version.content,
    label: version.label,
    parent_version_id: version.parentVersionId || null,
    changes: version.changes || [],
  };
}

export function mapAppKnowledgeEntryToDbInsert(entry: KnowledgeEntry, deviceId: string): DbKnowledgeEntryInsert {
  return {
    device_id: deviceId,
    type: entry.type,
    title: entry.title,
    description: entry.description,
    example: entry.example || null,
    tags: entry.tags,
    feedback_type: entry.feedbackType || null,
    effectiveness: entry.effectiveness,
    usage_count: entry.usageCount,
    project_ids: entry.projectIds,
  };
}

export function mapAppDecisionToDbInsert(decision: SuggestionDecision, deviceId: string): DbSuggestionDecisionInsert {
  return {
    device_id: deviceId,
    project_id: decision.projectId,
    section_id: decision.sectionId,
    decision: decision.decision,
    justification: decision.justification,
    original_text: decision.originalText,
    suggested_text: decision.suggestedText,
    final_text: decision.finalText || null,
    category: decision.category,
    severity: decision.severity,
    saved_to_knowledge: decision.savedToKnowledge,
  };
}
