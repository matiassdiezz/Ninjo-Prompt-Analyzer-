'use client';

import { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  Pencil,
  Download,
  RefreshCcw,
  Type,
  Code,
} from 'lucide-react';
import type { FlowNodeType, FlowTextFormat } from '@/types/flow';

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
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearFlow: () => void;
  onAutoLayout: () => void;
  onReinsertFlowInPrompt: (format: FlowTextFormat) => void;
  hasSourceOrigin: boolean;
}

const nodeButtons: { type: FlowNodeType; icon: typeof Play; label: string; color: string }[] = [
  { type: 'start', icon: Play, label: 'Inicio', color: 'var(--success)' },
  { type: 'action', icon: MessageSquare, label: 'Accion', color: 'var(--accent-primary)' },
  { type: 'decision', icon: HelpCircle, label: 'Decision', color: 'var(--warning)' },
  { type: 'end', icon: Square, label: 'Fin', color: 'var(--error)' },
];

// Reusable dropdown component
function ToolbarDropdown({
  label,
  icon: Icon,
  children,
  badge,
  badgeColor,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  badge?: number;
  badgeColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
        style={{
          background: open ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
          border: `1px solid ${open ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
          color: open ? 'var(--accent-primary)' : 'var(--text-secondary)',
        }}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{label}</span>
        <ChevronDown className="h-3 w-3" style={{ opacity: 0.6 }} />
        {badge !== undefined && badge > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
            style={{
              background: badgeColor || 'var(--warning)',
              color: 'var(--bg-primary)',
            }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[200px] rounded-lg overflow-hidden z-50 animate-slideDown"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="py-1" onClick={() => setOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// Dropdown menu item
function DropdownItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  color,
  shortcut,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
  shortcut?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        color: disabled ? 'var(--text-muted)' : (color || 'var(--text-secondary)'),
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget.style.background = 'var(--bg-tertiary)');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 text-left font-medium">{label}</span>
      {shortcut && (
        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{shortcut}</span>
      )}
    </button>
  );
}

function DropdownDivider() {
  return (
    <div
      className="my-1 mx-2"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    />
  );
}

export function FlowToolbar({
  onAddNode,
  onDeleteSelected,
  onFitView,
  onCreateInitialFlow,
  hasNodes,
  hasSelectedNode,
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
  onReinsertFlowInPrompt,
  hasSourceOrigin,
}: FlowToolbarProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Add Nodes */}
      <div className="flex items-center gap-1">
        {nodeButtons.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => onAddNode(type)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all hover:scale-105"
            style={{
              background: `${color}15`,
              border: `1px solid ${color}40`,
              color: color,
            }}
            title={`Agregar nodo ${label}`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs font-medium hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-5 w-px" style={{ background: 'var(--border-default)' }} />

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
          title="Deshacer (Cmd+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
          title="Rehacer (Cmd+Shift+Z)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-5 w-px" style={{ background: 'var(--border-default)' }} />

      {/* Edit dropdown */}
      <ToolbarDropdown label="Editar" icon={Pencil}>
        <DropdownItem
          icon={Trash2}
          label="Eliminar seleccionado"
          onClick={onDeleteSelected}
          disabled={!hasSelectedNode}
          color="var(--error)"
          shortcut="Del"
        />
        <DropdownItem
          icon={LayoutGrid}
          label="Ordenar automaticamente"
          onClick={onAutoLayout}
          disabled={!hasNodes}
        />
        <DropdownItem
          icon={Maximize2}
          label="Ajustar vista"
          onClick={onFitView}
          disabled={!hasNodes}
        />
        <DropdownDivider />
        {!showClearConfirm ? (
          <DropdownItem
            icon={Trash2}
            label="Limpiar todo el flujo"
            onClick={() => {
              setShowClearConfirm(true);
            }}
            disabled={!hasNodes}
            color="var(--error)"
          />
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ background: 'var(--error-subtle)' }}
          >
            <span className="text-xs flex-1" style={{ color: 'var(--error)' }}>
              Borrar todo?
            </span>
            <button
              onClick={() => {
                onClearFlow();
                setShowClearConfirm(false);
              }}
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ background: 'var(--error)', color: 'white' }}
            >
              Si
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
            >
              No
            </button>
          </div>
        )}
      </ToolbarDropdown>

      {/* Export dropdown */}
      <ToolbarDropdown
        label="Exportar"
        icon={Download}
        badge={validationWarningCount}
        badgeColor="var(--warning)"
      >
        <DropdownItem
          icon={Shield}
          label={`Validar flujo${validationWarningCount > 0 ? ` (${validationWarningCount})` : ''}`}
          onClick={onToggleValidation}
          disabled={!hasNodes}
          color={validationWarningCount > 0 ? 'var(--warning)' : undefined}
        />
        <DropdownDivider />
        <DropdownItem
          icon={FileText}
          label="Copiar como ASCII"
          onClick={onExportAscii}
          disabled={!hasNodes}
        />
        <DropdownItem
          icon={FileInput}
          label="Insertar en prompt (ASCII)"
          onClick={onInsertInPrompt}
          disabled={!hasNodes}
        />
        <DropdownDivider />
        <DropdownItem
          icon={hasSourceOrigin ? RefreshCcw : Type}
          label={hasSourceOrigin ? 'Reinsertar como texto' : 'Insertar como texto'}
          onClick={() => onReinsertFlowInPrompt('structured')}
          disabled={!hasNodes}
          color="var(--accent-primary)"
        />
        <DropdownItem
          icon={hasSourceOrigin ? RefreshCcw : Code}
          label={hasSourceOrigin ? 'Reinsertar como Mermaid' : 'Insertar como Mermaid'}
          onClick={() => onReinsertFlowInPrompt('mermaid')}
          disabled={!hasNodes}
          color="var(--accent-primary)"
        />
      </ToolbarDropdown>

      {/* Generate dropdown */}
      <ToolbarDropdown label="Generar" icon={Wand2}>
        <DropdownItem
          icon={LayoutTemplate}
          label="Usar plantilla"
          onClick={onOpenTemplates}
        />
        <DropdownItem
          icon={Wand2}
          label="Generar secciones de prompt"
          onClick={onGeneratePromptSections}
          disabled={!hasNodes}
          color="#a855f7"
        />
        <DropdownDivider />
        <DropdownItem
          icon={Sparkles}
          label="Generar flujo con IA"
          onClick={onGenerateFromNL}
          color="var(--accent-primary)"
        />
      </ToolbarDropdown>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Create initial flow (prominent when no nodes) */}
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
