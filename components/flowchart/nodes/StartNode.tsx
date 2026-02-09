'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ReactFlowNodeData } from '@/types/flow';
import { Play } from 'lucide-react';

interface StartNodeProps {
  data: ReactFlowNodeData;
  selected?: boolean;
}

function StartNodeComponent({ data, selected }: StartNodeProps) {
  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all"
      style={{
        background: 'var(--success-subtle)',
        border: `2px solid ${selected ? 'var(--success)' : 'rgba(63, 185, 80, 0.4)'}`,
        boxShadow: selected ? '0 0 12px rgba(63, 185, 80, 0.3)' : 'none',
        minWidth: 100,
      }}
    >
      <Play className="h-4 w-4" style={{ color: 'var(--success)' }} />
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--success)' }}
      >
        {data.label}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: 'var(--success)',
          width: 10,
          height: 10,
          border: '2px solid var(--bg-primary)',
        }}
      />
    </div>
  );
}

export const StartNode = memo(StartNodeComponent);
