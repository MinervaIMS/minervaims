import { Navigate, useSearchParams } from 'react-router-dom';
import { WORKSPACE_BASE, workspacePathForKeys } from '@/lib/workspace-nav';

/**
 * `/admin`, and anything under it, forwarded to the workspace's new home.
 *
 * The old deep-link form was a query string - `/admin?section=website&sub=
 * website-readings` - and links in that shape are in email that has already
 * been sent and in people's bookmarks. They are TRANSLATED to the equivalent
 * path rather than dropped, so a link written months ago still opens the page
 * it named. Anything else lands on the workspace, which then opens the first
 * section the reader's role has.
 *
 * It is its own lazily-loaded module for one reason: translating those keys
 * needs the whole navigation tree, and this route is reached by almost
 * nobody. Loading it here keeps the navigation out of the entry bundle that
 * every visitor to the public site downloads.
 *
 * The screen of reserved height is the same one the page loader uses, and
 * for the same reason: `<Navigate>` acts in an effect, so without it the
 * frame before that effect renders an empty page and the footer jumps.
 */
export default function LegacyWorkspaceRedirect() {
  const [params] = useSearchParams();
  const section = params.get('section');
  const sub = params.get('sub');
  const to = section || sub ? workspacePathForKeys(section, sub) : WORKSPACE_BASE;
  return (
    <>
      <div className="min-h-[100svh]" aria-hidden="true" />
      <Navigate to={to} replace />
    </>
  );
}
