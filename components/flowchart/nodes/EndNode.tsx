'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ReactFlowNodeData } from '@/types/flow';
import { Square } from 'lucide-react';

interface EndNodeProps {
  data: ReactFlowNodeData;
  selected?: boolean;
}

function EndNodeComponent({ data, selected }: EndNodeProps) {
  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all"
      style={{
        background: 'var(--error-subtle)',
        border: `2px solid ${selected ? 'var(--error)' : 'rgba(248, 81, 73, 0.4)'}`,
        boxShadow: selected ? '0 0 12px rgba(248, 81, 73, 0.3)' : 'none',
        minWidth: 100,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: 'var(--error)',
          width: 10,
          height: 10,
          border: '2px solid var(--bg-primary)',
        }}
      />
      <Square className="h-4 w-4" style={{ color: 'var(--error)' }} />
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--error)' }}
      >
        {data.label}
      </span>
    </div>
  );
}

export const EndNode = memo(EndNodeComponent);
