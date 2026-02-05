import { supabase } from '../client';
import type { DbLearningVote } from '../types';
import type { LearningVote } from '@/types/prompt';

export const votesRepository = {
  async getByLearning(learningId: string): Promise<LearningVote[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('learning_votes')
      .select('*')
      .eq('learning_id', learningId);

    if (error) {
      console.error('Error fetching votes:', error);
      return [];
    }

    return (data || []).map(mapDbVoteToApp);
  },

  async getVoteStats(learningId: string): Promise<{ upvotes: number; downvotes: number; total: number }> {
    if (!supabase) return { upvotes: 0, downvotes: 0, total: 0 };

    const { data, error } = await supabase
      .from('learning_votes')
      .select('vote')
      .eq('learning_id', learningId);

    if (error) {
      console.error('Error fetching vote stats:', error);
      return { upvotes: 0, downvotes: 0, total: 0 };
    }

    const upvotes = (data || []).filter(v => v.vote === 1).length;
    const downvotes = (data || []).filter(v => v.vote === -1).length;

    return {
      upvotes,
      downvotes,
      total: upvotes + downvotes,
    };
  },

  async vote(
    learningId: string,
    deviceId: string,
    vote: -1 | 1
  ): Promise<LearningVote | null> {
    if (!supabase) return null;

    // Upsert: insert or update if exists
    const { data, error } = await supabase
      .from('learning_votes')
      .upsert({
        learning_id: learningId,
        device_id: deviceId,
        vote,
      }, {
        onConflict: 'learning_id,device_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error voting:', error);
      return null;
    }

    return mapDbVoteToApp(data);
  },

  async removeVote(learningId: string, deviceId: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from('learning_votes')
      .delete()
      .eq('learning_id', learningId)
      .eq('device_id', deviceId);

    if (error) {
      console.error('Error removing vote:', error);
      return false;
    }

    return true;
  },

  async getUserVote(learningId: string, deviceId: string): Promise<-1 | 1 | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('learning_votes')
      .select('vote')
      .eq('learning_id', learningId)
      .eq('device_id', deviceId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.vote as -1 | 1;
  },
};

function mapDbVoteToApp(dbVote: DbLearningVote): LearningVote {
  return {
    id: dbVote.id,
    learningId: dbVote.learning_id,
    deviceId: dbVote.device_id,
    vote: dbVote.vote,
    createdAt: new Date(dbVote.created_at).getTime(),
  };
}
