'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check, Zap, Brain, CheckCheck } from 'lucide-react';
import { useState, useMemo } from 'react';
import { parseChanges, hasStructuredChanges } from '@/lib/utils/changeParser';
import type { ParsedChange } from '@/lib/utils/changeParser';
import { ChangeCard, type ChangeStatus } from './ChangeCard';

// Known sections in the Master Prompt
const KNOWN_SECTIONS = [
  'Identidad y Contexto',
  'Style and Tone',
  'Conversation Logic',
  'Happy Path',
  'Knowledge Base',
  'Hard Rules',
  'Calificación',
  'Calificacion',
  'Objeciones',
  'Precios',
  'Keywords',
  'Tone',
  'VSL',
  'Oferta',
];

// Pattern to match section references
const SECTION_PATTERN = new RegExp(
  `(?:sección|seccion|en|dentro de|en la|en el)?\\s*['"]?(${KNOWN_SECTIONS.join('|')})['"]?`,
  'gi'
);

interface CodeBlockProps {
  children: string;
  className?: string;
  onApply?: (code: string) => void;
  onSaveToMemory?: (code: string) => void;
}

function CodeBlock({ children, className, onApply, onSaveToMemory }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') || '';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApply) {
      onApply(code);
    }
  };

  const handleSaveToMemory = () => {
    if (onSaveToMemory) {
      onSaveToMemory(code);
    }
  };

  return (
    <div className="relative group my-3">
      <div
        className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {onSaveToMemory && (
          <button
            onClick={handleSaveToMemory}
            className="px-2 py-1 rounded-md text-xs flex items-center gap-1 transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--accent-primary)',
              border: '1px solid var(--border-accent)',
            }}
            title="Guardar en memoria"
          >
            <Brain className="h-3 w-3" />
            Guardar
          </button>
        )}
        {onApply && (
          <button
            onClick={handleApply}
            className="px-2 py-1 rounded-md text-xs flex items-center gap-1 transition-colors"
            style={{
              background: 'var(--accent-primary)',
              color: '#0a0e14',
            }}
            title="Aplicar cambio"
          >
            <Zap className="h-3 w-3" />
            Aplicar
          </button>
        )}
        <button
          onClick={handleCopy}
          className="px-2 py-1 rounded-md text-xs flex items-center gap-1 transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copiar
            </>
          )}
        </button>
      </div>
      {language && (
        <div
          className="px-3 py-1 text-[10px] font-mono rounded-t-lg"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {language}
        </div>
      )}
      <pre
        className={`overflow-x-auto p-3 ${language ? 'rounded-t-none' : ''} rounded-lg`}
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <code className={className} style={{ color: 'var(--text-primary)' }}>
          {children}
        </code>
      </pre>
    </div>
  );
}

interface MarkdownMessageProps {
  content: string;
  onApplyCode?: (code: string) => void;
  onSaveToMemory?: (code: string) => void;
  onNavigateToSection?: (section: string) => void;
  onApplyChange?: (change: ParsedChange) => void;
  onRejectChange?: (change: ParsedChange) => void;
  onSaveLearning?: (change: ParsedChange) => void;
  onApplyAllChanges?: (changes: ParsedChange[]) => void;
}

