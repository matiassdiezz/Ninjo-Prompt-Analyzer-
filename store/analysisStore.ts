import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PromptVersion, PromptAnnotation, ChatMessage } from '@/types/prompt';
import type { FeedbackItem } from '@/types/feedback';
import type { AnalysisResult, SuggestionState } from '@/types/analysis';
import type { TokenUsage } from '@/types/tokens';
import { findTextInPrompt } from '@/lib/utils/textMatcher';

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
  // Workspace state
  selectedSectionId: string | null;
  autoSaveEnabled: boolean;
  hasUnsavedChanges: boolean;
  lastSavedContent: string;
  // Annotations
  annotations: PromptAnnotation[];
  // Chat messages
  chatMessages: ChatMessage[];

  // Actions - Prompt
  setPrompt: (prompt: string) => void;
  createVersion: (label?: string, changeType?: 'manual' | 'suggestion_applied' | 'auto_save', changeDetails?: { suggestionId?: string; category?: string; sectionTitle?: string }) => void;
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

  // Actions - Workspace
  setSelectedSectionId: (sectionId: string | null) => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  markAsSaved: () => void;
  saveManualVersion: (label: string) => void;

  // Actions - Annotations
  addAnnotation: (annotation: Omit<PromptAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'savedAsKnowledge'>) => string;
  updateAnnotation: (id: string, updates: Partial<PromptAnnotation>) => void;
  deleteAnnotation: (id: string) => void;
  getAnnotationsInRange: (startOffset: number, endOffset: number) => PromptAnnotation[];

  // Actions - Chat
  addChatMessage: (message: Omit<ChatMessage, 'id'>) => string;
  updateMessageChangeStatus: (messageId: string, changeIndex: number, status: 'applied' | 'rejected' | 'pending') => void;
  clearChatMessages: () => void;
  getChatMessages: () => ChatMessage[];

  // Actions - Agent Sync (for loading agent data)
  loadAgentData: (data: { prompt: string; versions: PromptVersion[]; annotations: PromptAnnotation[]; chatMessages?: ChatMessage[] }) => void;
  getAgentData: () => { prompt: string; versions: PromptVersion[]; annotations: PromptAnnotation[]; chatMessages: ChatMessage[] };
  clearAgentData: () => void;
  // Legacy aliases
  loadProjectData: (data: { prompt: string; versions: PromptVersion[]; annotations: PromptAnnotation[]; chatMessages?: ChatMessage[] }) => void;
  getProjectData: () => { prompt: string; versions: PromptVersion[]; annotations: PromptAnnotation[]; chatMessages: ChatMessage[] };
  clearProjectData: () => void;

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
  // Workspace state
  selectedSectionId: null as string | null,
  autoSaveEnabled: true,
  hasUnsavedChanges: false,
  lastSavedContent: '',
  // Annotations
  annotations: [] as PromptAnnotation[],
  // Chat messages
  chatMessages: [] as ChatMessage[],
};

