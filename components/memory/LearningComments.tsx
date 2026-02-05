'use client';

import { useState, useEffect } from 'react';
import { commentsRepository } from '@/lib/supabase/repositories';
import { getSupabaseDeviceId } from '@/lib/supabase/device';
import type { LearningComment } from '@/types/prompt';
import { MessageSquare, Send, Trash2, Edit, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LearningCommentsProps {
  learningId: string;
  onCommentAdded?: () => void;
}

export function LearningComments({ learningId, onCommentAdded }: LearningCommentsProps) {
  const [comments, setComments] = useState<LearningComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const deviceId = getSupabaseDeviceId();

  useEffect(() => {
    loadComments();
  }, [learningId]);

  const loadComments = async () => {
    setIsLoading(true);
    const data = await commentsRepository.getByLearning(learningId);
    setComments(data);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !deviceId) return;

    setIsSubmitting(true);
    const comment = await commentsRepository.create(
      learningId,
      newComment.trim(),
      deviceId,
      'QA' // Default author name, could be customized
    );

    if (comment) {
      setComments([...comments, comment]);
      setNewComment('');
      onCommentAdded?.();
    }

    setIsSubmitting(false);
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    const success = await commentsRepository.update(commentId, editContent.trim());
    if (success) {
      setComments(comments.map(c => 
        c.id === commentId 
          ? { ...c, content: editContent.trim(), updatedAt: Date.now() }
          : c
      ));
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('¿Eliminar este comentario?')) return;

    const success = await commentsRepository.delete(commentId);
    if (success) {
      setComments(comments.filter(c => c.id !== commentId));
    }
  };

  const startEdit = (comment: LearningComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((comment) => {
            const isEditing = editingId === comment.id;
            const isOwnComment = comment.deviceId === deviceId;

            return (
              <div
                key={comment.id}
                className="rounded-lg p-3"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEdit}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg"
                        style={{
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleEdit(comment.id)}
                        disabled={!editContent.trim()}
                        className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-40"
                        style={{
                          background: 'var(--accent-primary)',
                          color: '#0a0e14',
                        }}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {comment.authorName || 'QA'}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: es })}
                        </span>
                      </div>
                      {isOwnComment && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(comment)}
                            className="p-1 rounded transition-colors hover:bg-[var(--bg-elevated)]"
                          >
                            <Edit className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                          </button>
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="p-1 rounded transition-colors hover:bg-[var(--error-subtle)]"
                          >
                            <Trash2 className="h-3 w-3" style={{ color: 'var(--error)' }} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {comment.content}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Agregar un comentario..."
            className="w-full px-3 py-2 text-sm rounded-lg resize-none pr-10"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
            rows={2}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="absolute bottom-2 right-2 p-1.5 rounded-lg transition-all disabled:opacity-40"
            style={{
              background: newComment.trim() ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: newComment.trim() ? '#0a0e14' : 'var(--text-muted)',
            }}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Los comentarios son visibles para todo el equipo
        </p>
      </form>
    </div>
  );
}
