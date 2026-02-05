'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import type { KnowledgeEntry, KnowledgeCategory } from '@/types/prompt';
import { detectDuplicatePatterns, type DuplicateMatch } from '@/lib/utils/duplicatePatternDetector';
import { KNOWLEDGE_CATEGORIES, inferCategoryFromTags } from '@/lib/utils/categories';
import type { ExtractedLearning } from '@/lib/utils/learningExtractor';
import {
  Upload,
  FileJson,
  FileText,
  Copy,
  Check,
  X,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Trash2,
  Save,
  AlertCircle,
} from 'lucide-react';

interface ImportKnowledgeProps {
  onClose: () => void;
}

type ImportTab = 'file' | 'text' | 'guide';

interface ParsedEntry {
  id: string;
  type: 'pattern' | 'anti_pattern';
  title: string;
  description: string;
  example?: string;
  tags: string[];
  effectiveness: 'high' | 'medium' | 'low';
  category?: KnowledgeCategory;
  selected: boolean;
}

const GPT_PROMPT = `Analiza TODO el contexto e historial de nuestras conversaciones y extrae los aprendizajes más valiosos.

## QUÉ BUSCAR:

1. **PATRONES** - Lo que funciona bien y debemos repetir
2. **ANTI-PATRONES** - Errores comunes y cómo evitarlos
3. **PREFERENCIAS** - Mi estilo, tono, formato preferido
4. **DECISIONES** - Elecciones técnicas/de diseño importantes

## FORMATO OBLIGATORIO:

Usa EXACTAMENTE este formato para cada entrada. Separa cada entrada con "---":

---
**Tipo**: PATRON
**Categoría**: tono
**Título**: Usar tono conversacional pero profesional
**Descripción**: Mantener un balance entre cercanía y profesionalismo. Evitar ser demasiado formal o demasiado casual.
**Efectividad**: ALTA
**Ejemplo**: "¡Hola! Me encanta que te interese esto. Te cuento más..."
**Tags**: comunicacion, estilo, mensajes
---

## CAMPOS REQUERIDOS:

- **Tipo**: PATRON | ANTI_PATRON
- **Categoría**: tono | saludo | keywords | calificacion | objeciones | flujo | conversion | formato | knowledge_base | general
- **Título**: Nombre corto y descriptivo (máx 60 caracteres)
- **Descripción**: Explicación clara de qué es, por qué importa, cuándo aplicarlo
- **Efectividad**: ALTA | MEDIA | BAJA
- **Ejemplo**: Texto o código concreto que ilustre el patrón
- **Tags**: 2-5 palabras clave separadas por coma

## CATEGORÍAS EXPLICADAS:

- **tono**: Personalidad, formalidad, estilo de comunicación
- **saludo**: Mensajes de bienvenida, primeras interacciones
- **keywords**: Palabras clave que disparan respuestas
- **calificacion**: Preguntas para calificar leads
- **objeciones**: Manejo de dudas, precios, resistencia
- **flujo**: Secuencia de conversación, pasos del journey
- **conversion**: Cierre, agendamiento, llamada a acción
- **formato**: Emojis, estructura de mensajes, longitud
- **knowledge_base**: Info del negocio, FAQs, links
- **general**: Otros patrones que no encajan arriba

## IMPORTANTE:

- Mínimo 5 entradas, máximo 20
- Cada entrada debe ser accionable y específica
- Prioriza patrones recurrentes sobre casos únicos
- Incluye tanto patrones como anti-patrones`;

