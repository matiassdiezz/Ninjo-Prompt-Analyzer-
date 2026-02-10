'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, Pencil, Copy, ChevronLeft, ChevronRight } from 'lucide-react';

interface FlowTab {
  id: string;
  name: string;
}

interface FlowTabBarProps {
  flows: FlowTab[];
  activeFlowId: string | null;
  onSelectFlow: (flowId: string) => void;
  onAddFlow: () => void;
  onRenameFlow: (flowId: string, newName: string) => void;
  onDeleteFlow: (flowId: string) => void;
  onDuplicateFlow: (flowId: string) => void;
}

export function FlowTabBar({
  flows,
  activeFlowId,
  onSelectFlow,
  onAddFlow,
  onRenameFlow,
  onDeleteFlow,
  onDuplicateFlow,
}: FlowTabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ flowId: string; x: number; y: number } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll state
  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      const observer = new ResizeObserver(checkScroll);
      observer.observe(el);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        observer.disconnect();
      };
    }
  }, [checkScroll, flows.length]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  // Focus input when editing
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleStartRename = (flowId: string, currentName: string) => {
    setEditingId(flowId);
    setEditValue(currentName);
    setContextMenu(null);
  };

  const handleFinishRename = () => {
    if (editingId && editValue.trim()) {
      onRenameFlow(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, flowId: string) => {
    e.preventDefault();
    setContextMenu({ flowId, x: e.clientX, y: e.clientY });
  };

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollBy({ left: dir === 'left' ? -150 : 150, behavior: 'smooth' });
    }
  };

  if (flows.length === 0) return null;

  return (
    <div
      className="flex items-center border-b relative"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
        minHeight: 36,
      }}
    >
      {/* Scroll left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy('left')}
          className="shrink-0 px-1 h-full flex items-center transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Tabs scroll area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center overflow-x-auto min-w-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {flows.map((flow) => {
          const isActive = flow.id === activeFlowId;
          const isEditing = flow.id === editingId;

          return (
            <div
              key={flow.id}
              onClick={() => !isEditing && onSelectFlow(flow.id)}
              onContextMenu={(e) => handleContextMenu(e, flow.id)}
              onDoubleClick={() => handleStartRename(flow.id, flow.name)}
              className="group relative flex items-center gap-1.5 px-3 py-1.5 cursor-pointer shrink-0 transition-colors"
              style={{
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                background: isActive ? 'var(--accent-glow)' : 'transparent',
              }}
            >
              {isEditing ? (
                <input
                  ref={editInputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="text-xs font-medium bg-transparent outline-none border-b"
                  style={{
                    color: 'var(--text-primary)',
                    borderColor: 'var(--accent-primary)',
                    width: Math.max(60, editValue.length * 7),
                  }}
                />
              ) : (
                <span className="text-xs font-medium truncate max-w-[120px]">
                  {flow.name}
                </span>
              )}

              {/* Close button on hover (only if more than 1 flow) */}
              {!isEditing && flows.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFlow(flow.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                  style={{ color: 'var(--text-muted)' }}
                  title="Eliminar flujo"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scrollBy('right')}
          className="shrink-0 px-1 h-full flex items-center transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Add flow button */}
      <button
        onClick={onAddFlow}
        className="shrink-0 mx-1 p-1 rounded transition-all"
        style={{
          color: 'var(--text-muted)',
          background: 'transparent',
        }}
        title="Crear nuevo flujo"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 rounded-lg overflow-hidden animate-slideDown"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: 160,
          }}
        >
          <div className="py-1">
            <button
              onClick={() => {
                const flow = flows.find(f => f.id === contextMenu.flowId);
                if (flow) handleStartRename(flow.id, flow.name);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="font-medium">Renombrar</span>
            </button>
            <button
              onClick={() => {
                onDuplicateFlow(contextMenu.flowId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="font-medium">Duplicar</span>
            </button>
            {flows.length > 1 && (
              <button
                onClick={() => {
                  onDeleteFlow(contextMenu.flowId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                style={{ color: 'var(--error)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="h-3.5 w-3.5" />
                <span className="font-medium">Eliminar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
