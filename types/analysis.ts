export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export type CategoryType =
  | 'mission'
  | 'persona'
  | 'flow'
  | 'guardrails'
  | 'engagement'
  | 'examples'
  | 'efficiency'
  | 'hallucination';

export interface AgentProfile {
  detectedMission: string;
  targetAudience: string;
  tone: string;
  strengths: string[];
  concerns: string[];
}

export interface AnalysisSection {
  id: string;
  originalText: string;
  startIndex: number;
  endIndex: number;
  category: CategoryType;
  issues: string[];
  suggestedRewrite: string;
  explanation: string;
  severity: SeverityLevel;
  impact: string;
}

export interface Inconsistency {
  id: string;
  description: string;
  locations: string[];
  suggestion: string;
}

export interface MissingElement {
  element: string;
  importance: SeverityLevel;
  suggestion: string;
}

export interface AnalysisScores {
  clarity: number;
  consistency: number;
  completeness: number;
  engagement: number;
  safety: number;
  overall: number;
}

export interface AnalysisResult {
  agentProfile: AgentProfile;
  sections: AnalysisSection[];
  inconsistencies: Inconsistency[];
  missingElements: MissingElement[];
  scores: AnalysisScores;
  overallFeedback: string;
  topPriorities: string[];
  timestamp: number;
}

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'edited';

export interface SuggestionState {
  sectionId: string;
  status: SuggestionStatus;
  editedRewrite?: string;
}

// Category display info
export const CATEGORY_INFO: Record<CategoryType, { label: string; color: string }> = {
  mission: { label: 'Misión', color: 'blue' },
  persona: { label: 'Persona', color: 'purple' },
  flow: { label: 'Flujo', color: 'green' },
  guardrails: { label: 'Guardrails', color: 'red' },
  engagement: { label: 'Engagement', color: 'yellow' },
  examples: { label: 'Ejemplos', color: 'indigo' },
  efficiency: { label: 'Eficiencia', color: 'gray' },
  hallucination: { label: 'Alucinación', color: 'orange' },
};
