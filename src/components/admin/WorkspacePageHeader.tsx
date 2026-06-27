import { ReactNode } from 'react';

interface WorkspacePageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Shared header for every page rendered inside the Minerva Workspace content slot.
 * Renders: title (serif heading, accent) + optional description paragraph,
 * separated from the page content by a bottom border. Optional right-aligned
 * actions slot for buttons (Add, Download CSV, etc.).
 */
export function WorkspacePageHeader({ title, description, actions }: WorkspacePageHeaderProps) {
  return (
    <div className="mb-8 pb-4 border-b border-separator">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="font-serif text-heading text-accent">{title}</h1>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
      {description && (
        <p className="font-body text-body text-muted-foreground mt-3 max-w-3xl">
          {description}
        </p>
      )}
    </div>
  );
}

export default WorkspacePageHeader;
