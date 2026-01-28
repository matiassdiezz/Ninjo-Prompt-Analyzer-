'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { MessageCircle, Send, Loader2, Sparkles, FileText, Zap } from 'lucide-react';
import { LearningCard } from './LearningCard';
import type { ExtractedLearning } from '@/lib/utils/learningExtractor';
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
  const { currentPrompt, chatMessages, addChatMessage } = useAnalysisStore();
  // Local state for learnings (not persisted to store)
  const [messageLearnings, setMessageLearnings] = useState<Map<string, ExtractedLearning[]>>(new Map());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedLearnings, setDismissedLearnings] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          question,
          history: chatMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      // Add assistant message to store
      addChatMessage({
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      });

      // Store learnings locally (keyed by message id - we need to get the latest message)
      if (data.learnings && data.learnings.length > 0) {
        // Get the ID of the message we just added (it's the last one in the store)
        const latestMessages = useAnalysisStore.getState().chatMessages;
        const lastMessage = latestMessages[latestMessages.length - 1];
        if (lastMessage) {
          setMessageLearnings((prev) => {
            const newMap = new Map(prev);
            newMap.set(lastMessage.id, data.learnings);
            return newMap;
          });
        }
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
                <div key={message.id} className="space-y-3">
                  <div
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
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
                      <div className="text-sm whitespace-pre-wrap markdown-content">
                        {message.content}
                      </div>
                    </div>
                  </div>

                  {/* Learning Cards */}
                  {visibleLearnings.length > 0 && (
                    <div className="pl-2 space-y-2">
                      {visibleLearnings.map((learning, learningIndex) => {
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
                              // Learning was saved, dismiss it
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
    </div>
  );
}
