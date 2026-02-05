import { supabase } from '../client';
import type { DbLearningComment } from '../types';
import type { LearningComment } from '@/types/prompt';

export const commentsRepository = {
  async getByLearning(learningId: string): Promise<LearningComment[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('learning_comments')
      .select('*')
      .eq('learning_id', learningId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    return (data || []).map(mapDbCommentToApp);
  },

  async create(
    learningId: string,
    content: string,
    deviceId: string,
    authorName?: string
  ): Promise<LearningComment | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('learning_comments')
      .insert({
        learning_id: learningId,
        device_id: deviceId,
        author_name: authorName || null,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return null;
    }

    return mapDbCommentToApp(data);
  },

  async update(commentId: string, content: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from('learning_comments')
      .update({ content })
      .eq('id', commentId);

    if (error) {
      console.error('Error updating comment:', error);
      return false;
    }

    return true;
  },

  async delete(commentId: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from('learning_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return false;
    }

    return true;
  },
};

function mapDbCommentToApp(dbComment: DbLearningComment): LearningComment {
  return {
    id: dbComment.id,
    learningId: dbComment.learning_id,
    deviceId: dbComment.device_id,
    authorName: dbComment.author_name || undefined,
    content: dbComment.content,
    createdAt: new Date(dbComment.created_at).getTime(),
    updatedAt: new Date(dbComment.updated_at).getTime(),
  };
}