// Component to render text with section links
function TextWithSectionLinks({ 
  text, 
  onNavigateToSection 
}: { 
  text: string; 
  onNavigateToSection?: (section: string) => void;
}) {
  if (!onNavigateToSection) {
    return <>{text}</>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(SECTION_PATTERN.source, 'gi');

  while ((match = regex.exec(text)) !== null) {
    const beforeText = text.slice(lastIndex, match.index);
    if (beforeText) {
      parts.push(beforeText);
    }

    const sectionName = match[1];
    parts.push(
      <button
        key={`${match.index}-${sectionName}`}
        onClick={() => onNavigateToSection(sectionName)}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium transition-colors hover:underline"
        style={{
          background: 'var(--accent-subtle)',
          color: 'var(--accent-primary)',
          border: '1px solid var(--border-accent)',
        }}
        title={`Ir a sección: ${sectionName}`}
      >
        {sectionName}
      </button>
    );

    lastIndex = regex.lastIndex;
  }

  const remainingText = text.slice(lastIndex);
  if (remainingText) {
    parts.push(remainingText);
  }

  return <>{parts}</>;
}

export function MarkdownMessage({
  content,
  onApplyCode,
  onSaveToMemory,
  onNavigateToSection,
  onApplyChange,
  onRejectChange,
  onSaveLearning,
  onApplyAllChanges,
}: MarkdownMessageProps) {
  const [changeStatuses, setChangeStatuses] = useState<Map<string, ChangeStatus>>(new Map());

  // Parse structured changes if present
  const parseResult = useMemo(() => {
    if (!hasStructuredChanges(content)) return null;
    return parseChanges(content);
  }, [content]);

  const handleApply = (change: ParsedChange) => {
    setChangeStatuses(prev => new Map(prev).set(change.id, 'applied'));
    onApplyChange?.(change);
  };

  const handleReject = (change: ParsedChange) => {
    setChangeStatuses(prev => new Map(prev).set(change.id, 'rejected'));
    onRejectChange?.(change);
  };

  const handleSaveLearning = (change: ParsedChange) => {
    onSaveLearning?.(change);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markdownComponents: any = {
    code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
      if (!className) {
        return (
          <code
            className="px-1.5 py-0.5 rounded text-xs font-mono"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--accent-primary)',
              border: '1px solid var(--border-subtle)',
            }}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <CodeBlock
          className={className}
          onApply={onApplyCode}
          onSaveToMemory={onSaveToMemory}
        >
          {String(children)}
        </CodeBlock>
      );
    },
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1
        className="text-lg font-bold mt-4 mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2
        className="text-base font-bold mt-3 mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3
        className="text-sm font-semibold mt-3 mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        {children}
      </h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => {
      if (typeof children === 'string') {
        return (
          <p className="mb-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <TextWithSectionLinks text={children} onNavigateToSection={onNavigateToSection} />
          </p>
        );
      }
      return (
        <p className="mb-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {children}
        </p>
      );
    },
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside mb-2 space-y-1" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside mb-2 space-y-1" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => {
      if (typeof children === 'string') {
        return (
          <li className="text-sm ml-2">
            <TextWithSectionLinks text={children} onNavigateToSection={onNavigateToSection} />
          </li>
        );
      }
      return <li className="text-sm ml-2">{children}</li>;
    },
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote
        className="border-l-4 pl-3 py-1 my-2 italic"
        style={{
          borderColor: 'var(--accent-primary)',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
        }}
      >
        {children}
      </blockquote>
    ),
    a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
        style={{ color: 'var(--accent-primary)' }}
      >
        {children}
      </a>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>
        {children}
      </strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em style={{ color: 'var(--text-secondary)' }}>{children}</em>
    ),
    hr: () => (
      <hr className="my-3" style={{ borderColor: 'var(--border-subtle)' }} />
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-3">
        <table
          className="min-w-full text-sm"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead style={{ background: 'var(--bg-tertiary)' }}>{children}</thead>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th
        className="px-3 py-2 text-left font-semibold"
        style={{
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {children}
      </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td
        className="px-3 py-2"
        style={{
          color: 'var(--text-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {children}
      </td>
    ),
  };

  // If we have structured changes, render them as cards
  if (parseResult && parseResult.changes.length > 0) {
    // Count actionable pending changes (exclude 'keep')
    const pendingChanges = parseResult.changes.filter(
      (c) => c.action !== 'keep' && changeStatuses.get(c.id) !== 'applied' && changeStatuses.get(c.id) !== 'rejected'
    );

    const handleApplyAll = () => {
      if (!onApplyAllChanges || pendingChanges.length === 0) return;
      onApplyAllChanges(pendingChanges);
      // Mark all as applied
      setChangeStatuses((prev) => {
        const next = new Map(prev);
        pendingChanges.forEach((c) => next.set(c.id, 'applied'));
        return next;
      });
    };

    return (
      <div className="markdown-message space-y-3">
        {/* Render remaining content (intro, context) as markdown */}
        {parseResult.remainingContent.trim() && (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {parseResult.remainingContent}
          </ReactMarkdown>
        )}

        {/* Apply All bar */}
        {pendingChanges.length >= 2 && onApplyAllChanges && (
          <div
            className="flex items-center justify-between px-3 py-2 rounded-lg"
            style={{
              background: 'var(--accent-subtle)',
              border: '1px solid var(--border-accent)',
            }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {pendingChanges.length} cambios pendientes
            </span>
            <button
              onClick={handleApplyAll}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors"
              style={{
                background: 'var(--accent-primary)',
                color: '#0a0e14',
              }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Aplicar todos
            </button>
          </div>
        )}

        {/* Render change cards */}
        <div className="space-y-2">
          {parseResult.changes.map((change) => (
            <ChangeCard
              key={change.id}
              change={change}
              status={changeStatuses.get(change.id) || 'pending'}
              onApply={handleApply}
              onReject={handleReject}
              onSaveLearning={handleSaveLearning}
              onNavigateToSection={onNavigateToSection || (() => {})}
            />
          ))}
        </div>
      </div>
    );
  }

  // Default: render everything as markdown
  return (
    <div className="markdown-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
