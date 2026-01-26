'use client';

import { useAnalysisStore } from '@/store/analysisStore';
import { History, RotateCcw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function VersionHistory() {
  const { promptHistory, restoreVersion, currentPrompt } = useAnalysisStore();

  if (promptHistory.length === 0) {
    return null;
  }

  // Sort by timestamp descending (newest first)
  const sortedHistory = [...promptHistory].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <History className="h-4 w-4" />
        Version History ({promptHistory.length})
      </h3>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {sortedHistory.map((version) => {
          const isCurrentVersion = version.content === currentPrompt;

          return (
            <div
              key={version.id}
              className={`p-3 rounded-lg border transition-all ${
                isCurrentVersion
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {version.label || 'Untitled Version'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(version.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2 font-mono">
                    {version.content.substring(0, 100)}
                    {version.content.length > 100 ? '...' : ''}
                  </p>
                </div>

                {!isCurrentVersion && (
                  <button
                    onClick={() => restoreVersion(version.id)}
                    className="flex-shrink-0 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Restore this version"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}

                {isCurrentVersion && (
                  <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    Current
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
