'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ReactFlowNodeData } from '@/types/flow';
import { Square, ExternalLink } from 'lucide-react';

interface EndNodeProps {
  data: ReactFlowNodeData;
  selected?: boolean;
}

function EndNodeComponent({ data, selected }: EndNodeProps) {
  const isCrossFlow = !!data.crossFlowRef;

  // Purple styling for cross-flow end nodes, red for normal end nodes
  const borderColor = isCrossFlow
    ? (selected ? '#a855f7' : 'rgba(168, 85, 247, 0.5)')
    : (selected ? 'var(--error)' : 'rgba(248, 81, 73, 0.4)');
  const bgColor = isCrossFlow ? 'rgba(168, 85, 247, 0.1)' : 'var(--error-subtle)';
  const textColor = isCrossFlow ? '#a855f7' : 'var(--error)';
  const glowColor = isCrossFlow
    ? '0 0 12px rgba(168, 85, 247, 0.3)'
    : '0 0 12px rgba(248, 81, 73, 0.3)';

  return (
    <div
      className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-full transition-all"
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        boxShadow: selected ? glowColor : 'none',
        minWidth: 100,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: isCrossFlow ? '#a855f7' : 'var(--error)',
          width: 10,
          height: 10,
          border: '2px solid var(--bg-primary)',
        }}
      />
      <div className="flex items-center gap-2">
        {isCrossFlow ? (
          <ExternalLink className="h-4 w-4" style={{ color: textColor }} />
        ) : (
          <Square className="h-4 w-4" style={{ color: textColor }} />
        )}
        <span
          className="text-sm font-medium"
          style={{ color: textColor }}
        >
          {data.label}
        </span>
      </div>
      {isCrossFlow && data.crossFlowName && (
        <span
          className="text-[10px] opacity-80"
          style={{ color: textColor }}
        >
          → {data.crossFlowName}
        </span>
      )}
    </div>
  );
}

export const EndNode = memo(EndNodeComponent);
