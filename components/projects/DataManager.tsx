'use client';

import { useState, useRef } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { readJsonFile } from '@/lib/exportImport';
import {
  Download,
  Upload,
  FolderOpen,
  Database,
  BookOpen,
  HardDrive,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface DataManagerProps {
  onClose: () => void;
}

export function DataManager({ onClose }: DataManagerProps) {
  const {
    projects,
    entries,
    currentProjectId,
    exportCurrentProject,
    exportAllProjects,
    exportKnowledgeBase,
    exportFullBackup,
    importData,
  } = useKnowledgeStore();

  const [importMode, setImportMode] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    details?: { added: number; updated: number; skipped: number };
  } | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [mergeVersions, setMergeVersions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleExport = (type: 'current' | 'all' | 'knowledge' | 'full') => {
    switch (type) {
      case 'current':
        exportCurrentProject();
        break;
      case 'all':
        exportAllProjects();
        break;
      case 'knowledge':
        exportKnowledgeBase();
        break;
      case 'full':
        exportFullBackup();
        break;
    }
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const data = await readJsonFile(file);
      const result = importData(data, {
        overwriteExisting,
        mergeVersions,
      });
      setImportResult(result);
    } catch (err) {
      setImportResult({
        success: false,
        message: err instanceof Error ? err.message : 'Error al importar',
      });
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Gestión de Datos</h3>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Toggle between Export and Import */}
      <div className="flex gap-1 p-1 rounded-lg mb-4" style={{ background: 'var(--bg-tertiary)' }}>
        <button
          onClick={() => setImportMode(false)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors"
          style={{
            background: !importMode ? 'var(--accent-glow)' : 'transparent',
            color: !importMode ? 'var(--accent-primary)' : 'var(--text-secondary)',
          }}
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
        <button
          onClick={() => {
            setImportMode(true);
            setImportResult(null);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors"
          style={{
            background: importMode ? 'var(--success-subtle)' : 'transparent',
            color: importMode ? 'var(--success)' : 'var(--text-secondary)',
          }}
        >
          <Upload className="h-4 w-4" />
          Importar
        </button>
      </div>

      {!importMode ? (
        /* Export Options */
        <div className="space-y-2">
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Exporta tus datos como archivo JSON para compartir o backup.
          </p>

          <button
            onClick={() => handleExport('current')}
            disabled={!currentProject}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          >
            <FolderOpen className="h-4 w-4" style={{ color: 'var(--info)' }} />
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Proyecto actual</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {currentProject ? currentProject.name : 'Ninguno seleccionado'}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleExport('all')}
            disabled={projects.length === 0}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          >
            <Database className="h-4 w-4" style={{ color: '#a78bfa' }} />
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Todos los proyectos</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleExport('knowledge')}
            disabled={entries.length === 0}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          >
            <BookOpen className="h-4 w-4" style={{ color: 'var(--success)' }} />
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Base de Conocimiento</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {entries.length} entrada{entries.length !== 1 ? 's' : ''}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleExport('full')}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-lg transition-colors"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          >
            <HardDrive className="h-4 w-4" style={{ color: 'var(--warning)' }} />
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Backup Completo</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Todo: proyectos, knowledge, decisiones
              </p>
            </div>
          </button>
        </div>
      ) : (
        /* Import Options */
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Importa datos desde un archivo JSON exportado previamente.
          </p>

          {/* Import Options */}
          <div className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Opciones:</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="rounded"
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Sobrescribir existentes</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={mergeVersions}
                onChange={(e) => setMergeVersions(e.target.checked)}
                className="rounded"
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Fusionar versiones de proyectos</span>
            </label>
          </div>

          {/* File Input */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg border-2 border-dashed cursor-pointer transition-colors"
              style={{
                background: importing ? 'var(--bg-tertiary)' : 'var(--success-subtle)',
                borderColor: importing ? 'var(--border-default)' : 'rgba(63, 185, 80, 0.3)',
                color: importing ? 'var(--text-muted)' : 'var(--success)',
              }}
            >
              {importing ? (
                <>
                  <div
                    className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent"
                    style={{ borderColor: 'var(--success)', borderTopColor: 'transparent' }}
                  />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Seleccionar archivo JSON
                </>
              )}
            </label>
          </div>

          {/* Import Result */}
          {importResult && (
            <div
              className="p-3 rounded-lg flex items-start gap-2"
              style={{
                background: importResult.success ? 'var(--success-subtle)' : 'var(--error-subtle)',
                border: `1px solid ${importResult.success ? 'rgba(63, 185, 80, 0.2)' : 'rgba(248, 81, 73, 0.2)'}`,
              }}
            >
              {importResult.success ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
              )}
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: importResult.success ? 'var(--success)' : 'var(--error)' }}
                >
                  {importResult.message}
                </p>
                {importResult.details && (
                  <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>
                    {importResult.details.added} agregados, {importResult.details.updated} actualizados, {importResult.details.skipped} omitidos
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
