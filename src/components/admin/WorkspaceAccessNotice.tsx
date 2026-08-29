import { Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// =====================================================================
// What a reader sees when a workspace URL is not theirs to open.
// ---------------------------------------------------------------------
// Now that every section and subsection has an address, a link to one can
// be pasted into a message, forwarded, or bookmarked by somebody whose
// role does not include it. That is not an error and it should not read
// like one: the person following the link did nothing wrong, and the page
// they were sent to genuinely exists.
//
// So the notice says exactly that, names the part of the workspace in
// question, and offers the way back. It replaces only the CONTENT of the
// pane - the navigation rail, the search and the account controls stay
// where they are, because the rest of the workspace is still theirs.
//
// THIS IS NOT WHAT ENFORCES THE PERMISSION. Access is decided by the
// matrix, applied to the navigation, and enforced again by row-level
// security in the database. This component is what the reader is told
// once that decision has been made, and it renders no content of its own
// beyond the label it is given.
// =====================================================================

export function WorkspaceAccessNotice({
  /** 'forbidden' when it exists but not for this role, 'unknown' when it does not exist. */
  kind,
  /** The section, or "Section / Subsection", named as the navigation names it. */
  label,
  onBack,
}: {
  kind: 'forbidden' | 'unknown';
  label?: string;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-[60%] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-xl border border-separator bg-background p-8 text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent/[0.07] text-accent"
        >
          <Lock className="h-5 w-5" />
        </div>

        <h2 className="font-serif text-xl leading-tight text-accent">
          {kind === 'forbidden'
            ? 'This part of the workspace is not available for your role'
            : 'This part of the workspace does not exist'}
        </h2>

        {kind === 'forbidden' && label && (
          <p className="font-body mt-3 text-sm text-muted-foreground">
            You followed a link to <span className="text-foreground">{label}</span>.
          </p>
        )}

        <p className="font-body mt-3 text-sm leading-relaxed text-foreground/85">
          {kind === 'forbidden'
            ? 'Access to each section of the workspace follows the role you hold in the association. If you believe you should be able to open this one, ask the President or the Admin to review your role.'
            : 'The address may have been mistyped, or it may point to a part of the workspace that has since been renamed.'}
        </p>

        <Button onClick={onBack} className="font-body mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to your workspace
        </Button>
      </div>
    </div>
  );
}

export default WorkspaceAccessNotice;
