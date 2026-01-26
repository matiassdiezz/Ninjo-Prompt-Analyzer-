'use client';

import { useState } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import type { KnowledgeEntry } from '@/types/prompt';
import {
  BookOpen,
  Plus,
  Search,
  Lightbulb,
  AlertTriangle,
  Tag,
  TrendingUp,
  X,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
} from 'lucide-react';

export function KnowledgeBase() {
  const { entries, addEntry, updateEntry, deleteEntry, searchEntries } = useKnowledgeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'patterns' | 'anti_patterns'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'pattern' as 'pattern' | 'anti_pattern',
    title: '',
    description: '',
    example: '',
    tags: '',
    feedbackType: '',
    effectiveness: 'medium' as 'high' | 'medium' | 'low',
  });

  const filteredEntries = searchQuery
    ? searchEntries(searchQuery)
    : activeTab === 'all'
    ? entries
    : entries.filter((e) => e.type === (activeTab === 'patterns' ? 'pattern' : 'anti_pattern'));

  const resetForm = () => {
    setFormData({
      type: 'pattern',
      title: '',
      description: '',
      example: '',
      tags: '',
      feedbackType: '',
      effectiveness: 'medium',
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description) return;

    const tags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);

    if (editingId) {
      updateEntry(editingId, {
        ...formData,
        tags,
      });
      setEditingId(null);
    } else {
      addEntry({
        ...formData,
        tags,
      });
    }

    resetForm();
    setShowAddForm(false);
  };

  const handleEdit = (entry: KnowledgeEntry) => {
    setFormData({
      type: entry.type,
      title: entry.title,
      description: entry.description,
      example: entry.example || '',
      tags: entry.tags.join(', '),
      feedbackType: entry.feedbackType || '',
      effectiveness: entry.effectiveness,
    });
    setEditingId(entry.id);
    setShowAddForm(true);
  };

  const handleCopyExample = (example: string) => {
    navigator.clipboard.writeText(example);
  };

  const patternsCount = entries.filter((e) => e.type === 'pattern').length;
  const antiPatternsCount = entries.filter((e) => e.type === 'anti_pattern').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Base de Conocimiento</h3>
          </div>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingId(null);
              resetForm();
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Agregar
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar patrones..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'all'
                ? 'bg-gray-200 text-gray-800'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Todos ({entries.length})
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'patterns'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Lightbulb className="h-3 w-3" />
            Patrones ({patternsCount})
          </button>
          <button
            onClick={() => setActiveTab('anti_patterns')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'anti_patterns'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Anti ({antiPatternsCount})
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-blue-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {editingId ? 'Editar entrada' : 'Nueva entrada'}
          </h4>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setFormData({ ...formData, type: 'pattern' })}
                className={`flex-1 py-1.5 text-xs rounded flex items-center justify-center gap-1 ${
                  formData.type === 'pattern'
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-300'
                }`}
              >
                <Lightbulb className="h-3 w-3" />
                Patrón
              </button>
              <button
                onClick={() => setFormData({ ...formData, type: 'anti_pattern' })}
                className={`flex-1 py-1.5 text-xs rounded flex items-center justify-center gap-1 ${
                  formData.type === 'anti_pattern'
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-300'
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                Anti-patrón
              </button>
            </div>

            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Título (ej: Greeting efectivo)"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />

            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del patrón..."
              className="w-full h-16 px-2 py-1.5 text-sm border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500"
            />

            <textarea
              value={formData.example}
              onChange={(e) => setFormData({ ...formData, example: e.target.value })}
              placeholder="Ejemplo de código/texto (opcional)"
              className="w-full h-16 px-2 py-1.5 text-sm border border-gray-300 rounded resize-none font-mono focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Tags separados por coma (ej: greeting, tono, objeciones)"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              value={formData.feedbackType}
              onChange={(e) => setFormData({ ...formData, feedbackType: e.target.value })}
              placeholder="Tipo de feedback que resuelve (opcional)"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex gap-2">
              <select
                value={formData.effectiveness}
                onChange={(e) => setFormData({ ...formData, effectiveness: e.target.value as any })}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">Alta efectividad</option>
                <option value="medium">Media efectividad</option>
                <option value="low">Baja efectividad</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!formData.title || !formData.description}
                className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? 'Guardar cambios' : 'Agregar'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="px-4 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay entradas</p>
            <p className="text-xs text-gray-400 mt-1">
              Agrega patrones que funcionan o anti-patrones a evitar
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                className={`border-b border-gray-100 ${
                  entry.type === 'pattern' ? 'bg-white' : 'bg-red-50/30'
                }`}
              >
                <div
                  className="px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <div className="flex items-start gap-2">
                    {entry.type === 'pattern' ? (
                      <Lightbulb className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            entry.effectiveness === 'high'
                              ? 'bg-green-100 text-green-700'
                              : entry.effectiveness === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {entry.effectiveness === 'high'
                            ? 'Alta'
                            : entry.effectiveness === 'medium'
                            ? 'Media'
                            : 'Baja'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {entry.description}
                      </p>
                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {entry.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                          {entry.tags.length > 3 && (
                            <span className="text-[10px] text-gray-400">
                              +{entry.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">
                        {entry.usageCount} usos
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2">
                    {entry.example && (
                      <div className="relative">
                        <pre className="text-xs font-mono bg-gray-100 p-2 rounded whitespace-pre-wrap">
                          {entry.example}
                        </pre>
                        <button
                          onClick={() => handleCopyExample(entry.example!)}
                          className="absolute top-1 right-1 p-1 bg-white rounded shadow-sm hover:bg-gray-100"
                        >
                          <Copy className="h-3 w-3 text-gray-500" />
                        </button>
                      </div>
                    )}
                    {entry.feedbackType && (
                      <p className="text-xs text-gray-500">
                        <strong>Resuelve:</strong> {entry.feedbackType}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                      >
                        <Edit className="h-3 w-3" />
                        Editar
                      </button>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
