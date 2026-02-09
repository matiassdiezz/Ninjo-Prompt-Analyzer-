import type { FlowData } from '@/types/flow';

// Chat message for QA conversations
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Version with detailed change tracking
export interface PromptVersion {
  id: string;
  content: string;
  timestamp: number;
  label: string;
  changes?: VersionChange[];
  parentVersionId?: string;
  // NEW: Top-level change type for quick filtering/display
  changeType?: 'manual' | 'suggestion_applied' | 'auto_save';
  changeDetails?: {
    suggestionId?: string;
    category?: string;
    sectionTitle?: string;
  };
  // Chat history at the time of this version
  chatHistory?: ChatMessage[];
}

export interface VersionChange {
  type: 'suggestion_applied' | 'suggestion_rejected' | 'manual_edit';
  sectionId?: string;
  description: string;
  justification?: string;
  category?: string;
}

// Agent within a project (each agent has its own prompt, versions, chat, etc.)
export interface Agent {
  id: string;
  projectId: string;
  name: string;              // "Bot de WhatsApp", "Instagram DM"
  channelType: string;       // flexible: "whatsapp", "instagram", "tiktok", "web", etc.
  description?: string;
  currentPrompt: string;
  versions: PromptVersion[];
  annotations: PromptAnnotation[];
  chatMessages: ChatMessage[];
  flowData?: FlowData;
  createdAt: number;
  updatedAt: number;
}

// Project to group agents
export interface Project {
  id: string;
  name: string;
  description: string;
  clientName?: string;
  status: 'en_proceso' | 'revision_cliente' | 'finalizado' | 'archivado';
  createdAt: number;
  updatedAt: number;
  tags: string[];
  // Multi-agent support
  agents: Agent[];
  currentAgentId: string | null;
  sharedContext?: string;       // Info del negocio compartida entre agentes
}

// Knowledge category types
export type KnowledgeCategory =
  | 'tono'
  | 'saludo'
  | 'keywords'
  | 'calificacion'
  | 'objeciones'
  | 'flujo'
  | 'conversion'
  | 'formato'
  | 'knowledge_base'
  | 'general';

// Knowledge base entry
export interface KnowledgeEntry {
  id: string;
  type: 'pattern' | 'anti_pattern';
  title: string;
  description: string;
  example?: string;
  tags: string[];
  feedbackType?: string; // What type of client feedback this solves
  effectiveness: 'high' | 'medium' | 'low';
  createdAt: number;
  usageCount: number;
  projectIds: string[]; // Which projects used this
  category?: KnowledgeCategory; // Primary category for organization
}

// Suggestion decision for learning
export interface SuggestionDecision {
  id: string;
  sectionId: string;
  projectId: string;
  decision: 'accepted' | 'rejected' | 'modified';
  justification: string;
  originalText: string;
  suggestedText: string;
  finalText?: string; // If modified
  category: string;
  severity: string;
  timestamp: number;
  savedToKnowledge: boolean;
}

// Inline annotations/comments on prompt text
export interface PromptAnnotation {
  id: string;
  // Text selection range (character indices)
  startOffset: number;
  endOffset: number;
  // The selected text at the time of annotation
  selectedText: string;
  // User's comment
  comment: string;
  // Type of annotation
  type: 'note' | 'improvement' | 'warning' | 'question';
  // Optional: convert to knowledge entry
  savedAsKnowledge: boolean;
  knowledgeEntryId?: string;
  // Metadata
  createdAt: number;
  updatedAt: number;
}

// Legacy support
export interface Prompt {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// Fase 4: Colaboración - Comentarios en learnings
export interface LearningComment {
  id: string;
  learningId: string;
  deviceId: string;
  authorName?: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// Fase 4: Colaboración - Votos de efectividad
export interface LearningVote {
  id: string;
  learningId: string;
  deviceId: string;
  vote: -1 | 1;
  createdAt: number;
}

// Fase 4: Colaboración - Progreso de onboarding
export interface OnboardingProgress {
  deviceId: string;
  learningId: string;
  markedRead: boolean;
  readAt?: number;
}
