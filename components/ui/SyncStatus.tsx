'use client';

import { useKnowledgeStore } from '@/store/knowledgeStore';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, List } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useState } from 'react';
import { PendingOperationsModal } from './PendingOperationsModal';

export function SyncStatus() {
  const { sync, clearSyncError } = useKnowledgeStore();
  const { isOnline, isSyncing, lastSyncedAt, pendingOperations, syncError } = sync;
  const [showModal, setShowModal] = useState(false);

  // Don't show anything if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return null;
  }

  const pendingCount = pendingOperations.length;
  const hasError = !!syncError;

  const getStatusIcon = () => {
    if (hasError) {
      return <AlertCircle className="h-4 w-4" style={{ color: 'var(--error)' }} />;
    }
    if (!isOnline) {
      return <CloudOff className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />;
    }
    if (isSyncing) {
      return <RefreshCw className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />;
    }
    if (pendingCount > 0) {
      return <Cloud className="h-4 w-4" style={{ color: 'var(--warning)' }} />;
    }
    return <Check className="h-4 w-4" style={{ color: 'var(--success)' }} />;
  };

  const getStatusText = () => {
    if (hasError) {
      return 'Error';
    }
    if (!isOnline) {
      return 'Offline';
    }
    if (isSyncing) {
      return 'Sincronizando...';
    }
    if (pendingCount > 0) {
      return `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`;
    }
    return 'Sincronizado';
  };

  const getLastSyncText = () => {
    if (!lastSyncedAt) return null;
    const diff = Date.now() - lastSyncedAt;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours}h`;
  };

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
        style={{
          background: hasError ? 'var(--error-subtle)' : 'var(--bg-tertiary)',
          border: `1px solid ${hasError ? 'rgba(248, 81, 73, 0.2)' : 'var(--border-subtle)'}`
        }}
        onClick={() => hasError && clearSyncError()}
        title={hasError ? syncError : getStatusText()}
      >
        {getStatusIcon()}
        <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
          {getStatusText()}
        </span>
      </button>

      {/* Tooltip on hover */}
      <div
        className="absolute right-0 top-full mt-2 rounded-xl p-3 text-xs hidden group-hover:block z-50 min-w-[180px] animate-fadeIn"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span style={{ color: 'var(--text-tertiary)' }}>Estado:</span>
            <span style={{ color: isOnline ? 'var(--success)' : 'var(--text-muted)' }}>
              {isOnline ? 'Conectado' : 'Sin conexión'}
            </span>
          </div>
          {lastSyncedAt && (
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--text-tertiary)' }}>Última sync:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{getLastSyncText()}</span>
            </div>
          )}
          {pendingCount > 0 && (
            <>
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--text-tertiary)' }}>Pendientes:</span>
                <span style={{ color: 'var(--warning)' }}>{pendingCount}</span>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="w-full mt-2 py-1.5 px-2 rounded-md text-[10px] font-medium transition-colors flex items-center justify-center gap-1.5"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                <List className="h-3 w-3" />
                Ver detalles
              </button>
            </>
          )}
          {hasError && (
            <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px]" style={{ color: 'var(--error)' }}>{syncError}</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Click para cerrar</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <PendingOperationsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
