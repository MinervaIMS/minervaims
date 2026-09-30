// =====================================================================
// SOCIAL TEMPLATE: Instagram, LinkedIn and Other Resources, one page.
// ---------------------------------------------------------------------
// The material the Media team posts from lives in three libraries that
// are used together: the Instagram and LinkedIn posts with their
// captions, and the other resources (press material, photography,
// mentions) that feed both. They are the three tabs of one page. The
// Design System, which says how everything should look rather than
// holding what is posted, keeps a subsection of its own.
//
// EACH TAB KEEPS ITS OWN PERMISSION. The tabs a reader sees are the ones
// the access matrix lets them open, and what they may change on each is
// decided by that tab's own row. The workspace applies the read-only
// treatment to the open tab, not to the page.
//
// The tab is in the address (`?tab=linkedin`), so it can be linked to and
// the back button returns to it; the old addresses of the three pages
// open the matching tab.
// =====================================================================

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { FolderOpen, Instagram, Linkedin } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import ResourceManager from '@/components/admin/ResourceManager';
import { useAccess } from '@/hooks/useAccess';
import { prefetchLibrary, useCachedCount } from '@/components/admin/library/library-data';

const TAB_META: Record<string, { icon: typeof Instagram; category: string; blurb: string }> = {
  instagram: {
    icon: Instagram,
    category: 'smm_instagram',
    blurb: 'Posts, stories and reels: the pictures and the captions that go with them. Open an item to copy its caption, check its length and download its pictures.',
  },
  linkedin: {
    icon: Linkedin,
    category: 'smm_linkedin',
    blurb: 'LinkedIn posts and carousels, with their texts ready to paste. LinkedIn reaches alumni, partners and recruiters: keep to the Society’s professional register.',
  },
  'other-resources': {
    icon: FolderOpen,
    category: 'smm_other',
    blurb: 'Everything else the posts draw on: press material, photography, mentions of the Society, anything without a library of its own.',
  },
};

function TabCount({ category }: { category: string }) {
  const n = useCachedCount(category);
  if (n === null) return null;
  return <span className="tabular-nums text-xs opacity-80">{n}</span>;
}

export default function SocialTemplate({ tabs, activeTab, onTab }: {
  /** The tabs this reader may open, in order. */
  tabs: { tab: string; resource: string; label: string }[];
  activeTab: string | null;
  onTab: (tab: string) => void;
}) {
  const access = useAccess();
  const listRef = useRef<HTMLDivElement>(null);

  // Read the other libraries once, quietly, so their tabs show a count and
  // open at once.
  useEffect(() => {
    for (const t of tabs) {
      const category = TAB_META[t.tab]?.category;
      if (category) prefetchLibrary(category);
    }
  }, [tabs]);

  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.tab === activeTab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onTab(tabs[next].tab);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${tabs[next].tab}"]`)?.focus());
  };

  const current = tabs.find((t) => t.tab === activeTab) ?? null;

  return (
    <div>
      <WorkspacePageHeader
        title="Social Template"
        description="The material the Society posts from, in one place: Instagram and LinkedIn posts with their captions, and the other resources they draw on."
      />

      {tabs.length > 1 && (
        <div ref={listRef} role="tablist" aria-label="Social Template" onKeyDown={onKey}
          className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-separator px-1">
          {tabs.map((t) => {
            const meta = TAB_META[t.tab];
            const Icon = meta?.icon ?? FolderOpen;
            const selected = t.tab === activeTab;
            return (
              <button
                key={t.tab} type="button" role="tab" data-tab={t.tab} data-ro
                id={`social-tab-${t.tab}`} aria-controls={`social-panel-${t.tab}`}
                aria-selected={selected} tabIndex={selected ? 0 : -1}
                onClick={() => onTab(t.tab)}
                className={`-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 font-body sm:px-4 text-[15px] transition-colors ${
                  selected ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-accent'
                }`}
              >
                <Icon aria-hidden className="h-4 w-4" />
                {t.label}
                {meta && <TabCount category={meta.category} />}
              </button>
            );
          })}
        </div>
      )}

      {current && (
        <div role="tabpanel" id={`social-panel-${current.tab}`} aria-labelledby={`social-tab-${current.tab}`}>
          <ResourceManager
            key={current.tab}
            embedded
            category={TAB_META[current.tab]?.category ?? ''}
            title={current.label}
            description={TAB_META[current.tab]?.blurb ?? ''}
            divisions={['none']}
            canManage={access.canManage(current.resource)}
            flavour={current.tab === 'linkedin' ? 'linkedin' : current.tab === 'instagram' ? 'instagram' : 'general'}
          />
        </div>
      )}
    </div>
  );
}
