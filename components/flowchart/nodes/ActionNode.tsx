'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ReactFlowNodeData } from '@/types/flow';
import { MessageSquare } from 'lucide-react';

interface ActionNodeProps {
  data: ReactFlowNodeData;
  selected?: boolean;
}

function ActionNodeComponent({ data, selected }: ActionNodeProps) {
  return (
    <div
      className="rounded-xl transition-all"
      style={{
        background: 'var(--bg-elevated)',
        border: `2px solid ${selected ? 'var(--accent-primary)' : 'var(--border-default)'}`,
        boxShadow: selected ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
        minWidth: 180,
        maxWidth: 280,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: 'var(--accent-primary)',
          width: 10,
          height: 10,
          border: '2px solid var(--bg-primary)',
        }}
      />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <span
            className="text-sm font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {data.label}
          </span>
        </div>
        {data.description && (
          <p
            className="text-xs line-clamp-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {data.description}
          </p>
        )}
        {data.keywords && data.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {data.keywords.slice(0, 3).map((keyword, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--accent-primary)',
                }}
              >
                {keyword}
              </span>
            ))}
            {data.keywords.length > 3 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                }}
              >
                +{data.keywords.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: 'var(--accent-primary)',
          width: 10,
          height: 10,
          border: '2px solid var(--bg-primary)',
        }}
      />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
