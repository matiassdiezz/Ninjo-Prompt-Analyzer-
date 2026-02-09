'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { MessageCircle, Send, Loader2, Sparkles, FileText, Zap, X, Brain } from 'lucide-react';
import { LearningCard } from './LearningCard';
import { MarkdownMessage } from './MarkdownMessage';
import { DuplicatePatternAlert, TestingSuggestionsAlert } from './DuplicatePatternAlert';
import type { ExtractedLearning } from '@/lib/utils/learningExtractor';
import type { ParsedChange } from '@/lib/utils/changeParser';
import { findTextInPrompt } from '@/lib/utils/textMatcher';
import { useToastStore } from '@/store/toastStore';
import type { ChatMessage } from '@/types/prompt';

// Extended chat message with learnings (for UI only, not persisted)
interface ChatMessageWithLearnings extends ChatMessage {
  learnings?: ExtractedLearning[];
}

const SUGGESTED_QUESTIONS = [
  {
    label: 'QA inicial',
    text: 'Hacé el QA inicial de este prompt',
    icon: Zap,
  },
  {
    label: 'Feedback del cliente',
    text: 'Tengo este feedback del cliente: [pegar feedback aquí]',
    icon: MessageCircle,
  },
  {
    label: 'Casos de testing',
    text: 'Generá casos de testing para este agente',
    icon: FileText,
  },
  {
    label: 'Diagnóstico',
    text: 'El agente no está convirtiendo, diagnosticalo',
    icon: Sparkles,
  },
];

