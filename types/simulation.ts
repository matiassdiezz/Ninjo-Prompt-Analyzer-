export type PersonaId = 'ideal' | 'skeptic' | 'price_shopper' | 'freeloader' | 'minor';

export interface LeadPersona {
  id: PersonaId;
  name: string;
  description: string;
  emoji: string;
  behavior: string;
  expectedOutcome: 'conversion' | 'nurture' | 'disqualified' | 'blocked';
}

export interface SimulationMessage {
  id: string;
  role: 'lead' | 'agent';
  content: string;
  timestamp: number;
  currentNodeId?: string;
  annotation?: string;
}

export type SimulationStatus = 'idle' | 'running' | 'completed' | 'failed';
export type SimulationOutcome = 'converted' | 'nurture' | 'lost' | 'blocked' | 'timeout';

export interface SimulationIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  nodeId?: string;
}

export interface SimulationRun {
  id: string;
  personaId: PersonaId;
  flowData: import('@/types/flow').FlowData;
  messages: SimulationMessage[];
  status: SimulationStatus;
  outcome?: SimulationOutcome;
  nodesVisited: string[];
  nodesCoverage: number;
  issues: SimulationIssue[];
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  triggerMessage: string;
  personaId: PersonaId;
  expectedBehavior: string;
  expectedOutcome: SimulationOutcome;
  redFlags: string[];
  nodesExpectedToVisit: string[];
}

export interface PersonaResult {
  personaId: PersonaId;
  outcome: SimulationOutcome;
  messagesCount: number;
  issues: SimulationIssue[];
  nodesVisited: string[];
  verdict: 'pass' | 'fail' | 'warning';
  notes: string;
}

export interface BatchTestResult {
  id: string;
  timestamp: number;
  runs: SimulationRun[];
  totalRuns: number;
  conversionRate: number;
  avgMessages: number;
  nodeCoverage: number;
  totalNodeCoveragePercent: number;
  personaResults: PersonaResult[];
}
