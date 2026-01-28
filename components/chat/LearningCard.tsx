'use client';

import { useState } from 'react';
import { Brain, X, Save, Edit3, ChevronDown, ChevronUp, AlertCircle, Plus } from 'lucide-react';
import type { ExtractedLearning } from '@/lib/utils/learningExtractor';
import { detectCategory } from '@/lib/utils/learningExtractor';
import { useKnowledgeStore } from '@/store/knowledgeStore';

interface LearningCardProps {
  learning: ExtractedLearning;
  onDismiss: () => void;
  onSaved?: () => void;
}

export function LearningCard({ learning, onDismiss, onSaved }: LearningCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedLearning, setEditedLearning] = useState<ExtractedLearning>(learning);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const { addEntry, currentProjectId } = useKnowledgeStore();

  const priorityColors = {
    Alta: { bg: 'var(--error-subtle)', text: 'var(--error)', border: 'rgba(248, 81, 73, 0.3)' },
    Media: { bg: 'var(--warning-subtle)', text: 'var(--warning)', border: 'rgba(227, 179, 65, 0.3)' },
    Baja: { bg: 'var(--accent-subtle)', text: 'var(--accent-primary)', border: 'var(--border-accent)' },
  };

  const frequencyColors = {
    Recurrente: { bg: 'var(--error-subtle)', text: 'var(--error)' },
    Ocasional: { bg: 'var(--warning-subtle)', text: 'var(--warning)' },
    Único: { bg: 'var(--bg-elevated)', text: 'var(--text-secondary)' },
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const category = editedLearning.category || detectCategory(editedLearning);
      const baseTags = ['from-chat', 'self-serve', editedLearning.frequency.toLowerCase()];

      // Determine type based on content
      const isAntiPattern = editedLearning.pattern.toLowerCase().includes('no ') ||
        editedLearning.pattern.toLowerCase().includes('evitar') ||
        editedLearning.pattern.toLowerCase().includes('error') ||
        editedLearning.pattern.toLowerCase().includes('problema');

      addEntry({
        type: isAntiPattern ? 'anti_pattern' : 'pattern',
        title: editedLearning.pattern.substring(0, 100),
        description: editedLearning.suggestion,
        feedbackType: 'self_serve_improvement',
        effectiveness: editedLearning.priority === 'Alta' ? 'high' : editedLearning.priority === 'Media' ? 'medium' : 'low',
        tags: [...baseTags, category, ...customTags].filter(Boolean),
      });

      onSaved?.();
      onDismiss();
    } catch (error) {
      console.error('Error saving learning:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      setCustomTags([...customTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setCustomTags(customTags.filter((t) => t !== tag));
  };

  const priorityStyle = priorityColors[editedLearning.priority];
  const frequencyStyle = frequencyColors[editedLearning.frequency];
  const detectedCategory = editedLearning.category || detectCategory(editedLearning);

  return (
    <div
      className="rounded-xl overflow-hidden animate-slideUp"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-accent)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ background: 'var(--accent-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Aprendizaje detectado
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="p-1 rounded hover:bg-black/10 transition-colors"
          >
            <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
      </div>

      {/* Collapsed Preview */}
      {!isExpanded && (
        <div className="px-4 py-3">
          <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {editedLearning.pattern}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: priorityStyle.bg,
                color: priorityStyle.text,
                border: `1px solid ${priorityStyle.border}`,
              }}
            >
              {editedLearning.priority}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: frequencyStyle.bg,
                color: frequencyStyle.text,
              }}
            >
              {editedLearning.frequency}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              disabled={isSaving}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50"
              style={{
                background: 'var(--accent-primary)',
                color: '#0a0e14',
              }}
            >
              <Save className="h-3 w-3" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-4">
          {/* Pattern */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Patrón detectado
            </label>
            {isEditing ? (
              <textarea
                value={editedLearning.pattern}
                onChange={(e) => setEditedLearning({ ...editedLearning, pattern: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                rows={3}
              />
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {editedLearning.pattern}
              </p>
            )}
          </div>

          {/* Suggestion */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Sugerencia para Self-Serve
            </label>
            {isEditing ? (
              <textarea
                value={editedLearning.suggestion}
                onChange={(e) => setEditedLearning({ ...editedLearning, suggestion: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                rows={2}
              />
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {editedLearning.suggestion}
              </p>
            )}
          </div>

          {/* Priority & Frequency */}
          <div className="flex gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                Prioridad
              </label>
              {isEditing ? (
                <div className="flex gap-1">
                  {(['Alta', 'Media', 'Baja'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setEditedLearning({ ...editedLearning, priority: p })}
                      className="px-2 py-1 text-xs rounded transition-all"
                      style={{
                        background: editedLearning.priority === p ? priorityColors[p].bg : 'var(--bg-primary)',
                        color: editedLearning.priority === p ? priorityColors[p].text : 'var(--text-muted)',
                        border: `1px solid ${editedLearning.priority === p ? priorityColors[p].border : 'var(--border-subtle)'}`,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ) : (
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    background: priorityStyle.bg,
                    color: priorityStyle.text,
                    border: `1px solid ${priorityStyle.border}`,
                  }}
                >
                  {editedLearning.priority}
                </span>
              )}
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                Frecuencia
              </label>
              {isEditing ? (
                <div className="flex gap-1">
                  {(['Único', 'Ocasional', 'Recurrente'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setEditedLearning({ ...editedLearning, frequency: f })}
                      className="px-2 py-1 text-xs rounded transition-all"
                      style={{
                        background: editedLearning.frequency === f ? frequencyColors[f].bg : 'var(--bg-primary)',
                        color: editedLearning.frequency === f ? frequencyColors[f].text : 'var(--text-muted)',
                        border: `1px solid var(--border-subtle)`,
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              ) : (
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    background: frequencyStyle.bg,
                    color: frequencyStyle.text,
                  }}
                >
                  {editedLearning.frequency}
                </span>
              )}
            </div>
          </div>

          {/* Category & Tags */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              <span
                className="text-[10px] px-2 py-1 rounded-full"
                style={{
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--border-accent)',
                }}
              >
                #{detectedCategory}
              </span>
              {customTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {isEditing && (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Agregar tag"
                    className="text-[10px] px-2 py-1 rounded-full w-20"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    onClick={handleAddTag}
                    className="p-1 rounded-full"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <Plus className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs rounded-lg transition-all duration-200"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Descartar
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-all duration-200"
              style={{
                background: isEditing ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                color: isEditing ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${isEditing ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
              }}
            >
              <Edit3 className="h-3 w-3" />
              {isEditing ? 'Listo' : 'Editar'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 ml-auto disabled:opacity-50"
              style={{
                background: 'var(--accent-primary)',
                color: '#0a0e14',
              }}
            >
              <Save className="h-3 w-3" />
              {isSaving ? 'Guardando...' : 'Guardar a Memoria'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
