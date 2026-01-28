'use client';

import { useState, useMemo } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import type { KnowledgeEntry } from '@/types/prompt';
import {
  Brain,
  Search,
  Filter,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Clock,
  Tag,
  X,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Download,
  Copy,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';

interface NinjoMemoryProps {
  onClose: () => void;
}

type FilterType = 'all' | 'pattern' | 'anti_pattern';
type SortType = 'recent' | 'usage' | 'effectiveness';
type EffectivenessFilter = 'all' | 'high' | 'medium' | 'low';

export function NinjoMemory({ onClose }: NinjoMemoryProps) {
  const { entries, deleteEntry, searchEntries, exportKnowledgeBase } = useKnowledgeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [effectivenessFilter, setEffectivenessFilter] = useState<EffectivenessFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter entries from chat (those with 'from-chat' tag)
  const chatEntries = useMemo(() => {
    return entries.filter((e) => e.tags.includes('from-chat'));
  }, [entries]);

  // Apply filters and search
  const filteredEntries = useMemo(() => {
    let result = searchQuery ? searchEntries(searchQuery) : chatEntries;

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter((e) => e.type === filterType);
    }

    // Filter by effectiveness
    if (effectivenessFilter !== 'all') {
      result = result.filter((e) => e.effectiveness === effectivenessFilter);
    }

    // Only show entries from chat
    result = result.filter((e) => e.tags.includes('from-chat'));

    // Sort
    switch (sortBy) {
      case 'recent':
        result = [...result].sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'usage':
        result = [...result].sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'effectiveness':
        const effectivenessOrder = { high: 3, medium: 2, low: 1 };
        result = [...result].sort(
          (a, b) => effectivenessOrder[b.effectiveness] - effectivenessOrder[a.effectiveness]
        );
        break;
    }

    return result;
  }, [chatEntries, searchQuery, filterType, sortBy, effectivenessFilter, searchEntries]);

  // Statistics
  const stats = useMemo(() => {
    const patterns = chatEntries.filter((e) => e.type === 'pattern').length;
    const antiPatterns = chatEntries.filter((e) => e.type === 'anti_pattern').length;
    const highPriority = chatEntries.filter((e) => e.effectiveness === 'high').length;
    const recurrentTags = chatEntries.filter((e) => e.tags.includes('recurrente')).length;

    // Get unique tags (excluding system tags)
    const systemTags = ['from-chat', 'self-serve', 'único', 'ocasional', 'recurrente'];
    const allTags = chatEntries.flatMap((e) => e.tags.filter((t) => !systemTags.includes(t)));
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { patterns, antiPatterns, highPriority, recurrentTags, topTags, total: chatEntries.length };
  }, [chatEntries]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg btn-ghost transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Memoria Ninjo
              </h2>
              <span
                className="px-2 py-0.5 text-xs rounded-full"
                style={{
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--border-accent)',
                }}
              >
                {stats.total} aprendizajes
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportKnowledgeBase()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm btn-ghost transition-all duration-200"
              title="Exportar para Self-Serve"
            >
              <Download className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
              <span className="hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
                Exportar
              </span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar patrones..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-200`}
            style={{
              background: showFilters ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
              color: showFilters ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: `1px solid ${showFilters ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
              boxShadow: showFilters ? '0 0 0 2px var(--accent-primary)' : 'none',
            }}
          >
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div
            className="mt-3 p-3 rounded-lg animate-slideDown"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex flex-wrap gap-4">
              {/* Type Filter */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                  Tipo
                </label>
                <div className="flex gap-1">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'pattern', label: 'Patrones', icon: Lightbulb },
                    { value: 'anti_pattern', label: 'Anti', icon: AlertTriangle },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFilterType(option.value as FilterType)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-all"
                      style={{
                        background: filterType === option.value ? 'var(--accent-subtle)' : 'var(--bg-primary)',
                        color: filterType === option.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        border: `1px solid ${filterType === option.value ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                      }}
                    >
                      {option.icon && <option.icon className="h-3 w-3" />}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Effectiveness Filter */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                  Prioridad
                </label>
                <div className="flex gap-1">
                  {[
                    { value: 'all', label: 'Todas' },
                    { value: 'high', label: 'Alta' },
                    { value: 'medium', label: 'Media' },
                    { value: 'low', label: 'Baja' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setEffectivenessFilter(option.value as EffectivenessFilter)}
                      className="px-2 py-1 text-xs rounded transition-all"
                      style={{
                        background: effectivenessFilter === option.value ? 'var(--accent-subtle)' : 'var(--bg-primary)',
                        color: effectivenessFilter === option.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        border: `1px solid ${effectivenessFilter === option.value ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                  Ordenar por
                </label>
                <div className="flex gap-1">
                  {[
                    { value: 'recent', label: 'Reciente', icon: Clock },
                    { value: 'usage', label: 'Uso', icon: TrendingUp },
                    { value: 'effectiveness', label: 'Prioridad', icon: BarChart3 },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as SortType)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-all"
                      style={{
                        background: sortBy === option.value ? 'var(--accent-subtle)' : 'var(--bg-primary)',
                        color: sortBy === option.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        border: `1px solid ${sortBy === option.value ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                      }}
                    >
                      <option.icon className="h-3 w-3" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div
        className="flex-shrink-0 px-6 py-3 flex items-center gap-4 border-b overflow-x-auto"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" style={{ color: 'var(--success)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {stats.patterns} patrones
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--error)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {stats.antiPatterns} anti-patrones
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {stats.highPriority} alta prioridad
          </span>
        </div>
        {stats.topTags.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Tag className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <div className="flex gap-1">
              {stats.topTags.slice(0, 3).map(([tag, count]) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-tertiary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  #{tag} ({count})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            >
              <Brain className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {searchQuery || filterType !== 'all' || effectivenessFilter !== 'all'
                ? 'No se encontraron resultados'
                : 'La memoria está vacía'}
            </h3>
            <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
              {searchQuery || filterType !== 'all' || effectivenessFilter !== 'all'
                ? 'Intenta con otros filtros o términos de búsqueda'
                : 'Los aprendizajes del chat de Ninjo QA aparecerán aquí cuando los guardes'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredEntries.map((entry) => {
              const isExpanded = expandedId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="rounded-xl overflow-hidden transition-all duration-200"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${isExpanded ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {/* Entry Header */}
                  <div
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div className="flex items-start gap-3">
                      {entry.type === 'pattern' ? (
                        <div
                          className="p-1.5 rounded-lg flex-shrink-0"
                          style={{ background: 'var(--success-subtle)' }}
                        >
                          <Lightbulb className="h-4 w-4" style={{ color: 'var(--success)' }} />
                        </div>
                      ) : (
                        <div
                          className="p-1.5 rounded-lg flex-shrink-0"
                          style={{ background: 'var(--error-subtle)' }}
                        >
                          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--error)' }} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {entry.title}
                          </h3>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background:
                                entry.effectiveness === 'high'
                                  ? 'var(--error-subtle)'
                                  : entry.effectiveness === 'medium'
                                  ? 'var(--warning-subtle)'
                                  : 'var(--bg-elevated)',
                              color:
                                entry.effectiveness === 'high'
                                  ? 'var(--error)'
                                  : entry.effectiveness === 'medium'
                                  ? 'var(--warning)'
                                  : 'var(--text-tertiary)',
                            }}
                          >
                            {entry.effectiveness === 'high' ? 'Alta' : entry.effectiveness === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                        <p className="text-xs line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                          {entry.description}
                        </p>
                        {entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.tags
                              .filter((t) => !['from-chat', 'self-serve'].includes(t))
                              .slice(0, 4)
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                  style={{
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  #{tag}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(entry.createdAt)}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        ) : (
                          <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-2 border-t animate-slideDown"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="space-y-3">
                        {/* Full Description */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                            Sugerencia para Self-Serve
                          </label>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {entry.description}
                          </p>
                        </div>

                        {/* Example if exists */}
                        {entry.example && (
                          <div>
                            <label className="text-[10px] uppercase tracking-wider font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                              Ejemplo
                            </label>
                            <div className="relative">
                              <pre
                                className="text-xs p-3 rounded-lg overflow-x-auto"
                                style={{
                                  background: 'var(--bg-tertiary)',
                                  color: 'var(--text-primary)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {entry.example}
                              </pre>
                              <button
                                onClick={() => handleCopy(entry.example!)}
                                className="absolute top-2 right-2 p-1.5 rounded-lg transition-all"
                                style={{
                                  background: 'var(--bg-elevated)',
                                  border: '1px solid var(--border-subtle)',
                                }}
                              >
                                <Copy className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Feedback Type */}
                        {entry.feedbackType && (
                          <div>
                            <label className="text-[10px] uppercase tracking-wider font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                              Tipo de mejora
                            </label>
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              {entry.feedbackType}
                            </p>
                          </div>
                        )}

                        {/* All Tags */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                            Tags
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{
                                  background:
                                    tag === 'from-chat' || tag === 'self-serve'
                                      ? 'var(--accent-subtle)'
                                      : 'var(--bg-tertiary)',
                                  color:
                                    tag === 'from-chat' || tag === 'self-serve'
                                      ? 'var(--accent-primary)'
                                      : 'var(--text-muted)',
                                  border: `1px solid ${
                                    tag === 'from-chat' || tag === 'self-serve'
                                      ? 'var(--border-accent)'
                                      : 'var(--border-subtle)'
                                  }`,
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-[10px] pt-2" style={{ color: 'var(--text-muted)' }}>
                          <span>Creado: {formatDate(entry.createdAt)}</span>
                          <span>{entry.usageCount} usos</span>
                          {entry.projectIds.length > 0 && (
                            <span>{entry.projectIds.length} proyectos</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                          <button
                            onClick={() => handleCopy(`${entry.title}\n\n${entry.description}`)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-all"
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <Copy className="h-3 w-3" />
                            Copiar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('¿Eliminar este aprendizaje?')) {
                                deleteEntry(entry.id);
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-all"
                            style={{
                              background: 'var(--error-subtle)',
                              color: 'var(--error)',
                              border: '1px solid rgba(248, 81, 73, 0.2)',
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
