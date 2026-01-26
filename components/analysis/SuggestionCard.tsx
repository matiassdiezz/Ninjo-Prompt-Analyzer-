'use client';

import { useState } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { AnalysisSection, CATEGORY_INFO } from '@/types/analysis';
import { DiffViewer } from './DiffViewer';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  X,
  Edit,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
} from 'lucide-react';

interface SuggestionCardProps {
  section: AnalysisSection;
}

const severityConfig = {
  critical: {
    icon: AlertOctagon,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    label: 'Crítico',
  },
  high: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Alto',
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Medio',
  },
  low: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Bajo',
  },
};

const categoryColors: Record<string, string> = {
  mission: 'bg-blue-100 text-blue-700',
  persona: 'bg-purple-100 text-purple-700',
  flow: 'bg-green-100 text-green-700',
  guardrails: 'bg-red-100 text-red-700',
  engagement: 'bg-yellow-100 text-yellow-700',
  examples: 'bg-indigo-100 text-indigo-700',
  efficiency: 'bg-gray-100 text-gray-700',
  hallucination: 'bg-orange-100 text-orange-700',
};

export function SuggestionCard({ section }: SuggestionCardProps) {
  const { applySuggestion, rejectSuggestion, suggestionStates } = useAnalysisStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(section.suggestedRewrite);

  const config = severityConfig[section.severity];
  const Icon = config.icon;
  const state = suggestionStates[section.id];
  const categoryInfo = CATEGORY_INFO[section.category];

  const handleAccept = () => {
    applySuggestion(section.id, section.suggestedRewrite);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleSaveEdit = () => {
    applySuggestion(section.id, editedText);
    setIsEditing(false);
  };

  const handleReject = () => {
    rejectSuggestion(section.id);
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        state?.status === 'accepted'
          ? 'border-green-300 bg-green-50'
          : state?.status === 'rejected'
          ? 'border-gray-300 bg-gray-50 opacity-60'
          : config.borderColor
      }`}
    >
      {/* Header */}
      <div
        className={`p-3 cursor-pointer ${state?.status === 'accepted' ? 'bg-green-50' : config.bgColor}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-2">
          <Icon className={`h-4 w-4 ${config.color} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                {config.label}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${categoryColors[section.category]}`}>
                {categoryInfo?.label || section.category}
              </span>
              {state?.status === 'accepted' && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                  Aplicado
                </span>
              )}
              {state?.status === 'rejected' && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                  Rechazado
                </span>
              )}
            </div>

            {/* Issues */}
            <ul className="space-y-0.5 mb-2">
              {section.issues.map((issue, idx) => (
                <li key={idx} className="text-xs text-gray-700 flex items-start gap-1.5">
                  <span className="text-gray-400">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>

            {/* Impact */}
            {section.impact && (
              <p className="text-xs text-gray-500 italic">
                <strong>Impacto:</strong> {section.impact}
              </p>
            )}
          </div>

          <button className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-3 border-t border-gray-200 bg-white space-y-3">
          {/* Explanation */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Explicación</p>
            <p className="text-sm text-gray-700">{section.explanation}</p>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-500">
                Editar sugerencia:
              </label>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full h-32 p-2 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                >
                  <Check className="h-3 w-3" />
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedText(section.suggestedRewrite);
                  }}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <DiffViewer oldValue={section.originalText} newValue={section.suggestedRewrite} />

              {!state && (
                <div className="flex gap-2">
                  <button
                    onClick={handleAccept}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    Aplicar
                  </button>
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="h-3 w-3" />
                    Editar
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Ignorar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
