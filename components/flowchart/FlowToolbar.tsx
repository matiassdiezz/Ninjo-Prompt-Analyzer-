'use client';

import { useState } from 'react';
import {
  Play,
  Square,
  MessageSquare,
  HelpCircle,
  Trash2,
  Upload,
  Maximize2,
  Shield,
  Sparkles,
  FileText,
  FileInput,
  LayoutTemplate,
  Wand2,
  Undo2,
  Redo2,
  LayoutGrid,
} from 'lucide-react';
import type { FlowNodeType } from '@/types/flow';

interface FlowToolbarProps {
  onAddNode: (type: FlowNodeType) => void;
  onDeleteSelected: () => void;
  onFitView: () => void;
  onCreateInitialFlow: () => void;
  hasNodes: boolean;
  hasSelectedNode: boolean;
  selectedNodeType?: FlowNodeType;
  validationWarningCount: number;
  onToggleValidation: () => void;
  onGenerateFromNL: () => void;
  onExportAscii: () => void;
  onInsertInPrompt: () => void;
  onOpenTemplates: () => void;
  onGeneratePromptSections: () => void;
  // Undo/Redo
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Clear
  onClearFlow: () => void;
  // Auto-layout
  onAutoLayout: () => void;
}

const nodeButtons: { type: FlowNodeType; icon: typeof Play; label: string; color: string }[] = [
  { type: 'start', icon: Play, label: 'Inicio', color: 'var(--success)' },
  { type: 'action', icon: MessageSquare, label: 'Accion', color: 'var(--accent-primary)' },
  { type: 'decision', icon: HelpCircle, label: 'Decision', color: 'var(--warning)' },
  { type: 'end', icon: Square, label: 'Fin', color: 'var(--error)' },
];

export function FlowToolbar({
  onAddNode,
  onDeleteSelected,
  onFitView,
  onCreateInitialFlow,
  hasNodes,
  hasSelectedNode,
  selectedNodeType,
  validationWarningCount,
  onToggleValidation,
  onGenerateFromNL,
  onExportAscii,
  onInsertInPrompt,
  onOpenTemplates,
  onGeneratePromptSections,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearFlow,
  onAutoLayout,
}: FlowToolbarProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div
      className="flex items-center gap-3 p-3 border-b flex-wrap"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Add Nodes */}
      <div className="flex items-center gap-1">
        <span
          className="text-xs font-medium mr-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          Agregar:
        </span>
        {nodeButtons.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => onAddNode(type)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:scale-105"
            style={{
              background: `${color}15`,
              border: `1px solid ${color}40`,
              color: color,
            }}
            title={`Agregar nodo ${label}`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div
        className="h-6 w-px"
        style={{ background: 'var(--border-default)' }}
      />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title="Deshacer (Cmd+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title="Rehacer (Cmd+Shift+Z)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Divider */}
      <div
        className="h-6 w-px"
        style={{ background: 'var(--border-default)' }}
      />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Delete selected */}
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelectedNode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: hasSelectedNode ? 'var(--error-subtle)' : 'transparent',
            border: `1px solid ${hasSelectedNode ? 'rgba(248, 81, 73, 0.3)' : 'var(--border-subtle)'}`,
            color: hasSelectedNode ? 'var(--error)' : 'var(--text-muted)',
          }}
          title="Eliminar nodo seleccionado"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Eliminar</span>
        </button>

        {/* Clear flow */}
        {hasNodes && !showClearConfirm && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="Limpiar todo el flujo"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Limpiar</span>
          </button>
        )}

        {/* Clear confirmation inline */}
        {showClearConfirm && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{
              background: 'var(--error-subtle)',
              border: '1px solid rgba(248, 81, 73, 0.3)',
            }}
          >
            <span className="text-xs" style={{ color: 'var(--error)' }}>
              Borrar todo?
            </span>
            <button
              onClick={() => {
                onClearFlow();
                setShowClearConfirm(false);
              }}
              className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
              style={{
                background: 'var(--error)',
                color: 'white',
              }}
            >
              Borrar
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Auto-layout */}
        {hasNodes && (
          <button
            onClick={onAutoLayout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:scale-105"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="Ordenar flujo automaticamente"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Ordenar</span>
          </button>
        )}

        {/* Fit view */}
        <button
          onClick={onFitView}
          disabled={!hasNodes}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title="Ajustar vista"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Ajustar</span>
        </button>

        {/* Validation */}
        <button
          onClick={onToggleValidation}
          disabled={!hasNodes}
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: validationWarningCount > 0 ? 'var(--warning-subtle)' : 'var(--bg-tertiary)',
            border: `1px solid ${validationWarningCount > 0 ? 'rgba(227, 179, 65, 0.3)' : 'var(--border-subtle)'}`,
            color: validationWarningCount > 0 ? 'var(--warning)' : 'var(--text-secondary)',
          }}
          title="Validar flujo"
        >
          <Shield className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Validar</span>
          {validationWarningCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
              style={{
                background: 'var(--warning)',
                color: 'var(--bg-primary)',
              }}
            >
              {validationWarningCount > 9 ? '9+' : validationWarningCount}
            </span>
          )}
        </button>

        {/* Export ASCII */}
        <button
          onClick={onExportAscii}
          disabled={!hasNodes}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title="Exportar como ASCII"
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">ASCII</span>
        </button>

        {/* Insert in Prompt */}
        <button
          onClick={onInsertInPrompt}
          disabled={!hasNodes}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: hasNodes ? 'rgba(0, 212, 170, 0.1)' : 'var(--bg-tertiary)',
            border: `1px solid ${hasNodes ? 'rgba(0, 212, 170, 0.3)' : 'var(--border-subtle)'}`,
            color: hasNodes ? 'var(--accent-primary)' : 'var(--text-muted)',
          }}
          title="Insertar diagrama ASCII en el prompt"
        >
          <FileInput className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Insertar en prompt</span>
        </button>
      </div>

      {/* Divider */}
      <div
        className="h-6 w-px"
        style={{ background: 'var(--border-default)' }}
      />

      {/* Templates */}
      <button
        onClick={onOpenTemplates}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:scale-105"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
        title="Usar plantilla de flujo"
      >
        <LayoutTemplate className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Plantillas</span>
      </button>

      {/* Generate Prompt Sections */}
      <button
        onClick={onGeneratePromptSections}
        disabled={!hasNodes}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: hasNodes ? 'rgba(168, 85, 247, 0.1)' : 'var(--bg-tertiary)',
          border: `1px solid ${hasNodes ? 'rgba(168, 85, 247, 0.3)' : 'var(--border-subtle)'}`,
          color: hasNodes ? '#a855f7' : 'var(--text-muted)',
        }}
        title="Generar secciones de prompt desde el flujo"
      >
        <Wand2 className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Generar Prompt</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Generate with AI */}
      <button
        onClick={onGenerateFromNL}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:scale-105"
        style={{
          background: 'var(--accent-glow)',
          border: '1px solid var(--accent-primary)',
          color: 'var(--accent-primary)',
        }}
        title="Generar flujo con IA"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">Generar con IA</span>
      </button>

      {/* Create initial flow */}
      {!hasNodes && (
        <button
          onClick={onCreateInitialFlow}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all btn-primary"
        >
          <Upload className="h-4 w-4" />
          <span className="text-sm font-medium">Crear flujo inicial</span>
        </button>
      )}
    </div>
  );
}
