'use client';

import { useState } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { Save, X, Clock, ToggleLeft, ToggleRight } from 'lucide-react';

interface SaveVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string) => void;
}

function SaveVersionModal({ isOpen, onClose, onSave }: SaveVersionModalProps) {
  const [label, setLabel] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (label.trim()) {
      onSave(label.trim());
      setLabel('');
      onClose();
    }
  };

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
        className="relative rounded-xl w-full max-w-md mx-4 overflow-hidden animate-slideUp"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }}
            >
              <Save className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Guardar Versión
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg btn-ghost"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5">
          <label
            htmlFor="version-label"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Nombre de la versión
          </label>
          <input
            id="version-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej: Versión inicial, Después de agregar ejemplos..."
            className="input w-full"
            autoFocus
          />
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Las versiones te permiten volver a estados anteriores de tu prompt.
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium rounded-lg btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!label.trim()}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SaveVersionButton() {
  const {
    hasUnsavedChanges,
    autoSaveEnabled,
    setAutoSaveEnabled,
    saveManualVersion,
  } = useAnalysisStore();

  const [showModal, setShowModal] = useState(false);

  const handleSave = (label: string) => {
    saveManualVersion(label);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Auto-save toggle */}
      <button
        onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all duration-200"
        style={{
          background: autoSaveEnabled ? 'var(--success-subtle)' : 'var(--bg-tertiary)',
          color: autoSaveEnabled ? 'var(--success)' : 'var(--text-muted)',
          border: `1px solid ${autoSaveEnabled ? 'rgba(63, 185, 80, 0.2)' : 'var(--border-subtle)'}`
        }}
        title={autoSaveEnabled ? 'Auto-guardado activado' : 'Auto-guardado desactivado'}
      >
        {autoSaveEnabled ? (
          <ToggleRight className="h-3.5 w-3.5" />
        ) : (
          <ToggleLeft className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline font-medium">Auto</span>
      </button>

      {/* Save button */}
      <button
        onClick={() => setShowModal(true)}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200
          ${hasUnsavedChanges
            ? 'btn-primary'
            : 'btn-secondary'
          }
        `}
        title="Guardar versión manual"
      >
        <Save className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Guardar</span>
        {hasUnsavedChanges && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: hasUnsavedChanges ? '#0a0e14' : 'var(--accent-primary)' }}
          />
        )}
      </button>

      {/* Modal */}
      <SaveVersionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </div>
  );
}

export function VersionIndicator() {
  const { promptHistory, hasUnsavedChanges } = useAnalysisStore();

  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
      <Clock className="h-3.5 w-3.5" />
      <span>{promptHistory.length} versiones</span>
      {hasUnsavedChanges && (
        <span style={{ color: 'var(--warning)' }}>(sin guardar)</span>
      )}
    </div>
  );
}
