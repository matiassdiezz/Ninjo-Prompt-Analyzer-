'use client';

import { Inconsistency } from '@/types/analysis';
import { AlertTriangle } from 'lucide-react';

interface InconsistencyAlertProps {
  inconsistency: Inconsistency;
}

export function InconsistencyAlert({ inconsistency }: InconsistencyAlertProps) {
  return (
    <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-orange-900 mb-1">Inconsistency Detected</h3>
          <p className="text-sm text-orange-800 mb-2">{inconsistency.description}</p>
          <div className="bg-white border border-orange-200 rounded p-3">
            <p className="text-xs font-medium text-gray-700 mb-1">Suggestion:</p>
            <p className="text-sm text-gray-900">{inconsistency.suggestion}</p>
          </div>
          {inconsistency.locations.length > 0 && (
            <p className="text-xs text-orange-700 mt-2">
              Found at positions: {inconsistency.locations.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
