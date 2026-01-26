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
        <h3 className="font-semibold text-gray-900">Gestión de Datos</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Toggle between Export and Import */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setImportMode(false)}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            !importMode
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
        <button
          onClick={() => {
            setImportMode(true);
            setImportResult(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            importMode
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Upload className="h-4 w-4" />
          Importar
        </button>
      </div>

      {!importMode ? (
        /* Export Options */
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            Exporta tus datos como archivo JSON para compartir o backup.
          </p>

          <button
            onClick={() => handleExport('current')}
            disabled={!currentProject}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FolderOpen className="h-4 w-4 text-blue-500" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Proyecto actual</p>
              <p className="text-xs text-gray-500">
                {currentProject ? currentProject.name : 'Ninguno seleccionado'}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleExport('all')}
            disabled={projects.length === 0}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Database className="h-4 w-4 text-purple-500" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Todos los proyectos</p>
              <p className="text-xs text-gray-500">
                {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleExport('knowledge')}
            disabled={entries.length === 0}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <BookOpen className="h-4 w-4 text-green-500" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Base de Conocimiento</p>
              <p className="text-xs text-gray-500">
                {entries.length} entrada{entries.length !== 1 ? 's' : ''}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleExport('full')}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HardDrive className="h-4 w-4 text-orange-500" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Backup Completo</p>
              <p className="text-xs text-gray-500">
                Todo: proyectos, knowledge, decisiones
              </p>
            </div>
          </button>
        </div>
      ) : (
        /* Import Options */
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Importa datos desde un archivo JSON exportado previamente.
          </p>

          {/* Import Options */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700">Opciones:</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Sobrescribir existentes</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mergeVersions}
                onChange={(e) => setMergeVersions(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Fusionar versiones de proyectos</span>
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
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                importing
                  ? 'bg-gray-100 border-gray-300 text-gray-500'
                  : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
              }`}
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent" />
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
              className={`p-3 rounded-lg flex items-start gap-2 ${
                importResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {importResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    importResult.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {importResult.message}
                </p>
                {importResult.details && (
                  <p className="text-xs text-green-600 mt-1">
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
