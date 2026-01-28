'use client';

import { useEffect, useCallback } from 'react';
import { X, GitBranch } from 'lucide-react';
import { VersionTimeline } from '@/components/review/VersionTimeline';
import { useKnowledgeStore } from '@/store/knowledgeStore';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistoryModal({ isOpen, onClose }: VersionHistoryModalProps) {
  const { getCurrentProject } = useKnowledgeStore();
  const project = getCurrentProject();
  const versionsCount = project?.versions?.length || 0;

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl max-h-[80vh] rounded-2xl overflow-hidden animate-slideUp"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }}
            >
              <GitBranch className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                Historial de Versiones
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {versionsCount} {versionsCount === 1 ? 'versión guardada' : 'versiones guardadas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[60vh] overflow-hidden">
          <VersionTimeline />
        </div>
      </div>
    </div>
  );
}
