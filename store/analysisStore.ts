import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PromptVersion } from '@/types/prompt';
import type { FeedbackItem } from '@/types/feedback';
import type { AnalysisResult, SuggestionState } from '@/types/analysis';
import type { TokenUsage } from '@/types/tokens';

const MAX_UNDO_STACK = 20;

export interface AnalysisProgress {
  step: number;
  stepName: string;
  percentage: number;
  startTime: number;
  estimatedTotal: number;
}

interface AnalysisStore {
  // State
  currentPrompt: string;
  promptHistory: PromptVersion[];
  feedbackItems: FeedbackItem[];
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgress | null;
  suggestionStates: Record<string, SuggestionState>;
  tokenUsage: TokenUsage | null;
  error: string | null;
  undoStack: string[];
  redoStack: string[];

  // Actions - Prompt
  setPrompt: (prompt: string) => void;
  createVersion: (label?: string) => void;
  restoreVersion: (versionId: string) => void;

  // Actions - Feedback
  addFeedback: (feedback: FeedbackItem) => void;
  removeFeedback: (feedbackId: string) => void;
  clearFeedback: () => void;

  // Actions - Analysis
  startAnalysis: () => void;
  setAnalysis: (analysis: AnalysisResult) => void;
  clearAnalysis: () => void;
  completeAnalysis: () => void;
  setError: (error: string | null) => void;
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  setTokenUsage: (usage: TokenUsage | null) => void;

  // Actions - Suggestions
  acceptSuggestion: (sectionId: string) => void;
  rejectSuggestion: (sectionId: string) => void;
  editSuggestion: (sectionId: string, editedRewrite: string) => void;
  applySuggestion: (sectionId: string, rewrite: string) => void;

  // Actions - Undo/Redo
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions - Reset
  reset: () => void;
}

const initialState = {
  currentPrompt: '',
  promptHistory: [],
  feedbackItems: [],
  analysis: null,
  isAnalyzing: false,
  analysisProgress: null as AnalysisProgress | null,
  suggestionStates: {},
  tokenUsage: null as TokenUsage | null,
  error: null,
  undoStack: [] as string[],
  redoStack: [] as string[],
};

export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Prompt actions
      setPrompt: (prompt: string) => {
        set({ currentPrompt: prompt, error: null });
      },

      createVersion: (label?: string) => {
        const { currentPrompt, promptHistory } = get();
        const version: PromptVersion = {
          id: crypto.randomUUID(),
          content: currentPrompt,
          timestamp: Date.now(),
          label: label || 'Versión sin nombre',
        };
        set({ promptHistory: [...promptHistory, version] });
      },

      restoreVersion: (versionId: string) => {
        const { promptHistory } = get();
        const version = promptHistory.find((v) => v.id === versionId);
        if (version) {
          set({ currentPrompt: version.content });
        }
      },

      // Feedback actions
      addFeedback: (feedback: FeedbackItem) => {
        const { feedbackItems } = get();
        set({ feedbackItems: [...feedbackItems, feedback] });
      },

      removeFeedback: (feedbackId: string) => {
        const { feedbackItems } = get();
        set({
          feedbackItems: feedbackItems.filter((item) => item.id !== feedbackId),
        });
      },

      clearFeedback: () => {
        set({ feedbackItems: [] });
      },

      // Analysis actions
      startAnalysis: () => {
        set({ isAnalyzing: true, error: null, analysis: null });
      },

      setAnalysis: (analysis: AnalysisResult) => {
        set({ analysis });
      },

      clearAnalysis: () => {
        set({ analysis: null, suggestionStates: {} });
      },

      completeAnalysis: () => {
        set({ isAnalyzing: false });
      },

      setError: (error: string | null) => {
        set({ error, isAnalyzing: false });
      },

      setAnalysisProgress: (progress: AnalysisProgress | null) => {
        set({ analysisProgress: progress });
      },

      setTokenUsage: (usage: TokenUsage | null) => {
        set({ tokenUsage: usage });
      },

      // Suggestion actions
      acceptSuggestion: (sectionId: string) => {
        const { suggestionStates } = get();
        set({
          suggestionStates: {
            ...suggestionStates,
            [sectionId]: { sectionId, status: 'accepted' },
          },
        });
      },

      rejectSuggestion: (sectionId: string) => {
        const { suggestionStates } = get();
        set({
          suggestionStates: {
            ...suggestionStates,
            [sectionId]: { sectionId, status: 'rejected' },
          },
        });
      },

      editSuggestion: (sectionId: string, editedRewrite: string) => {
        const { suggestionStates } = get();
        set({
          suggestionStates: {
            ...suggestionStates,
            [sectionId]: { sectionId, status: 'edited', editedRewrite },
          },
        });
      },

      applySuggestion: (sectionId: string, rewrite: string) => {
        const { currentPrompt, analysis } = get();
        if (!analysis) return;

        const section = analysis.sections.find((s) => s.id === sectionId);
        if (!section) return;

        // Push current state to undo stack before making changes
        get().pushUndo();

        // Replace the original text with the rewrite
        const before = currentPrompt.substring(0, section.startIndex);
        const after = currentPrompt.substring(section.endIndex);
        const newPrompt = before + rewrite + after;

        set({ currentPrompt: newPrompt, redoStack: [] });

        // Create a version after applying suggestion
        get().createVersion(`Applied suggestion for: ${section.originalText.substring(0, 30)}...`);
      },

      // Undo/Redo actions
      pushUndo: () => {
        const { currentPrompt, undoStack } = get();
        const newStack = [...undoStack, currentPrompt];
        // Keep only the last MAX_UNDO_STACK items
        if (newStack.length > MAX_UNDO_STACK) {
          newStack.shift();
        }
        set({ undoStack: newStack });
      },

      undo: () => {
        const { currentPrompt, undoStack, redoStack } = get();
        if (undoStack.length === 0) return;

        const previousState = undoStack[undoStack.length - 1];
        const newUndoStack = undoStack.slice(0, -1);
        const newRedoStack = [...redoStack, currentPrompt];

        set({
          currentPrompt: previousState,
          undoStack: newUndoStack,
          redoStack: newRedoStack,
        });
      },

      redo: () => {
        const { currentPrompt, undoStack, redoStack } = get();
        if (redoStack.length === 0) return;

        const nextState = redoStack[redoStack.length - 1];
        const newRedoStack = redoStack.slice(0, -1);
        const newUndoStack = [...undoStack, currentPrompt];

        set({
          currentPrompt: nextState,
          undoStack: newUndoStack,
          redoStack: newRedoStack,
        });
      },

      canUndo: () => {
        return get().undoStack.length > 0;
      },

      canRedo: () => {
        return get().redoStack.length > 0;
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'ninjo-analysis-storage',
      partialize: (state) => ({
        currentPrompt: state.currentPrompt,
        promptHistory: state.promptHistory,
        feedbackItems: state.feedbackItems,
        analysis: state.analysis,
        tokenUsage: state.tokenUsage,
      }),
    }
  )
);
