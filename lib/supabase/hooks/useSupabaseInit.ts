'use client';

import { useEffect, useState } from 'react';
import { registerDevice, setSupabaseDeviceId } from '../device';
import { isSupabaseConfigured } from '../client';
import { useKnowledgeStore } from '@/store/knowledgeStore';

export function useSupabaseInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { initializeFromSupabase, setOnlineStatus } = useKnowledgeStore();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured, using localStorage only');
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
        return;
      }

      try {
        // Register device
        const deviceId = await registerDevice();
        if (deviceId) {
          setSupabaseDeviceId(deviceId);
        }

        // Initialize data from Supabase
        await initializeFromSupabase();

        if (mounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing Supabase:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    // Set up online/offline listeners
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initializeFromSupabase, setOnlineStatus]);

  return { isInitialized, isLoading };
}
