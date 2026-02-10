import type {
  Project, Agent, PromptVersion, PromptAnnotation,
  ChatMessage, KnowledgeEntry, SuggestionDecision,
  VersionChange, KnowledgeCategory,
} from '@/types/prompt';
import type { FlowData, FlowSourceOrigin } from '@/types/flow';

// ── Database Row Types ──

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
  tags: string[];
  current_agent_id: string | null;
  shared_context: string;
  created_at: string;
  updated_at: string;
}

export interface DbAgent {
  id: string;
  project_id: string;
  name: string;
  channel_type: string;
  description: string | null;
  current_prompt: string;
  annotations: PromptAnnotation[];
  chat_messages: ChatMessage[];
  flow_data: FlowData | null;
  flow_source_origin: FlowSourceOrigin | null;
  created_at: string;
  updated_at: string;
}

export interface DbPromptVersion {
  id: string;
  agent_id: string;
  content: string;
  label: string;
  parent_version_id: string | null;
  changes: VersionChange[];
  change_type: string | null;
  change_details: Record<string, string> | null;
  chat_history: ChatMessage[] | null;
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
  category: string | null;
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

// ── Insert Types ──

export interface DbProjectInsert {
  id: string;
  device_id: string;
  name: string;
  description: string;
  client_name?: string | null;
  status: 'en_proceso' | 'revision_cliente' | 'finalizado' | 'archivado';
  tags: string[];
  current_agent_id?: string | null;
  shared_context?: string;
}

export interface DbAgentInsert {
  id: string;
  project_id: string;
  name: string;
  channel_type: string;
  description?: string | null;
  current_prompt: string;
  annotations: PromptAnnotation[];
  chat_messages: ChatMessage[];
  flow_data?: FlowData | null;
  flow_source_origin?: FlowSourceOrigin | null;
}

export interface DbPromptVersionInsert {
  id: string;
  agent_id: string;
  content: string;
  label: string;
  parent_version_id?: string | null;
  changes: VersionChange[];
  change_type?: string | null;
  change_details?: Record<string, string> | null;
  chat_history?: ChatMessage[] | null;
}

export interface DbKnowledgeEntryInsert {
  id: string;
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
  category?: string | null;
}

export interface DbSuggestionDecisionInsert {
  id: string;
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

// ── Mappers: DB -> App ──

export function mapDbAgentToApp(
  dbAgent: DbAgent,
  versions: DbPromptVersion[]
): Agent {
  return {
    id: dbAgent.id,
    projectId: dbAgent.project_id,
    name: dbAgent.name,
    channelType: dbAgent.channel_type,
    description: dbAgent.description || undefined,
    currentPrompt: dbAgent.current_prompt,
    versions: versions.map(mapDbVersionToApp),
    annotations: dbAgent.annotations || [],
    chatMessages: dbAgent.chat_messages || [],
    flowData: dbAgent.flow_data || undefined,
    flowSourceOrigin: dbAgent.flow_source_origin || undefined,
    createdAt: new Date(dbAgent.created_at).getTime(),
    updatedAt: new Date(dbAgent.updated_at).getTime(),
  };
}

export function mapDbProjectToApp(
  dbProject: DbProject,
  agents: Agent[]
): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description,
    clientName: dbProject.client_name || undefined,
    status: dbProject.status,
    createdAt: new Date(dbProject.created_at).getTime(),
    updatedAt: new Date(dbProject.updated_at).getTime(),
    tags: dbProject.tags,
    agents,
    currentAgentId: dbProject.current_agent_id,
    sharedContext: dbProject.shared_context || '',
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
    changeType: (dbVersion.change_type as PromptVersion['changeType']) || undefined,
    changeDetails: dbVersion.change_details || undefined,
    chatHistory: dbVersion.chat_history || undefined,
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
    category: (dbEntry.category as KnowledgeCategory) || undefined,
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

// ── Mappers: App -> DB Insert ──

export function mapAppProjectToDbInsert(project: Project, deviceId: string): DbProjectInsert {
  return {
    id: project.id,
    device_id: deviceId,
    name: project.name,
    description: project.description,
    client_name: project.clientName || null,
    status: project.status,
    tags: project.tags,
    current_agent_id: project.currentAgentId || null,
    shared_context: project.sharedContext || '',
  };
}

export function mapAppAgentToDbInsert(agent: Agent): DbAgentInsert {
  return {
    id: agent.id,
    project_id: agent.projectId,
    name: agent.name,
    channel_type: agent.channelType,
    description: agent.description || null,
    current_prompt: agent.currentPrompt,
    annotations: agent.annotations || [],
    chat_messages: agent.chatMessages || [],
    flow_data: agent.flowData || null,
    flow_source_origin: agent.flowSourceOrigin || null,
  };
}

export function mapAppVersionToDbInsert(version: PromptVersion, agentId: string): DbPromptVersionInsert {
  return {
    id: version.id,
    agent_id: agentId,
    content: version.content,
    label: version.label,
    parent_version_id: version.parentVersionId || null,
    changes: version.changes || [],
    change_type: version.changeType || null,
    change_details: version.changeDetails || null,
    chat_history: version.chatHistory || null,
  };
}

export function mapAppKnowledgeEntryToDbInsert(entry: KnowledgeEntry, deviceId: string): DbKnowledgeEntryInsert {
  return {
    id: entry.id,
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
    category: entry.category || null,
  };
}

export function mapAppDecisionToDbInsert(decision: SuggestionDecision, deviceId: string): DbSuggestionDecisionInsert {
  return {
    id: decision.id,
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
