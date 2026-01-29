'use client';

import { useMemo } from 'react';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  splitView?: boolean;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  let oldIdx = 0;
  let newIdx = 0;

  // Simple line-by-line diff
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldIdx < oldLines.length ? oldLines[oldIdx] : null;
    const newLine = newIdx < newLines.length ? newLines[newIdx] : null;

    if (oldLine === newLine && oldLine !== null) {
      // Lines are the same
      result.push({
        type: 'unchanged',
        content: oldLine,
        oldLineNum: oldIdx + 1,
        newLineNum: newIdx + 1,
      });
      oldIdx++;
      newIdx++;
    } else if (oldLine !== null && !newLines.includes(oldLine)) {
      // Line was removed
      result.push({
        type: 'removed',
        content: oldLine,
        oldLineNum: oldIdx + 1,
      });
      oldIdx++;
    } else if (newLine !== null && !oldLines.includes(newLine)) {
      // Line was added
      result.push({
        type: 'added',
        content: newLine,
        newLineNum: newIdx + 1,
      });
      newIdx++;
    } else {
      // Handle remaining lines
      if (oldLine !== null) {
        result.push({
          type: 'removed',
          content: oldLine,
          oldLineNum: oldIdx + 1,
        });
        oldIdx++;
      }
      if (newLine !== null) {
        result.push({
          type: 'added',
          content: newLine,
          newLineNum: newIdx + 1,
        });
        newIdx++;
      }
    }
  }

  return result;
}

export function DiffViewer({ oldValue, newValue, splitView = false }: DiffViewerProps) {
  const diff = useMemo(() => computeDiff(oldValue, newValue), [oldValue, newValue]);

  if (splitView) {
    // Split view: side by side
    const oldLines = oldValue.split('\n');
    const newLines = newValue.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);

    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        {/* Headers */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            className="flex-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            Original
          </div>
          <div
            className="flex-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
              borderLeft: '1px solid var(--border-subtle)',
            }}
          >
            Sugerido
          </div>
        </div>

        {/* Content */}
        <div className="flex" style={{ background: 'var(--bg-primary)' }}>
          {/* Old side */}
          <div className="flex-1 font-mono text-xs overflow-x-auto">
            {oldLines.map((line, idx) => (
              <div
                key={`old-${idx}`}
                className="flex"
                style={{
                  background: !newLines.includes(line) ? 'var(--error-subtle)' : 'transparent',
                }}
              >
                <span
                  className="w-8 flex-shrink-0 text-right px-2 select-none"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
                >
                  {idx + 1}
                </span>
                <span className="px-2 py-0.5 whitespace-pre" style={{ color: 'var(--text-primary)' }}>
                  {line || ' '}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />

          {/* New side */}
          <div className="flex-1 font-mono text-xs overflow-x-auto">
            {newLines.map((line, idx) => (
              <div
                key={`new-${idx}`}
                className="flex"
                style={{
                  background: !oldLines.includes(line) ? 'var(--success-subtle)' : 'transparent',
                }}
              >
                <span
                  className="w-8 flex-shrink-0 text-right px-2 select-none"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
                >
                  {idx + 1}
                </span>
                <span className="px-2 py-0.5 whitespace-pre" style={{ color: 'var(--text-primary)' }}>
                  {line || ' '}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Unified view
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        Cambios
      </div>

      {/* Content */}
      <div className="font-mono text-xs" style={{ background: 'var(--bg-primary)' }}>
        {diff.map((line, idx) => (
          <div
            key={idx}
            className="flex"
            style={{
              background:
                line.type === 'added'
                  ? 'var(--success-subtle)'
                  : line.type === 'removed'
                    ? 'var(--error-subtle)'
                    : 'transparent',
            }}
          >
            <span
              className="w-8 flex-shrink-0 text-right px-2 select-none"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
            >
              {line.type === 'removed' ? line.oldLineNum : line.type === 'added' ? '' : line.oldLineNum}
            </span>
            <span
              className="w-8 flex-shrink-0 text-right px-2 select-none"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
            >
              {line.type === 'added' ? line.newLineNum : line.type === 'removed' ? '' : line.newLineNum}
            </span>
            <span
              className="w-6 flex-shrink-0 text-center select-none"
              style={{
                color:
                  line.type === 'added'
                    ? 'var(--success)'
                    : line.type === 'removed'
                      ? 'var(--error)'
                      : 'var(--text-muted)',
              }}
            >
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            <span className="px-2 py-0.5 whitespace-pre" style={{ color: 'var(--text-primary)' }}>
              {line.content || ' '}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
