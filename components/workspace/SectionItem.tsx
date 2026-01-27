'use client';

import { Code, Heading, Tag, FileText, List, AlertCircle, CheckCircle, Terminal } from 'lucide-react';
import type { SemanticSection, SectionType } from '@/lib/semanticParser';
import type { SeverityLevel } from '@/types/analysis';

interface SectionItemProps {
  section: SemanticSection;
  isSelected: boolean;
  onClick: () => void;
}

function getSectionIcon(type: SectionType) {
  const iconStyle = { flexShrink: 0 };

  switch (type) {
    case 'xml_tag':
      return <Code className="h-3.5 w-3.5" style={{ ...iconStyle, color: 'var(--info)' }} />;
    case 'markdown_header':
      return <Heading className="h-3.5 w-3.5" style={{ ...iconStyle, color: '#a855f7' }} />;
    case 'colon_header':
      return <Tag className="h-3.5 w-3.5" style={{ ...iconStyle, color: 'var(--success)' }} />;
    case 'paragraph':
      return <FileText className="h-3.5 w-3.5" style={{ ...iconStyle, color: 'var(--text-muted)' }} />;
    case 'list':
      return <List className="h-3.5 w-3.5" style={{ ...iconStyle, color: '#6366f1' }} />;
    case 'code_block':
      return <Terminal className="h-3.5 w-3.5" style={{ ...iconStyle, color: 'var(--warning)' }} />;
    default:
      return <FileText className="h-3.5 w-3.5" style={{ ...iconStyle, color: 'var(--text-muted)' }} />;
  }
}

function SeverityBadge({ severity, count }: { severity?: SeverityLevel; count: number }) {
  if (count === 0) {
    return (
      <span className="flex items-center gap-1">
        <CheckCircle className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />
      </span>
    );
  }

  const getSeverityStyles = (sev: SeverityLevel | undefined) => {
    switch (sev) {
      case 'critical':
        return { bg: 'var(--error-subtle)', text: 'var(--error)', border: 'rgba(248, 81, 73, 0.2)' };
      case 'high':
        return { bg: 'rgba(255, 140, 66, 0.1)', text: '#ff8c42', border: 'rgba(255, 140, 66, 0.2)' };
      case 'medium':
        return { bg: 'var(--warning-subtle)', text: 'var(--warning)', border: 'rgba(240, 180, 41, 0.2)' };
      default:
        return { bg: 'var(--info-subtle)', text: 'var(--info)', border: 'rgba(88, 166, 255, 0.2)' };
    }
  };

  const styles = getSeverityStyles(severity);

  return (
    <span
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{
        background: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`
      }}
    >
      <AlertCircle className="h-3 w-3" />
      {count}
    </span>
  );
}

export function SectionItem({ section, isSelected, onClick }: SectionItemProps) {
  const displayTitle = section.type === 'xml_tag' && section.tagName
    ? `<${section.tagName}>`
    : section.title;

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-200"
      style={{
        background: isSelected ? 'var(--accent-subtle)' : 'transparent',
        border: isSelected ? '1px solid var(--border-accent)' : '1px solid transparent',
        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)'
      }}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">
          {getSectionIcon(section.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className="truncate font-medium"
              style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}
            >
              {displayTitle}
            </span>
            <SeverityBadge
              severity={section.highestSeverity}
              count={section.suggestionCount}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              L{section.startLine}
              {section.endLine !== section.startLine && `-${section.endLine}`}
            </span>
            {section.inferredPurpose !== 'unknown' && (
              <>
                <span style={{ color: 'var(--border-default)' }}>·</span>
                <span className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>
                  {section.inferredPurpose.replace('_', ' ')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

interface SectionsSidebarProps {
  sections: SemanticSection[];
  selectedSectionId: string | null;
  onSectionClick: (section: SemanticSection) => void;
  isOpen: boolean;
}

export function SectionsSidebar({
  sections,
  selectedSectionId,
  onSectionClick,
  isOpen,
}: SectionsSidebarProps) {
  if (!isOpen) return null;

  const totalSuggestions = sections.reduce((acc, s) => acc + s.suggestionCount, 0);

  return (
    <div
      className="w-56 border-r overflow-y-auto flex-shrink-0"
      style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Secciones
          </h3>
          {totalSuggestions > 0 && (
            <span className="badge badge-warning">
              {totalSuggestions} sugerencias
            </span>
          )}
        </div>

        {sections.length === 0 ? (
          <p
            className="text-xs italic py-4 text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            Pega tu prompt para detectar secciones
          </p>
        ) : (
          <nav className="space-y-1">
            {sections.map((section) => (
              <SectionItem
                key={section.id}
                section={section}
                isSelected={selectedSectionId === section.id}
                onClick={() => onSectionClick(section)}
              />
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
