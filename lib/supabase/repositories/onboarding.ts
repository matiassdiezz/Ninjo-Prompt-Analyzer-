import { supabase, isSupabaseConfigured } from '../client';
import type { OnboardingProgress } from '@/types/prompt';
import type { DbOnboardingProgress } from '../types';

// Mapper: DB -> App
function mapDbToApp(db: DbOnboardingProgress): OnboardingProgress {
  return {
    deviceId: db.device_id,
    learningId: db.learning_id,
    markedRead: db.marked_read,
    readAt: db.read_at ? new Date(db.read_at).getTime() : undefined,
  };
}

export const onboardingRepository = {
  /**
   * Get all onboarding progress for a device
   */
  async getProgress(deviceId: string): Promise<OnboardingProgress[]> {
    if (!isSupabaseConfigured() || !supabase) return [];

    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('device_id', deviceId);

    if (error) {
      console.error('Error fetching onboarding progress:', error);
      return [];
    }

    return (data || []).map(mapDbToApp);
  },

  /**
   * Mark a learning as read for a device
   */
  async markAsRead(deviceId: string, learningId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    const { error } = await supabase
      .from('onboarding_progress')
      .upsert({
        device_id: deviceId,
        learning_id: learningId,
        marked_read: true,
        read_at: new Date().toISOString(),
      }, {
        onConflict: 'device_id,learning_id',
      });

    if (error) {
      console.error('Error marking learning as read:', error);
      return false;
    }

    return true;
  },

  /**
   * Mark a learning as unread for a device
   */
  async markAsUnread(deviceId: string, learningId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    const { error } = await supabase
      .from('onboarding_progress')
      .upsert({
        device_id: deviceId,
        learning_id: learningId,
        marked_read: false,
        read_at: null,
      }, {
        onConflict: 'device_id,learning_id',
      });

    if (error) {
      console.error('Error marking learning as unread:', error);
      return false;
    }

    return true;
  },

  /**
   * Get count of unread learnings for a device
   */
  async getUnreadCount(deviceId: string, totalLearningIds: string[]): Promise<number> {
    if (!isSupabaseConfigured() || !supabase) return totalLearningIds.length;

    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('learning_id')
      .eq('device_id', deviceId)
      .eq('marked_read', true);

    if (error) {
      console.error('Error fetching unread count:', error);
      return totalLearningIds.length;
    }

    const readIds = new Set((data || []).map(d => d.learning_id));
    return totalLearningIds.filter(id => !readIds.has(id)).length;
  },

  /**
   * Get IDs of all read learnings for a device
   */
  async getReadLearningIds(deviceId: string): Promise<string[]> {
    if (!isSupabaseConfigured() || !supabase) return [];

    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('learning_id')
      .eq('device_id', deviceId)
      .eq('marked_read', true);

    if (error) {
      console.error('Error fetching read learning IDs:', error);
      return [];
    }

    return (data || []).map(d => d.learning_id);
  },

  /**
   * Bulk mark multiple learnings as read
   */
  async markMultipleAsRead(deviceId: string, learningIds: string[]): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || learningIds.length === 0) return false;

    const records = learningIds.map(learningId => ({
      device_id: deviceId,
      learning_id: learningId,
      marked_read: true,
      read_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('onboarding_progress')
      .upsert(records, {
        onConflict: 'device_id,learning_id',
      });

    if (error) {
      console.error('Error marking multiple learnings as read:', error);
      return false;
    }

    return true;
  },
};