export function NinjoChatPanel() {
  const { currentPrompt, chatMessages, addChatMessage, setPrompt, pushUndo } = useAnalysisStore();
  const { addEntry, currentProjectId, entries, decisions } = useKnowledgeStore();
  const { addToast } = useToastStore();
  // Local state for learnings (not persisted to store)
  const [messageLearnings, setMessageLearnings] = useState<Map<string, ExtractedLearning[]>>(new Map());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedLearnings, setDismissedLearnings] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // State for duplicates and testing suggestions
  const [currentDuplicates, setCurrentDuplicates] = useState<any[]>([]);
  const [currentTestingSuggestions, setCurrentTestingSuggestions] = useState<any[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showTestingSuggestions, setShowTestingSuggestions] = useState(false);

  // State for save to memory modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [codeToSave, setCodeToSave] = useState('');
  const [memoryTitle, setMemoryTitle] = useState('');
  const [memoryDescription, setMemoryDescription] = useState('');
  const [memoryTags, setMemoryTags] = useState('');

  // Combine store messages with local learnings for display
  const messagesWithLearnings: ChatMessageWithLearnings[] = chatMessages.map((msg) => ({
    ...msg,
    learnings: messageLearnings.get(msg.id),
  }));

  // Estimate token count (rough approximation: ~4 chars per token)
  const estimatedTokens = Math.ceil(currentPrompt.length / 4);
  const formattedTokens = estimatedTokens > 1000
    ? `${(estimatedTokens / 1000).toFixed(1)}k`
    : estimatedTokens.toString();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const insertSuggestedQuestion = (text: string) => {
    setInput(text);

    // Focus + move caret to end
    requestAnimationFrame(() => {
      if (!inputRef.current) return;

      const textarea = inputRef.current;
      textarea.focus();
      const endPos = text.length;
      textarea.setSelectionRange(endPos, endPos);

      // Update height to fit content (same logic as onChange)
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    });
  };

  const sendMessage = async (question: string) => {
    if (!question.trim() || !currentPrompt.trim() || isLoading) return;

    // Add user message to store
    addChatMessage({
      role: 'user',
      content: question,
      timestamp: Date.now(),
    });
    setInput('');

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    setIsLoading(true);

    try {
      // Get top 5 most relevant learnings for context injection
      const relevantLearnings = entries
        .sort((a, b) => {
          // Sort by effectiveness and usage
          const scoreA = (a.effectiveness === 'high' ? 3 : a.effectiveness === 'medium' ? 2 : 1) + (a.usageCount * 0.1);
          const scoreB = (b.effectiveness === 'high' ? 3 : b.effectiveness === 'medium' ? 2 : 1) + (b.usageCount * 0.1);
          return scoreB - scoreA;
        })
        .slice(0, 5)
        .map(e => ({
          id: e.id,
          type: e.type,
          title: e.title,
          description: e.description,
          example: e.example,
          effectiveness: e.effectiveness,
          usageCount: e.usageCount,
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          question,
          history: chatMessages,
          relevantLearnings,
          allKnowledge: entries.map(e => ({
            id: e.id,
            type: e.type,
            title: e.title,
            description: e.description,
            tags: e.tags,
          })),
          historicalDecisions: decisions.map(d => ({
            decision: d.decision,
            category: d.category,
            originalText: d.originalText,
            suggestedText: d.suggestedText,
            justification: d.justification,
          })),
          projectId: currentProjectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      // Add assistant message and get its ID
      const assistantMessageId = addChatMessage({
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      });

      // Store learnings locally using the returned message ID
      if (data.learnings && Array.isArray(data.learnings) && data.learnings.length > 0) {
        setMessageLearnings((prev) => {
          const newMap = new Map(prev);
          newMap.set(assistantMessageId, data.learnings);
          return newMap;
        });
      }

      // Handle duplicates
      if (data.duplicates && Array.isArray(data.duplicates) && data.duplicates.length > 0) {
        setCurrentDuplicates(data.duplicates);
        setShowDuplicates(true);
      }

      // Handle testing suggestions
      if (data.testingSuggestions && Array.isArray(data.testingSuggestions) && data.testingSuggestions.length > 0) {
        setCurrentTestingSuggestions(data.testingSuggestions);
        setShowTestingSuggestions(true);
      }
    } catch (error) {
      console.error('Chat error:', error);
      addChatMessage({
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleApplyCode = useCallback((code: string) => {
    try {
      setPrompt(code);
      addChatMessage({
        role: 'assistant',
        content: '✅ Cambio aplicado al prompt',
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error applying code:', error);
      addChatMessage({
        role: 'assistant',
        content: '❌ Error al aplicar el cambio. Por favor, intentá de nuevo.',
        timestamp: Date.now(),
      });
    }
  }, [setPrompt, addChatMessage]);

  // Handle save to memory
  const handleSaveToMemory = useCallback((code: string) => {
    setCodeToSave(code);
    setMemoryTitle('');
    setMemoryDescription('');
    setMemoryTags('');
    setShowSaveModal(true);
  }, []);

  const handleSaveMemoryConfirm = () => {
    if (!memoryTitle.trim() || !codeToSave) return;

    addEntry({
      type: 'pattern',
      title: memoryTitle.trim(),
      description: memoryDescription.trim() || 'Código guardado desde el chat',
      example: codeToSave,
      tags: memoryTags.split(',').map(t => t.trim()).filter(Boolean),
      effectiveness: 'high',
      feedbackType: 'Cambio aplicado manualmente desde chat',
    });

    setShowSaveModal(false);
    setCodeToSave('');
    addChatMessage({
      role: 'assistant',
      content: `💾 "${memoryTitle.trim()}" guardado en memoria`,
      timestamp: Date.now(),
    });
  };

  // Handle navigate to section
  const handleNavigateToSection = useCallback((section: string) => {
    // Dispatch custom event that the editor can listen to
    window.dispatchEvent(new CustomEvent('navigate-to-section', { detail: { section } }));
  }, []);

  // Handle apply structured change
  const handleApplyChange = useCallback((change: ParsedChange) => {
    try {
      pushUndo();

      if (change.action === 'replace' && change.beforeText && change.afterText) {
        const match = findTextInPrompt(currentPrompt, change.beforeText);
        if (match.found) {
          const newPrompt =
            currentPrompt.substring(0, match.startIndex) +
            change.afterText +
            currentPrompt.substring(match.endIndex);
          setPrompt(newPrompt);
          addToast('Cambio aplicado', 'success');
        } else {
          addToast('No se encontró el texto original en el prompt', 'error');
        }
      } else if (change.action === 'delete' && change.beforeText) {
        const match = findTextInPrompt(currentPrompt, change.beforeText);
        if (match.found) {
          const newPrompt =
            currentPrompt.substring(0, match.startIndex) +
            currentPrompt.substring(match.endIndex);
          setPrompt(newPrompt);
          addToast('Texto eliminado', 'success');
        } else {
          addToast('No se encontró el texto a eliminar', 'error');
        }
      } else if (change.action === 'insert' && change.afterText) {
        if (change.location) {
          // Try to find the location text to insert after
          const match = findTextInPrompt(currentPrompt, change.location);
          if (match.found) {
            const newPrompt =
              currentPrompt.substring(0, match.endIndex) +
              '\n' + change.afterText +
              currentPrompt.substring(match.endIndex);
            setPrompt(newPrompt);
            addToast('Texto insertado', 'success');
          } else {
            addToast('No se encontró la ubicación para insertar', 'error');
          }
        } else {
          // Append to end if no location specified
          setPrompt(currentPrompt + '\n' + change.afterText);
          addToast('Texto insertado al final', 'success');
        }
      } else if (change.action === 'move' && change.beforeText && change.location) {
        const blockMatch = findTextInPrompt(currentPrompt, change.beforeText);
        if (blockMatch.found) {
          // Remove from original position
          const withoutBlock =
            currentPrompt.substring(0, blockMatch.startIndex) +
            currentPrompt.substring(blockMatch.endIndex);
          // Find new location in the modified prompt
          const locationMatch = findTextInPrompt(withoutBlock, change.location);
          if (locationMatch.found) {
            const newPrompt =
              withoutBlock.substring(0, locationMatch.endIndex) +
              '\n' + change.beforeText +
              withoutBlock.substring(locationMatch.endIndex);
            setPrompt(newPrompt);
            addToast('Bloque movido', 'success');
          } else {
            addToast('No se encontró la nueva ubicación', 'error');
          }
        } else {
          addToast('No se encontró el bloque a mover', 'error');
        }
      }
    } catch (error) {
      console.error('Error applying change:', error);
      addToast('Error al aplicar el cambio', 'error');
    }
  }, [currentPrompt, setPrompt, pushUndo, addToast]);

  // Handle apply all structured changes at once
  const handleApplyAllChanges = useCallback((changes: ParsedChange[]) => {
    try {
      pushUndo();
      let updatedPrompt = currentPrompt;
      let appliedCount = 0;
      let failedCount = 0;

      for (const change of changes) {
        if (change.action === 'replace' && change.beforeText && change.afterText) {
          const match = findTextInPrompt(updatedPrompt, change.beforeText);
          if (match.found) {
            updatedPrompt =
              updatedPrompt.substring(0, match.startIndex) +
              change.afterText +
              updatedPrompt.substring(match.endIndex);
            appliedCount++;
          } else {
            failedCount++;
          }
        } else if (change.action === 'delete' && change.beforeText) {
          const match = findTextInPrompt(updatedPrompt, change.beforeText);
          if (match.found) {
            updatedPrompt =
              updatedPrompt.substring(0, match.startIndex) +
              updatedPrompt.substring(match.endIndex);
            appliedCount++;
          } else {
            failedCount++;
          }
        } else if (change.action === 'insert' && change.afterText) {
          if (change.location) {
            const match = findTextInPrompt(updatedPrompt, change.location);
            if (match.found) {
              updatedPrompt =
                updatedPrompt.substring(0, match.endIndex) +
                '\n' + change.afterText +
                updatedPrompt.substring(match.endIndex);
              appliedCount++;
            } else {
              failedCount++;
            }
          } else {
            updatedPrompt = updatedPrompt + '\n' + change.afterText;
            appliedCount++;
          }
        } else if (change.action === 'move' && change.beforeText && change.location) {
          const blockMatch = findTextInPrompt(updatedPrompt, change.beforeText);
          if (blockMatch.found) {
            const withoutBlock =
              updatedPrompt.substring(0, blockMatch.startIndex) +
              updatedPrompt.substring(blockMatch.endIndex);
            const locationMatch = findTextInPrompt(withoutBlock, change.location);
            if (locationMatch.found) {
              updatedPrompt =
                withoutBlock.substring(0, locationMatch.endIndex) +
                '\n' + change.beforeText +
                withoutBlock.substring(locationMatch.endIndex);
              appliedCount++;
            } else {
              failedCount++;
            }
          } else {
            failedCount++;
          }
        }
      }

      setPrompt(updatedPrompt);

      if (failedCount === 0) {
        addToast(`${appliedCount} cambios aplicados`, 'success');
      } else {
        addToast(`${appliedCount} de ${appliedCount + failedCount} cambios aplicados, ${failedCount} no encontrados`, 'warning');
      }
    } catch (error) {
      console.error('Error applying all changes:', error);
      addToast('Error al aplicar los cambios', 'error');
    }
  }, [currentPrompt, setPrompt, pushUndo, addToast]);

  // Handle reject structured change (visual only, managed in MarkdownMessage)
  const handleRejectChange = useCallback(() => {
    // Status is managed internally by MarkdownMessage's changeStatuses state
  }, []);

  // Handle save change as learning
  const handleSaveChangeLearning = useCallback((change: ParsedChange) => {
    setCodeToSave(change.afterText || change.beforeText || '');
    setMemoryTitle(change.title);
    setMemoryDescription(change.reason);
    setMemoryTags(`from-chat, ${change.section.toLowerCase()}`);
    setShowSaveModal(true);
  }, []);

  // Empty state when no prompt
  if (!currentPrompt.trim()) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
        {/* Header */}
        <div
          className="flex-shrink-0 px-4 py-3 border-b flex items-center justify-between"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Ninjo QA
            </h3>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          >
            <MessageCircle className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Ingresa un prompt para comenzar
          </h3>
          <p className="text-xs max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
            Escribe o pega un prompt en el editor para analizarlo y recibir asistencia
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 py-3 border-b flex items-center justify-between"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Ninjo QA
          </h3>
        </div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <FileText className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Prompt: {formattedTokens}tk</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesWithLearnings.length === 0 ? (
          // Suggested questions when empty
          <div className="h-full flex flex-col items-center justify-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }}
            >
              <Sparkles className="h-7 w-7" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              ¿Cómo puedo ayudarte?
            </h3>
            <p className="text-xs mb-6 text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
              Soy tu asistente de prompt engineering especializado en Ninjo
            </p>

            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {SUGGESTED_QUESTIONS.map((q, index) => {
                const Icon = q.icon;
                return (
                  <button
                    key={index}
                    onClick={() => insertSuggestedQuestion(q.text)}
                    disabled={isLoading}
                    className="flex flex-col items-start gap-2 p-3 rounded-xl text-left transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {q.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // Messages
          <>
            {messagesWithLearnings.map((message) => {
              const learningKey = message.id;
              const hasLearnings = message.learnings && message.learnings.length > 0;
              const visibleLearnings = hasLearnings
                ? message.learnings!.filter((_, i) => !dismissedLearnings.has(`${learningKey}-${i}`))
                : [];

              return (
                <div key={message.id} className="space-y-2">
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
                      }`}
                      style={{
                        background: message.role === 'user'
                          ? 'var(--accent-primary)'
                          : 'var(--bg-elevated)',
                        color: message.role === 'user'
                          ? '#0a0e14'
                          : 'var(--text-primary)',
                        border: message.role === 'user'
                          ? 'none'
                          : '1px solid var(--border-subtle)',
                      }}
                    >
                      {message.role === 'user' ? (
                        <div className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </div>
                      ) : (
                        <MarkdownMessage
                          content={message.content}
                          onApplyCode={handleApplyCode}
                          onSaveToMemory={handleSaveToMemory}
                          onNavigateToSection={handleNavigateToSection}
                          onApplyChange={handleApplyChange}
                          onRejectChange={handleRejectChange}
                          onSaveLearning={handleSaveChangeLearning}
                          onApplyAllChanges={handleApplyAllChanges}
                        />
                      )}
                    </div>
                  </div>

                  {/* Learnings */}
                  {visibleLearnings.length > 0 && (
                    <div className="ml-4 space-y-2">
                      {visibleLearnings.map((learning) => {
                        const originalIndex = message.learnings!.indexOf(learning);
                        return (
                          <LearningCard
                            key={`${learningKey}-${originalIndex}`}
                            learning={learning}
                            onDismiss={() => {
                              setDismissedLearnings((prev) => {
                                const newSet = new Set(prev);
                                newSet.add(`${learningKey}-${originalIndex}`);
                                return newSet;
                              });
                            }}
                            onSaved={() => {
                              setDismissedLearnings((prev) => {
                                const newSet = new Set(prev);
                                newSet.add(`${learningKey}-${originalIndex}`);
                                return newSet;
                              });
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Duplicate Pattern Alert */}
            {showDuplicates && currentDuplicates.length > 0 && (
              <DuplicatePatternAlert
                duplicates={currentDuplicates}
                onDismiss={() => setShowDuplicates(false)}
              />
            )}

            {/* Testing Suggestions Alert */}
            {showTestingSuggestions && currentTestingSuggestions.length > 0 && (
              <TestingSuggestionsAlert
                suggestions={currentTestingSuggestions}
                onDismiss={() => setShowTestingSuggestions(false)}
              />
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-bl-md px-4 py-3"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      Analizando...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="flex-shrink-0 p-4 border-t"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            disabled={isLoading}
            rows={1}
            className="flex-1 px-4 py-3 text-sm rounded-xl resize-none transition-all duration-200"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: input.trim() ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: input.trim() ? '#0a0e14' : 'var(--text-muted)',
              border: input.trim() ? 'none' : '1px solid var(--border-subtle)',
            }}
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
          Shift + Enter para nueva línea
        </p>
      </div>

      {/* Save to Memory Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="w-full max-w-md rounded-xl p-6 space-y-4"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Guardar en memoria
                </h3>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={memoryTitle}
                  onChange={(e) => setMemoryTitle(e.target.value)}
                  placeholder="Ej: Regla de tono para saludos"
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Descripción
                </label>
                <textarea
                  value={memoryDescription}
                  onChange={(e) => setMemoryDescription(e.target.value)}
                  placeholder="¿Cuándo usar este patrón?"
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Tags (separados por coma)
                </label>
                <input
                  type="text"
                  value={memoryTags}
                  onChange={(e) => setMemoryTags(e.target.value)}
                  placeholder="tono, saludos, reglas"
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Código a guardar
                </label>
                <pre 
                  className="text-xs p-3 rounded-lg overflow-x-auto max-h-32"
                  style={{ 
                    background: 'var(--bg-tertiary)', 
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <code>{codeToSave.substring(0, 200)}{codeToSave.length > 200 ? '...' : ''}</code>
                </pre>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 text-sm rounded-lg transition-colors"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMemoryConfirm}
                disabled={!memoryTitle.trim()}
                className="flex-1 px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--accent-primary)',
                  color: '#0a0e14',
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
