import { create } from 'zustand';
import type { ComparisonResult, ComparisonMode } from '@/types/comparison';
import type { TokenUsage } from '@/types/tokens';
import type { FeedbackItem } from '@/types/feedback';

interface ComparisonStore {
  // State
  mode: ComparisonMode;
  originalPrompt: string;
  modifiedPrompt: string;
  originalFeedback: FeedbackItem[];
  modifiedFeedback: FeedbackItem[];
  comparisonResult: ComparisonResult | null;
  isComparing: boolean;
  error: string | null;

  // Actions
  setMode: (mode: ComparisonMode) => void;
  setOriginalPrompt: (prompt: string) => void;
  setModifiedPrompt: (prompt: string) => void;
  addOriginalFeedback: (feedback: FeedbackItem) => void;
  addModifiedFeedback: (feedback: FeedbackItem) => void;
  removeOriginalFeedback: (feedbackId: string) => void;
  removeModifiedFeedback: (feedbackId: string) => void;
  clearFeedback: () => void;
  startComparison: () => void;
  setComparisonResult: (result: ComparisonResult | null) => void;
  completeComparison: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
  swapPrompts: () => void;
}

const initialState = {
  mode: 'analyze' as ComparisonMode,
  originalPrompt: '',
  modifiedPrompt: '',
  originalFeedback: [] as FeedbackItem[],
  modifiedFeedback: [] as FeedbackItem[],
  comparisonResult: null as ComparisonResult | null,
  isComparing: false,
  error: null as string | null,
};

export const useComparisonStore = create<ComparisonStore>()((set, get) => ({
  ...initialState,

  setMode: (mode: ComparisonMode) => {
    set({ mode, comparisonResult: null, error: null });
  },

  setOriginalPrompt: (prompt: string) => {
    set({ originalPrompt: prompt, error: null });
  },

  setModifiedPrompt: (prompt: string) => {
    set({ modifiedPrompt: prompt, error: null });
  },

  addOriginalFeedback: (feedback: FeedbackItem) => {
    const { originalFeedback } = get();
    set({ originalFeedback: [...originalFeedback, feedback] });
  },

  addModifiedFeedback: (feedback: FeedbackItem) => {
    const { modifiedFeedback } = get();
    set({ modifiedFeedback: [...modifiedFeedback, feedback] });
  },

  removeOriginalFeedback: (feedbackId: string) => {
    const { originalFeedback } = get();
    set({
      originalFeedback: originalFeedback.filter((item) => item.id !== feedbackId),
    });
  },

  removeModifiedFeedback: (feedbackId: string) => {
    const { modifiedFeedback } = get();
    set({
      modifiedFeedback: modifiedFeedback.filter((item) => item.id !== feedbackId),
    });
  },

  clearFeedback: () => {
    set({ originalFeedback: [], modifiedFeedback: [] });
  },

  startComparison: () => {
    set({ isComparing: true, error: null, comparisonResult: null });
  },

  setComparisonResult: (result: ComparisonResult | null) => {
    set({ comparisonResult: result });
  },

  completeComparison: () => {
    set({ isComparing: false });
  },

  setError: (error: string | null) => {
    set({ error, isComparing: false });
  },

  reset: () => {
    set(initialState);
  },

  swapPrompts: () => {
    const { originalPrompt, modifiedPrompt, originalFeedback, modifiedFeedback } = get();
    set({
      originalPrompt: modifiedPrompt,
      modifiedPrompt: originalPrompt,
      originalFeedback: modifiedFeedback,
      modifiedFeedback: originalFeedback,
    });
  },
}));
