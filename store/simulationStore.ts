import { create } from 'zustand';
import type {
  SimulationRun,
  SimulationMessage,
  SimulationIssue,
  SimulationOutcome,
  TestCase,
  BatchTestResult,
  PersonaId,
} from '@/types/simulation';
import type { FlowData } from '@/types/flow';

interface SimulationStore {
  // Simulation state
  currentRun: SimulationRun | null;

  // Test cases
  testCases: TestCase[];
  isGeneratingTestCases: boolean;

  // Batch testing
  batchResult: BatchTestResult | null;
  isBatchRunning: boolean;
  batchProgress: { current: number; total: number; currentPersona: string };

  // Simulation actions
  startSimulation: (personaId: PersonaId, flowData: FlowData) => void;
  addMessage: (message: SimulationMessage) => void;
  addIssue: (issue: SimulationIssue) => void;
  completeSimulation: (outcome: SimulationOutcome, nodesVisited: string[]) => void;
  failSimulation: (error: string) => void;
  clearSimulation: () => void;

  // Test cases actions
  setTestCases: (testCases: TestCase[]) => void;
  setGeneratingTestCases: (generating: boolean) => void;

  // Batch actions
  startBatch: (total: number) => void;
  updateBatchProgress: (current: number, currentPersona: string) => void;
  addBatchRun: (run: SimulationRun) => void;
  setBatchResult: (result: BatchTestResult) => void;
  clearBatch: () => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  currentRun: null,
  testCases: [],
  isGeneratingTestCases: false,
  batchResult: null,
  isBatchRunning: false,
  batchProgress: { current: 0, total: 0, currentPersona: '' },

  startSimulation: (personaId, flowData) => {
    set({
      currentRun: {
        id: crypto.randomUUID().slice(0, 8),
        personaId,
        flowData,
        messages: [],
        status: 'running',
        nodesVisited: [],
        nodesCoverage: 0,
        issues: [],
      },
    });
  },

  addMessage: (message) => {
    set((state) => {
      if (!state.currentRun) return state;
      return {
        currentRun: {
          ...state.currentRun,
          messages: [...state.currentRun.messages, message],
        },
      };
    });
  },

  addIssue: (issue) => {
    set((state) => {
      if (!state.currentRun) return state;
      return {
        currentRun: {
          ...state.currentRun,
          issues: [...state.currentRun.issues, issue],
        },
      };
    });
  },

  completeSimulation: (outcome, nodesVisited) => {
    set((state) => {
      if (!state.currentRun) return state;
      const totalNodes = state.currentRun.flowData.nodes.length;
      const uniqueVisited = [...new Set(nodesVisited)];
      return {
        currentRun: {
          ...state.currentRun,
          status: 'completed',
          outcome,
          nodesVisited: uniqueVisited,
          nodesCoverage: totalNodes > 0 ? (uniqueVisited.length / totalNodes) * 100 : 0,
        },
      };
    });
  },

  failSimulation: (error) => {
    set((state) => {
      if (!state.currentRun) return state;
      return {
        currentRun: {
          ...state.currentRun,
          status: 'failed',
          issues: [
            ...state.currentRun.issues,
            { id: crypto.randomUUID().slice(0, 8), severity: 'critical', message: error },
          ],
        },
      };
    });
  },

  clearSimulation: () => {
    set({ currentRun: null });
  },

  setTestCases: (testCases) => {
    set({ testCases });
  },

  setGeneratingTestCases: (generating) => {
    set({ isGeneratingTestCases: generating });
  },

  startBatch: (total) => {
    set({
      isBatchRunning: true,
      batchResult: null,
      batchProgress: { current: 0, total, currentPersona: '' },
    });
  },

  updateBatchProgress: (current, currentPersona) => {
    set((state) => ({
      batchProgress: { ...state.batchProgress, current, currentPersona },
    }));
  },

  addBatchRun: (run) => {
    // Store runs temporarily in batch result
    set((state) => {
      const existing = state.batchResult;
      if (existing) {
        return {
          batchResult: {
            ...existing,
            runs: [...existing.runs, run],
          },
        };
      }
      return state;
    });
  },

  setBatchResult: (result) => {
    set({
      batchResult: result,
      isBatchRunning: false,
    });
  },

  clearBatch: () => {
    set({
      batchResult: null,
      isBatchRunning: false,
      batchProgress: { current: 0, total: 0, currentPersona: '' },
    });
  },
}));
