'use client';

interface TooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

export function Tooltip({ content, position = 'top', children }: TooltipProps) {
  return (
    <div className="tooltip" data-tooltip={content} data-tooltip-pos={position}>
      {children}
    </div>
  );
}
