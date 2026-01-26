// Version with detailed change tracking
export interface PromptVersion {
  id: string;
  content: string;
  timestamp: number;
  label: string;
  changes?: VersionChange[];
  parentVersionId?: string;
}

export interface VersionChange {
  type: 'suggestion_applied' | 'suggestion_rejected' | 'manual_edit';
  sectionId?: string;
  description: string;
  justification?: string;
  category?: string;
}

// Project to group prompts
export interface Project {
  id: string;
  name: string;
  description: string;
  clientName?: string;
  status: 'draft' | 'in_progress' | 'deployed' | 'archived';
  createdAt: number;
  updatedAt: number;
  currentPrompt: string;
  versions: PromptVersion[];
  tags: string[];
}

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

// Legacy support
export interface Prompt {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}
