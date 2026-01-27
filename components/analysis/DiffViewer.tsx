'use client';

import { useMemo } from 'react';
// @ts-ignore - react-diff-viewer-continued doesn't have proper types
import ReactDiffViewer from 'react-diff-viewer-continued';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  splitView?: boolean;
}

export function DiffViewer({ oldValue, newValue, splitView = true }: DiffViewerProps) {
  const styles = useMemo(
    () => ({
      variables: {
        dark: {
          diffViewerBackground: '#0d1117',
          diffViewerColor: '#e6edf3',
          addedBackground: 'rgba(63, 185, 80, 0.15)',
          addedColor: '#e6edf3',
          removedBackground: 'rgba(248, 81, 73, 0.15)',
          removedColor: '#e6edf3',
          wordAddedBackground: 'rgba(63, 185, 80, 0.4)',
          wordRemovedBackground: 'rgba(248, 81, 73, 0.4)',
          addedGutterBackground: 'rgba(63, 185, 80, 0.2)',
          removedGutterBackground: 'rgba(248, 81, 73, 0.2)',
          gutterBackground: '#161b22',
          gutterBackgroundDark: '#0d1117',
          highlightBackground: 'rgba(0, 212, 170, 0.1)',
          highlightGutterBackground: 'rgba(0, 212, 170, 0.15)',
          codeFoldGutterBackground: '#161b22',
          codeFoldBackground: '#161b22',
          emptyLineBackground: '#0d1117',
          codeFoldContentColor: '#8b949e',
        },
      },
      line: {
        padding: '8px 4px',
        fontSize: '12px',
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
      },
      contentText: {
        color: '#e6edf3',
      },
      gutter: {
        minWidth: '30px',
        padding: '0 8px',
      },
      titleBlock: {
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        padding: '8px 12px',
        color: '#8b949e',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      },
    }),
    []
  );

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        splitView={splitView}
        useDarkTheme={true}
        styles={styles}
        leftTitle="Original"
        rightTitle="Sugerido"
        showDiffOnly={false}
      />
    </div>
  );
}