export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Prompt actions
      setPrompt: (prompt: string) => {
        const { lastSavedContent } = get();
        set({
          currentPrompt: prompt,
          error: null,
          hasUnsavedChanges: prompt !== lastSavedContent,
        });
      },

      createVersion: (
        label?: string,
        changeType?: 'manual' | 'suggestion_applied' | 'auto_save',
        changeDetails?: { suggestionId?: string; category?: string; sectionTitle?: string }
      ) => {
        const { currentPrompt, promptHistory, chatMessages } = get();
        const version: PromptVersion = {
          id: crypto.randomUUID(),
          content: currentPrompt,
          timestamp: Date.now(),
          label: label || 'Versión sin nombre',
          changeType: changeType || 'manual',
          changeDetails,
          // Include chat history with this version
          chatHistory: chatMessages.length > 0 ? [...chatMessages] : undefined,
        };
        set({
          promptHistory: [...promptHistory, version],
          hasUnsavedChanges: false,
          lastSavedContent: currentPrompt,
        });
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
        const { currentPrompt, analysis, autoSaveEnabled } = get();
        if (!analysis) return;

        const section = analysis.sections.find((s) => s.id === sectionId);
        if (!section) return;

        // Use text matching instead of indices (more reliable)
        const match = findTextInPrompt(currentPrompt, section.originalText, {
          enableFuzzy: true,
          fuzzyThreshold: 0.85,
        });

        if (!match.found || match.confidence < 0.85) {
          console.warn('Could not find original text in prompt:', section.originalText.substring(0, 50));
          return;
        }

        // Push current state to undo stack before making changes
        get().pushUndo();

        // Replace the matched text with the rewrite
        const before = currentPrompt.substring(0, match.startIndex);
        const after = currentPrompt.substring(match.endIndex);
        const newPrompt = before + rewrite + after;

        set({ currentPrompt: newPrompt, redoStack: [], hasUnsavedChanges: true });

        // Mark suggestion as accepted
        get().acceptSuggestion(sectionId);

        // Create a version after applying suggestion (if auto-save enabled)
        if (autoSaveEnabled) {
          get().createVersion(
            `Sugerencia aplicada: ${section.originalText.substring(0, 30)}...`,
            'suggestion_applied',
            {
              suggestionId: sectionId,
              category: section.category,
            }
          );
        }
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

      // Workspace actions
      setSelectedSectionId: (sectionId: string | null) => {
        set({ selectedSectionId: sectionId });
      },

      setAutoSaveEnabled: (enabled: boolean) => {
        set({ autoSaveEnabled: enabled });
      },

      markAsSaved: () => {
        const { currentPrompt } = get();
        set({ hasUnsavedChanges: false, lastSavedContent: currentPrompt });
      },

      saveManualVersion: (label: string) => {
        get().createVersion(label, 'manual');
      },

      // Annotation actions
      addAnnotation: (annotationData) => {
        const id = crypto.randomUUID();
        const annotation: PromptAnnotation = {
          ...annotationData,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          savedAsKnowledge: false,
        };

        set((state) => ({
          annotations: [...state.annotations, annotation],
        }));

        return id;
      },

      updateAnnotation: (id, updates) => {
        set((state) => ({
          annotations: state.annotations.map((a) =>
            a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
          ),
        }));
      },

      deleteAnnotation: (id) => {
        set((state) => ({
          annotations: state.annotations.filter((a) => a.id !== id),
        }));
      },

      getAnnotationsInRange: (startOffset, endOffset) => {
        const { annotations } = get();
        return annotations.filter(
          (a) =>
            (a.startOffset >= startOffset && a.startOffset < endOffset) ||
            (a.endOffset > startOffset && a.endOffset <= endOffset) ||
            (a.startOffset <= startOffset && a.endOffset >= endOffset)
        );
      },

      // Chat actions
      addChatMessage: (messageData) => {
        const message: ChatMessage = {
          ...messageData,
          id: crypto.randomUUID(),
        };
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        }));
        return message.id;
      },

      updateMessageChangeStatus: (messageId, changeIndex, status) => {
        set((state) => ({
          chatMessages: state.chatMessages.map((msg) => {
            if (msg.id !== messageId) return msg;
            const statuses = { ...(msg.changeStatuses || {}) };
            if (status === 'pending') {
              delete statuses[changeIndex];
            } else {
              statuses[changeIndex] = status;
            }
            return { ...msg, changeStatuses: Object.keys(statuses).length > 0 ? statuses : undefined };
          }),
        }));
      },

      clearChatMessages: () => {
        set({ chatMessages: [] });
      },

      getChatMessages: () => {
        return get().chatMessages;
      },

      // Agent Sync actions
      loadAgentData: (data) => {
        set({
          currentPrompt: data.prompt,
          promptHistory: data.versions,
          annotations: data.annotations,
          chatMessages: data.chatMessages || [],
          lastSavedContent: data.prompt,
          hasUnsavedChanges: false,
          // Clear analysis-related state when switching agents
          analysis: null,
          suggestionStates: {},
          selectedSectionId: null,
          undoStack: [],
          redoStack: [],
        });
      },

      getAgentData: () => {
        const { currentPrompt, promptHistory, annotations, chatMessages } = get();
        return {
          prompt: currentPrompt,
          versions: promptHistory,
          annotations: annotations,
          chatMessages: chatMessages,
        };
      },

      clearAgentData: () => {
        set({
          currentPrompt: '',
          promptHistory: [],
          annotations: [],
          chatMessages: [],
          lastSavedContent: '',
          hasUnsavedChanges: false,
          analysis: null,
          suggestionStates: {},
          selectedSectionId: null,
          undoStack: [],
          redoStack: [],
        });
      },

      // Legacy aliases
      loadProjectData: (data) => { get().loadAgentData(data); },
      getProjectData: () => get().getAgentData(),
      clearProjectData: () => { get().clearAgentData(); },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'ninjo-analysis-storage',
      partialize: (state) => ({
        // Only persist UI preferences, NOT project data
        // Project data (prompt, versions, annotations) is stored in knowledgeStore per project
        feedbackItems: state.feedbackItems,
        autoSaveEnabled: state.autoSaveEnabled,
        // Note: currentPrompt, promptHistory, annotations are NOT persisted here
        // They are managed by useProjectSync and stored in knowledgeStore
      }),
    }
  )
);
