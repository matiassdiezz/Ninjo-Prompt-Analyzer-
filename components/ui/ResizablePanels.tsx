'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ResizablePanelsProps {
  children: [React.ReactNode, React.ReactNode];
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  storageKey?: string;
  gap?: number;
}

export function ResizablePanels({
  children,
  defaultRatio = 0.55,
  minRatio = 0.3,
  maxRatio = 0.8,
  storageKey = 'ninjo-resizable-ratio',
  gap = 16,
}: ResizablePanelsProps) {
  const [ratio, setRatio] = useState(defaultRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef(ratio);
  ratioRef.current = ratio;

  // Load persisted ratio on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= minRatio && parsed <= maxRatio) {
          setRatio(parsed);
        }
      }
    } catch {}
  }, [storageKey, minRatio, maxRatio]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setRatio(defaultRatio);
    try {
      localStorage.setItem(storageKey, String(defaultRatio));
    } catch {}
  }, [defaultRatio, storageKey]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newRatio = (e.clientX - rect.left) / rect.width;
      const clamped = Math.min(maxRatio, Math.max(minRatio, newRatio));
      setRatio(clamped);
      ratioRef.current = clamped;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      try {
        localStorage.setItem(storageKey, String(ratioRef.current));
      } catch {}
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minRatio, maxRatio, storageKey]);

  // Show hint pulse on first use
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        setShowHint(true);
        const timer = setTimeout(() => setShowHint(false), 3000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [storageKey]);

  const active = isDragging || isHovering || showHint;

  const barColor = isDragging
    ? 'var(--accent-primary)'
    : (isHovering || showHint)
      ? 'color-mix(in srgb, var(--accent-primary) 50%, transparent)'
      : 'var(--border-subtle)';

  const dotColor = active ? 'var(--accent-primary)' : 'var(--text-muted)';

  return (
    <div
      ref={containerRef}
      className="h-full flex"
      style={{ gap: `${gap}px` }}
    >
      {/* Left panel */}
      <div style={{ width: `${ratio * 100}%`, minWidth: 0 }}>
        {children[0]}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: '12px',
          margin: `0 -${(12 - 2) / 2}px`,
          cursor: 'col-resize',
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: active ? '4px' : '2px',
            height: '100%',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            transition: 'background 150ms, width 150ms',
            background: barColor,
          }}
        >
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: '3px',
                height: '3px',
                borderRadius: '50%',
                background: dotColor,
                transition: 'background 150ms',
              }}
            />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children[1]}
      </div>
    </div>
  );
}
