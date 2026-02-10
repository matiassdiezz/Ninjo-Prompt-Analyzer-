'use client';

import { useEffect, useState } from 'react';
import { registerDevice, setSupabaseDeviceId } from '../device';
import { isSupabaseConfigured, supabase } from '../client';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { mapDbKnowledgeEntryToApp, mapDbAgentToApp } from '../types';
import type { DbKnowledgeEntry, DbAgent } from '../types';

export function useSupabaseInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
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
        } else {
          throw new Error('No se pudo registrar el dispositivo');
        }

        // Initialize data from Supabase
        await initializeFromSupabase();

        if (mounted) {
          setIsInitialized(true);
          setInitError(null);
        }
      } catch (error) {
        console.error('Error initializing Supabase:', error);
        if (mounted) {
          setInitError(error instanceof Error ? error.message : 'Error al inicializar Supabase');
          // Still mark as initialized so the app can work in offline mode
          setIsInitialized(true);
        }
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

    // Set up Realtime subscriptions for multi-device sync
    const channels: ReturnType<NonNullable<typeof supabase>['channel']>[] = [];

    if (isSupabaseConfigured() && supabase) {
      // Knowledge entries channel
      const knowledgeChannel = supabase
        .channel('knowledge-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'knowledge_entries',
          },
          (payload) => {
            if (!mounted) return;

            if (payload.eventType === 'INSERT' && payload.new) {
              const newEntry = mapDbKnowledgeEntryToApp(payload.new as DbKnowledgeEntry);
              const { entries } = useKnowledgeStore.getState();
              const exists = entries.some(e => e.id === newEntry.id);

              if (!exists) {
                if (typeof window !== 'undefined') {
                  const event = new CustomEvent('new-learning', { detail: newEntry });
                  window.dispatchEvent(event);
                }
                useKnowledgeStore.setState((state) => ({
                  entries: [...state.entries, newEntry],
                }));
              }
            }

            if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedEntry = mapDbKnowledgeEntryToApp(payload.new as DbKnowledgeEntry);
              useKnowledgeStore.setState((state) => ({
                entries: state.entries.map(e =>
                  e.id === updatedEntry.id ? updatedEntry : e
                ),
              }));
            }

            if (payload.eventType === 'DELETE' && payload.old) {
              const deletedId = (payload.old as any).id;
              useKnowledgeStore.setState((state) => ({
                entries: state.entries.filter(e => e.id !== deletedId),
              }));
            }
          }
        )
        .subscribe();
      channels.push(knowledgeChannel);

      // Agents channel (multi-device prompt sync)
      const agentsChannel = supabase
        .channel('agent-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'agents',
          },
          (payload) => {
            if (!mounted) return;

            const dbAgent = payload.new as DbAgent;
            const updatedAgent = mapDbAgentToApp(dbAgent, []);

            useKnowledgeStore.setState((state) => ({
              projects: state.projects.map(p => {
                if (p.id !== dbAgent.project_id) return p;
                return {
                  ...p,
                  agents: p.agents.map(a => {
                    if (a.id !== updatedAgent.id) return a;
                    // Preserve local versions (realtime doesn't include them)
                    return { ...updatedAgent, versions: a.versions };
                  }),
                };
              }),
            }));
          }
        )
        .subscribe();
      channels.push(agentsChannel);
    }

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      // Cleanup Realtime subscriptions
      channels.forEach(ch => ch.unsubscribe());
    };
  }, [initializeFromSupabase, setOnlineStatus]);

  return { isInitialized, isLoading, initError };
}
