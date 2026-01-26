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
        light: {
          diffViewerBackground: '#fff',
          diffViewerColor: '#24292e',
          addedBackground: '#e6ffed',
          addedColor: '#24292e',
          removedBackground: '#ffeef0',
          removedColor: '#24292e',
          wordAddedBackground: '#acf2bd',
          wordRemovedBackground: '#fdb8c0',
          addedGutterBackground: '#cdffd8',
          removedGutterBackground: '#ffdce0',
          gutterBackground: '#f6f8fa',
          gutterBackgroundDark: '#f3f4f6',
          highlightBackground: '#fffbdd',
          highlightGutterBackground: '#fff5b1',
        },
      },
      line: {
        padding: '10px 2px',
        fontSize: '13px',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      },
    }),
    []
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        splitView={splitView}
        useDarkTheme={false}
        styles={styles}
        leftTitle="Original"
        rightTitle="Suggested"
        showDiffOnly={false}
      />
    </div>
  );
}
