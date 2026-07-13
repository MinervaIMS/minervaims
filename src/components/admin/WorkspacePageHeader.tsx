import { ReactNode } from 'react';

interface WorkspacePageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Shared header for every page rendered inside the Minerva Workspace content
 * slot. One composed row: title and description on the left, the page's
 * primary actions aligned top-right, and a hairline rule underneath so every
 * subsection opens with the same tidy structure.
 */
export function WorkspacePageHeader({ title, description, actions }: WorkspacePageHeaderProps) {
  return (
    <div className="mb-8 pb-5 border-b border-separator">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-serif text-heading text-accent">{title}</h1>
          {description && (
            <p className="font-body text-body text-muted-foreground mt-2 max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 flex-wrap shrink-0 lg:pt-1.5 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspacePageHeader;
