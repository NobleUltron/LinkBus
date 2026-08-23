import React from 'react';
interface PanelProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: 'section' | 'div' | 'article';
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = 'p-5',
  as: Tag = 'section'
}: PanelProps) {
  return <Tag className={`card-surface overflow-hidden ${className}`}>
      {(title || action) && <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-[0.9375rem] font-semibold leading-6 text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[0.8125rem] leading-5 text-muted">{subtitle}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>}
      <div className={bodyClassName}>{children}</div>
    </Tag>;
}