export function ImportKnowledge({ onClose }: ImportKnowledgeProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>('file');
  const [textInput, setTextInput] = useState('');
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
  const [imported, setImported] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addEntry, importData, entries: existingEntries } = useKnowledgeStore();

  // Duplicate detection state
  const [duplicateMatches, setDuplicateMatches] = useState<Map<string, DuplicateMatch>>(new Map());

  // Convert ParsedEntry to ExtractedLearning format for duplicate detection
  const convertToExtractedLearning = useCallback((entry: ParsedEntry): ExtractedLearning => {
    return {
      pattern: entry.title,
      suggestion: entry.description,
      priority: entry.effectiveness === 'high' ? 'Alta' : entry.effectiveness === 'medium' ? 'Media' : 'Baja',
      frequency: 'Ocasional',
      category: entry.category || inferCategoryFromTags(entry.tags),
    };
  }, []);

  // Run duplicate detection when entries change
  const detectDuplicates = useCallback((entries: ParsedEntry[]) => {
    if (entries.length === 0 || existingEntries.length === 0) {
      setDuplicateMatches(new Map());
      return;
    }

    const converted = entries.map(convertToExtractedLearning);
    const matches = detectDuplicatePatterns(converted, existingEntries, 0.4);

    // Create a map of entry id -> duplicate match
    const matchMap = new Map<string, DuplicateMatch>();
    for (const match of matches) {
      // Find the entry that corresponds to this learning
      const entryIndex = entries.findIndex(e =>
        e.title === match.newLearning.pattern &&
        e.description === match.newLearning.suggestion
      );
      if (entryIndex >= 0) {
        matchMap.set(entries[entryIndex].id, match);
      }
    }

    setDuplicateMatches(matchMap);
  }, [existingEntries, convertToExtractedLearning]);

  // Count duplicates
  const duplicateCount = duplicateMatches.size;

  // Skip duplicates action
  const skipDuplicates = useCallback(() => {
    setParsedEntries(prev => prev.map(e =>
      duplicateMatches.has(e.id) ? { ...e, selected: false } : e
    ));
  }, [duplicateMatches]);

  const parseTextToEntries = useCallback((text: string): ParsedEntry[] => {
    const entries: ParsedEntry[] = [];
    // Split by --- delimiters first, then by double newlines, then by single newlines before Tipo
    // Support both markdown (**Tipo**:) and plain text (Tipo:) formats
    let blocks: string[];
    if (text.includes('---')) {
      blocks = text.split(/---+/).filter(b => b.trim() && b.match(/(?:\*\*)?Tipo(?:\*\*)?[:\s]/i));
    } else {
      // Try double newlines first
      blocks = text.split(/\n\n+(?=(?:\*\*)?Tipo(?:\*\*)?[:\s])/i).filter(b => b.trim());
      // If only one block and text has multiple "Tipo:", try single newline split
      if (blocks.length <= 1 && (text.match(/(?:\*\*)?Tipo(?:\*\*)?[:\s]/gi)?.length || 0) > 1) {
        blocks = text.split(/\n(?=(?:\*\*)?Tipo(?:\*\*)?[:\s])/i).filter(b => b.trim());
      }
      // If still no blocks but text contains Tipo:, treat whole text as one block
      if (blocks.length === 0 && text.match(/(?:\*\*)?Tipo(?:\*\*)?[:\s]/i)) {
        blocks = [text];
      }
    }

    let counter = 0;
    for (const block of blocks) {
      // Support both markdown (**Field**:) and plain text (Field:) formats
      const typeMatch = block.match(/(?:\*\*)?Tipo(?:\*\*)?[:\s]+(PATRON|ANTI[_\s]?PATRON|anti[-\s]pattern|pattern)/i);
      const titleMatch = block.match(/(?:\*\*)?T[ií]tulo(?:\*\*)?[:\s]+(.+)/i);
      const descMatch = block.match(/(?:\*\*)?Descripci[óo]n(?:\*\*)?[:\s]+([\s\S]+?)(?=(?:\*\*)?(?:Efectividad|Ejemplo|Tags?|Categor[ií]a)|$)/i);
      const exampleMatch = block.match(/(?:\*\*)?Ejemplo(?:\*\*)?[:\s]+([\s\S]+?)(?=(?:\*\*)?(?:Efectividad|Tags?|Categor[ií]a)|$)/i);
      const effectMatch = block.match(/(?:\*\*)?Efectividad(?:\*\*)?[:\s]+(ALTA|MEDIA|BAJA)/i);
      const tagsMatch = block.match(/(?:\*\*)?Tags?(?:\*\*)?[:\s]+(.+)/i);
      const categoryMatch = block.match(/(?:\*\*)?Categor[ií]a(?:\*\*)?[:\s]+(\w+)/i);

      if (titleMatch && descMatch) {
        const type = typeMatch?.[1].toLowerCase().includes('anti') ? 'anti_pattern' : 'pattern';
        const effectiveness = effectMatch?.[1]?.toUpperCase() === 'ALTA' ? 'high' : effectMatch?.[1]?.toUpperCase() === 'BAJA' ? 'low' : 'medium';
        const tags = tagsMatch?.[1].split(/[,;]/).map(t => t.trim().replace(/^#/, '')).filter(Boolean) || [];
        const extractedCategory = categoryMatch?.[1]?.toLowerCase() as KnowledgeCategory | undefined;
        const category = extractedCategory || inferCategoryFromTags(tags);

        entries.push({
          id: `parsed-${counter++}`,
          type,
          title: titleMatch[1].trim(),
          description: descMatch[1].trim(),
          example: exampleMatch?.[1].trim(),
          tags: [...tags, 'imported', 'from-gpt'],
          effectiveness,
          category,
          selected: true,
        });
      }
    }

    // Fallback: detect any line starting with ** as a title
    if (entries.length === 0) {
      const lines = text.split('\n').filter(l => l.trim());
      let currentEntry: Partial<ParsedEntry> | null = null;

      for (const line of lines) {
        if (line.startsWith('**') || line.startsWith('##') || line.match(/^\d+\./)) {
          if (currentEntry?.title) {
            const tags = ['imported', 'from-gpt'];
            entries.push({
              id: `parsed-${counter++}`,
              type: currentEntry.type || 'pattern',
              title: currentEntry.title,
              description: currentEntry.description || '',
              tags,
              effectiveness: currentEntry.effectiveness || 'medium',
              category: inferCategoryFromTags(tags),
              selected: true,
            });
          }
          currentEntry = {
            title: line.replace(/[*#\d.]/g, '').trim(),
            description: '',
            type: line.toLowerCase().includes('anti') || line.toLowerCase().includes('error') ? 'anti_pattern' : 'pattern',
            effectiveness: 'medium',
          };
        } else if (currentEntry) {
          currentEntry.description += (currentEntry.description ? '\n' : '') + line.trim();
        }
      }

      if (currentEntry?.title) {
        const tags = ['imported', 'from-gpt'];
        entries.push({
          id: `parsed-${counter++}`,
          type: currentEntry.type || 'pattern',
          title: currentEntry.title,
          description: currentEntry.description || '',
          tags,
          effectiveness: currentEntry.effectiveness || 'medium',
          category: inferCategoryFromTags(tags),
          selected: true,
        });
      }
    }

    return entries;
  }, []);

  const handleTextChange = (value: string) => {
    setTextInput(value);
    if (value.trim()) {
      const entries = parseTextToEntries(value);
      setParsedEntries(entries);
      detectDuplicates(entries);
    } else {
      setParsedEntries([]);
      setDuplicateMatches(new Map());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        // Check if it's a Ninjo export
        if (data.metadata?.app === 'ninjo-prompt-analyzer' && data.data?.knowledgeEntries) {
          const entries: ParsedEntry[] = data.data.knowledgeEntries.map((e: KnowledgeEntry, i: number) => ({
            ...e,
            id: `file-${i}`,
            selected: true,
            tags: [...e.tags, 'imported'],
            category: e.category || inferCategoryFromTags(e.tags),
          }));
          setParsedEntries(entries);
          detectDuplicates(entries);
        } else {
          // Try to parse as array of entries
          const entriesArray = Array.isArray(data) ? data : data.entries || data.knowledgeEntries || [];
          const entries: ParsedEntry[] = entriesArray.map((e: Partial<KnowledgeEntry>, i: number) => {
            const tags = [...(e.tags || []), 'imported'];
            return {
              id: `file-${i}`,
              type: e.type || 'pattern',
              title: e.title || 'Sin título',
              description: e.description || '',
              example: e.example,
              tags,
              effectiveness: e.effectiveness || 'medium',
              category: e.category || inferCategoryFromTags(tags),
              selected: true,
            };
          });
          setParsedEntries(entries);
          detectDuplicates(entries);
        }
      } catch {
        // Try as text
        handleTextChange(event.target?.result as string);
      }
    };
    reader.readAsText(file);
  };

  const toggleEntry = (id: string) => {
    setParsedEntries(prev => prev.map(e => 
      e.id === id ? { ...e, selected: !e.selected } : e
    ));
  };

  const deleteEntry = (id: string) => {
    setParsedEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleImport = () => {
    const selected = parsedEntries.filter(e => e.selected);

    for (const entry of selected) {
      const { id: _id, selected: _selected, ...entryData } = entry;
      addEntry(entryData as Omit<KnowledgeEntry, 'id' | 'createdAt' | 'usageCount' | 'projectIds'>);
    }

    setImported(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(GPT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedCount = parsedEntries.filter(e => e.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div 
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl flex flex-col animate-slideDown"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Importar Conocimientos
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg btn-ghost">
            <X className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          {[
            { id: 'file' as const, label: 'Archivo', icon: FileJson },
            { id: 'text' as const, label: 'Texto', icon: FileText },
            { id: 'guide' as const, label: 'Guía GPT', icon: Sparkles },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm transition-all"
              style={{
                background: activeTab === tab.id ? 'var(--accent-subtle)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              }}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{ 
                  borderColor: 'var(--border-default)',
                  background: 'var(--bg-tertiary)',
                }}
              >
                <Upload className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Haz clic para seleccionar un archivo
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  JSON de Ninjo o archivo de texto
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-4">
              <textarea
                value={textInput}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Pega aquí el texto de tu GPT..."
                className="w-full h-40 px-4 py-3 text-sm rounded-lg resize-none"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                El texto se analizará automáticamente para extraer patrones y anti-patrones.
              </p>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div 
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
              >
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  ¿Cómo obtener conocimientos de tu GPT?
                </h3>
                <ol className="text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>1</span>
                    <span>Copia el prompt de abajo</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>2</span>
                    <span>Abre tu GPT (ChatGPT, Claude, etc.) en una nueva conversación</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>3</span>
                    <span>Pega el prompt y envía el mensaje</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>4</span>
                    <span>Copia la respuesta y vuelve aquí (pestaña "Texto")</span>
                  </li>
                </ol>
              </div>

              <div className="relative">
                <pre
                  className="text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {GPT_PROMPT}
                </pre>
                <button
                  onClick={copyPrompt}
                  className="absolute top-2 right-2 p-2 rounded-lg transition-all"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                >
                  {copied ? (
                    <Check className="h-4 w-4" style={{ color: 'var(--success)' }} />
                  ) : (
                    <Copy className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          {parsedEntries.length > 0 && (
            <div className="mt-6 space-y-3">
              {/* Duplicate Warning Banner */}
              {duplicateCount > 0 && (
                <div
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" style={{ color: '#F59E0B' }} />
                    <span className="text-sm" style={{ color: '#F59E0B' }}>
                      {duplicateCount} {duplicateCount === 1 ? 'entrada similar' : 'entradas similares'} a existentes
                    </span>
                  </div>
                  <button
                    onClick={skipDuplicates}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#F59E0B',
                    }}
                  >
                    Omitir duplicados
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Preview ({selectedCount} seleccionados de {parsedEntries.length})
                </h3>
                <button
                  onClick={() => setParsedEntries(prev => prev.map(e => ({ ...e, selected: !e.selected })))}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: 'var(--accent-primary)', background: 'var(--accent-subtle)' }}
                >
                  {selectedCount === parsedEntries.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedEntries.map(entry => {
                  const isDuplicate = duplicateMatches.has(entry.id);
                  const duplicateMatch = duplicateMatches.get(entry.id);
                  const categoryInfo = entry.category ? KNOWLEDGE_CATEGORIES[entry.category] : null;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 rounded-lg transition-all"
                      style={{
                        background: isDuplicate ? 'rgba(245, 158, 11, 0.05)' : entry.selected ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        border: isDuplicate
                          ? '1px solid rgba(245, 158, 11, 0.4)'
                          : `1px solid ${entry.selected ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                        opacity: entry.selected ? 1 : 0.6,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={entry.selected}
                        onChange={() => toggleEntry(entry.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {entry.type === 'pattern' ? (
                            <Lightbulb className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--error)' }} />
                          )}
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {entry.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                            {entry.effectiveness === 'high' ? 'Alta' : entry.effectiveness === 'medium' ? 'Media' : 'Baja'}
                          </span>
                          {categoryInfo && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{
                                background: `${categoryInfo.color}20`,
                                color: categoryInfo.color,
                              }}
                            >
                              {categoryInfo.label}
                            </span>
                          )}
                        </div>
                        {isDuplicate && duplicateMatch && (
                          <div
                            className="text-[10px] px-2 py-1 rounded mb-1.5 inline-flex items-center gap-1"
                            style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#F59E0B',
                            }}
                          >
                            <AlertCircle className="h-3 w-3" />
                            Similar a: &quot;{duplicateMatch.existingLearning.title}&quot;
                          </div>
                        )}
                        <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {entry.description}
                        </p>
                        {entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {entry.tags.filter(t => t !== 'imported').map(tag => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                        style={{ color: 'var(--error)' }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {imported ? '¡Importado con éxito!' : `${selectedCount} entradas listas para importar`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg transition-all"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0 || imported}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all disabled:opacity-50"
              style={{ 
                color: 'white', 
                background: imported ? 'var(--success)' : 'var(--accent-primary)',
              }}
            >
              {imported ? (
                <>
                  <Check className="h-4 w-4" />
                  Importado
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Importar {selectedCount > 0 && `(${selectedCount})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
