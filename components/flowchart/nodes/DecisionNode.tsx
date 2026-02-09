'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ReactFlowNodeData } from '@/types/flow';
import { HelpCircle } from 'lucide-react';

interface DecisionNodeProps {
  data: ReactFlowNodeData;
  selected?: boolean;
}

function DecisionNodeComponent({ data, selected }: DecisionNodeProps) {
  const size = 120;

  return (
    <div
      className="relative flex items-center justify-center transition-all"
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Diamond = square rotated 45deg */}
      <div
        className="absolute"
        style={{
          width: size * 0.72,
          height: size * 0.72,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(45deg)',
          background: 'var(--warning-subtle)',
          border: `2px solid ${selected ? 'var(--warning)' : 'rgba(240, 180, 41, 0.4)'}`,
          boxShadow: selected ? '0 0 12px rgba(240, 180, 41, 0.3)' : 'none',
          borderRadius: 6,
        }}
      />

      {/* Content (not rotated) */}
      <div className="relative z-10 flex flex-col items-center gap-0.5" style={{ maxWidth: size * 0.52 }}>
        <HelpCircle className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--warning)' }} />
        <span
          className="text-[10px] font-medium text-center leading-tight"
          style={{ color: 'var(--warning)' }}
        >
          {data.label}
        </span>
      </div>

      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: 'var(--warning)',
          width: 10,
          height: 10,
          border: '2px solid var(--bg-primary)',
        }}
      />

      {/* Yes output handle (bottom) - happy path flows down */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{
          background: 'var(--success)',
          width: 10,
          height: 10,
          border: '2px solid var(--bg-primary)',
        }}
      />

      {/* No output handle (right) - alternative branch */}
      <Handle
        type="source"
        position={Position.Right}
        id="no"
        style={{
          background: 'var(--error)',
          width: 10,
          height: 10,
          border: '2px solid var(--bg-primary)',
          top: '50%',
        }}
      />

      {/* Labels for handles */}
      <span
        className="absolute text-[10px] font-medium"
        style={{
          color: 'var(--success)',
          bottom: -16,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        Si
      </span>
      <span
        className="absolute text-[10px] font-medium"
        style={{
          color: 'var(--error)',
          right: -18,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        No
      </span>
    </div>
  );
}

export const DecisionNode = memo(DecisionNodeComponent);
