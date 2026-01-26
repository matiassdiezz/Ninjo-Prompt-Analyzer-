'use client';

import { useKnowledgeStore } from '@/store/knowledgeStore';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export function SyncStatus() {
  const { sync, clearSyncError } = useKnowledgeStore();
  const { isOnline, isSyncing, lastSyncedAt, pendingOperations, syncError } = sync;

  // Don't show anything if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return null;
  }

  const pendingCount = pendingOperations.length;
  const hasError = !!syncError;

  const getStatusIcon = () => {
    if (hasError) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (!isOnline) {
      return <CloudOff className="h-4 w-4 text-gray-400" />;
    }
    if (isSyncing) {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    if (pendingCount > 0) {
      return <Cloud className="h-4 w-4 text-yellow-500" />;
    }
    return <Check className="h-4 w-4 text-green-500" />;
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
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md text-xs
          transition-colors
          ${hasError ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}
        `}
        onClick={() => hasError && clearSyncError()}
        title={hasError ? syncError : getStatusText()}
      >
        {getStatusIcon()}
        <span className="text-gray-600 hidden sm:inline">{getStatusText()}</span>
      </button>

      {/* Tooltip on hover */}
      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs hidden group-hover:block z-50 min-w-[150px]">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Estado:</span>
            <span className={isOnline ? 'text-green-600' : 'text-gray-600'}>
              {isOnline ? 'Conectado' : 'Sin conexión'}
            </span>
          </div>
          {lastSyncedAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Última sync:</span>
              <span className="text-gray-600">{getLastSyncText()}</span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Pendientes:</span>
              <span className="text-yellow-600">{pendingCount}</span>
            </div>
          )}
          {hasError && (
            <div className="pt-1 mt-1 border-t border-gray-100">
              <p className="text-red-600 text-[10px]">{syncError}</p>
              <p className="text-gray-400 text-[10px] mt-0.5">Click para cerrar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
