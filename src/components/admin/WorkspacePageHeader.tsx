import { ReactNode } from 'react';

interface WorkspacePageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Shared header for every page rendered inside the Minerva Workspace content slot.
 * Layout: title → description → optional actions row (right-aligned, beneath description).
 * No bottom rule; spacing alone separates the header from the page content.
 */
export function WorkspacePageHeader({ title, description, actions }: WorkspacePageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="font-serif text-heading text-accent">{title}</h1>
      {description && (
        <p className="font-body text-body text-muted-foreground mt-3 max-w-3xl">
          {description}
        </p>
      )}
      {actions && (
        <div className="mt-6 flex items-center justify-end gap-3 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

export default WorkspacePageHeader;
