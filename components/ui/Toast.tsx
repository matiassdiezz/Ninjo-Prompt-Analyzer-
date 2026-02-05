'use client';

import { useEffect, useState } from 'react';
import { X, Bell, MessageSquare, Sparkles } from 'lucide-react';
import type { KnowledgeEntry } from '@/types/prompt';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Sparkles className="h-4 w-4" style={{ color: 'var(--success)' }} />;
      case 'warning':
        return <Bell className="h-4 w-4" style={{ color: 'var(--warning)' }} />;
      case 'error':
        return <X className="h-4 w-4" style={{ color: 'var(--error)' }} />;
      default:
        return <Bell className="h-4 w-4" style={{ color: 'var(--info)' }} />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'var(--success-subtle)',
          border: '1px solid rgba(63, 185, 80, 0.3)',
        };
      case 'warning':
        return {
          background: 'var(--warning-subtle)',
          border: '1px solid rgba(240, 180, 41, 0.3)',
        };
      case 'error':
        return {
          background: 'var(--error-subtle)',
          border: '1px solid rgba(248, 81, 73, 0.3)',
        };
      default:
        return {
          background: 'var(--info-subtle)',
          border: '1px solid rgba(88, 166, 255, 0.3)',
        };
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slideUp"
      style={getStyles()}
    >
      {getIcon()}
      <p className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
        {message}
      </p>
      <button
        onClick={onClose}
        className="p-1 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
      >
        <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  children: React.ReactNode;
}

export function ToastContainer({ children }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2 max-w-md">
      {children}
    </div>
  );
}

interface NewLearningToastProps {
  learning: KnowledgeEntry;
  onClose: () => void;
}

export function NewLearningToast({ learning, onClose }: NewLearningToastProps) {
  const isPattern = learning.type === 'pattern';

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg animate-slideUp min-w-[320px]"
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${isPattern ? 'rgba(63, 185, 80, 0.3)' : 'rgba(248, 81, 73, 0.3)'}`,
      }}
    >
      {isPattern ? (
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ background: 'var(--success-subtle)' }}
        >
          <Sparkles className="h-5 w-5" style={{ color: 'var(--success)' }} />
        </div>
      ) : (
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ background: 'var(--error-subtle)' }}
        >
          <Bell className="h-5 w-5" style={{ color: 'var(--error)' }} />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-primary)' }}>
          🆕 Nuevo aprendizaje del equipo
        </p>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          {learning.title}
        </p>
        <p className="text-xs line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
          {learning.description}
        </p>
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)] flex-shrink-0"
      >
        <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  );
}
