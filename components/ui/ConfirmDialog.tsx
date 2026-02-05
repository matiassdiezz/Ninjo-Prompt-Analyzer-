'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirmar',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap and escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'var(--error-subtle)',
      iconColor: 'var(--error)',
      confirmBg: 'var(--error)',
      confirmHoverBg: '#dc2626',
      Icon: Trash2,
    },
    warning: {
      iconBg: 'var(--warning-subtle)',
      iconColor: 'var(--warning)',
      confirmBg: 'var(--warning)',
      confirmHoverBg: '#d97706',
      Icon: AlertTriangle,
    },
    default: {
      iconBg: 'var(--accent-subtle)',
      iconColor: 'var(--accent-primary)',
      confirmBg: 'var(--accent-primary)',
      confirmHoverBg: '#00b894',
      Icon: AlertTriangle,
    },
  };

  const styles = variantStyles[variant];
  const Icon = styles.Icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-2xl animate-slideDown"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: styles.iconBg }}
            >
              <Icon className="h-5 w-5" style={{ color: styles.iconColor }} />
            </div>

            {/* Text */}
            <div className="flex-1 pt-1">
              <h3
                className="text-base font-semibold mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:bg-white/5"
            style={{
              color: 'var(--text-secondary)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:opacity-90"
            style={{
              color: 'white',
              background: styles.confirmBg,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
