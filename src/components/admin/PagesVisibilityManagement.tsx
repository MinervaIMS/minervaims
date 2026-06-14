import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { usePermissions } from '@/hooks/usePermissions';
import { HIDEABLE_PAGES } from '@/lib/hideable-pages';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';

const PagesVisibilityManagement = () => {
  const { map, loading, isHidden, getRow, setHidden } = usePageVisibility();
  const { isFullAccess } = usePermissions();
  const { user } = useAuth();
  const { toast } = useToast();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  if (!isFullAccess) {
    return (
      <div className="py-16 text-center">
        <h2 className="font-serif text-heading text-accent mb-3">Pages Visibility</h2>
        <p className="font-body text-muted-foreground">
          You do not have access to manage page visibility.
        </p>
      </div>
    );
  }

  const handleToggle = async (pageKey: string, label: string, next: boolean) => {
    setUpdatingKey(pageKey);
    try {
      await setHidden(pageKey, next);

      // Activity log (best-effort)
      try {
        await supabase.from('activity_logs').insert({
          user_id: user?.id ?? null,
          user_email: user?.email ?? null,
          action_type: 'update',
          entity_type: 'page_visibility',
          entity_id: pageKey,
          entity_name: label,
          details: { is_hidden: next, page_key: pageKey },
        });
      } catch (e) {
        // non-fatal
        console.warn('activity log failed', e);
      }

      toast({
        title: next ? 'Page hidden' : 'Page visible',
        description: `${label} is now ${next ? 'hidden from the public' : 'publicly visible'}.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update visibility.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingKey(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div>
      <div className="mb-6 pb-3 border-b border-separator">
        <h2 className="font-serif text-heading text-accent">Pages Visibility</h2>
      </div>

      <p className="font-body text-muted-foreground mb-8 max-w-3xl">
        Hide or show individual pages of the public website. When a page is hidden, its header
        section remains visible, while the rest of its content is blurred and replaced by a notice
        informing visitors that the page is being updated. The homepage and the core legal pages
        (Privacy, Cookies, Terms, Disclaimer, Sitemap) cannot be hidden.
      </p>

      {loading && !map ? (
        <div className="flex items-center gap-2 text-muted-foreground font-body py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-body text-sm">
            <thead>
              <tr className="text-left border-b border-separator">
                <th className="py-3 pr-4 font-serif font-normal uppercase tracking-wider text-xs">Page</th>
                <th className="py-3 pr-4 font-serif font-normal uppercase tracking-wider text-xs">Route</th>
                <th className="py-3 pr-4 font-serif font-normal uppercase tracking-wider text-xs">Status</th>
                <th className="py-3 pr-4 font-serif font-normal uppercase tracking-wider text-xs">Last updated</th>
                <th className="py-3 pr-4 font-serif font-normal uppercase tracking-wider text-xs text-right">Visible</th>
              </tr>
            </thead>
            <tbody>
              {HIDEABLE_PAGES.map((p) => {
                const hidden = isHidden(p.key);
                const row = getRow(p.key);
                const isUpdating = updatingKey === p.key;
                return (
                  <tr key={p.key} className="border-b border-separator/60">
                    <td className="py-4 pr-4 font-serif text-base">{p.label}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{p.path}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={
                          hidden
                            ? 'inline-block px-2 py-0.5 text-xs uppercase tracking-wider bg-accent text-background'
                            : 'inline-block px-2 py-0.5 text-xs uppercase tracking-wider border border-foreground/30 text-foreground'
                        }
                      >
                        {hidden ? 'Hidden' : 'Visible'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {formatDate(row?.updated_at)}
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <div className="inline-flex items-center gap-3">
                        {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        <Switch
                          checked={!hidden}
                          disabled={isUpdating}
                          onCheckedChange={(checked) => handleToggle(p.key, p.label, !checked)}
                          aria-label={`Toggle visibility for ${p.label}`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PagesVisibilityManagement;
