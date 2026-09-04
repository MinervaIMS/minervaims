import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ResourceKey } from '@/lib/access/matrix';

// =====================================================================
// Searching what is IN the workspace, not only what it is made of.
// ---------------------------------------------------------------------
// The palette could find a page called "Alumni". It could not find an
// alumnus. Typing somebody's name returned nothing, because the index
// was built from the guide - the description of the workspace - and a
// description of a register does not contain the register's rows.
//
// This adds the rows. It is a second, slower pass that runs behind the
// instant one: the page results appear on the first keystroke exactly as
// they always have, and anything found inside the content arrives a
// moment later, underneath them. Nothing about the first look changes.
//
// ---------------------------------------------------------------------
// AUTHORISATION, WHICH IS THE WHOLE DIFFICULTY.
//
// A search box that reaches into content is a search box that can leak
// it. Three things stand in the way here, and it is worth being precise
// about what each one actually does, because they are not equivalent.
//
//  1. NO REQUEST IS MADE FOR A SOURCE THE ROLE CANNOT OPEN. Every source
//     below declares the subsection it belongs to, and the source list is
//     filtered by `canView` BEFORE any query is issued. A media analyst
//     does not receive the members register and filter it away; the
//     query is never sent. This is what stops the leak in the product.
//
//  2. ROW-LEVEL SECURITY IS THE ACTUAL BOUNDARY. Point 1 is client-side
//     and could be bypassed by somebody crafting their own request, so it
//     is not what makes the data safe: the policies on these tables are.
//     Every table read here is one the workspace already reads elsewhere
//     with the same client and the same policies, so this introduces no
//     new path to any data. It widens no permission; it only declines to
//     use ones the interface should not be using.
//
//  3. THE RESULT CARRIES ITS SUBSECTION. Choosing a row opens the page it
//     came from, and that page performs its own checks on arrival, as it
//     did before this existed.
//
// The consequence worth stating plainly: what a person can find here is
// exactly what they could already reach by opening the pages themselves.
// The search saves them the walk; it does not open a door.
// =====================================================================

export interface ContentHit {
  id: string;
  /** The row itself: a person's name, a report's title. */
  label: string;
  /** One line of context: a company, a date, a division. */
  detail: string;
  /** Where the row lives, shown as the group heading. */
  source: string;
  /** The subsection to open. */
  resource: ResourceKey;
}

interface Source {
  /** The subsection this content belongs to. Gates the whole source. */
  resource: ResourceKey;
  /** Heading shown above its results. */
  label: string;
  run: (q: string) => Promise<ContentHit[]>;
}

/** Rows per source, and overall. Enough to be useful, few enough to scan. */
const PER_SOURCE = 4;
const TOTAL = 8;

/** Escape a value going into a PostgREST `ilike` pattern. */
const like = (q: string) => `%${q.replace(/[%_,()]/g, ' ').trim()}%`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

function buildSources(): Source[] {
  return [
    {
      resource: 'people-members',
      label: 'Members',
      run: async (q) => {
        const { data } = await sb.from('members')
          .select('id, first_name, surname, email, division, role')
          .or(`first_name.ilike.${like(q)},surname.ilike.${like(q)},email.ilike.${like(q)}`)
          .limit(PER_SOURCE);
        return (data ?? []).map((m: Record<string, string>) => ({
          id: `member:${m.id}`,
          label: `${m.first_name ?? ''} ${m.surname ?? ''}`.trim(),
          detail: [m.role?.replace(/_/g, ' '), m.division !== 'none' ? m.division : null]
            .filter(Boolean).join(' · '),
          source: 'Members',
          resource: 'people-members' as ResourceKey,
        }));
      },
    },
    {
      resource: 'people-alumni',
      label: 'Alumni',
      run: async (q) => {
        const { data } = await sb.from('alumni')
          .select('id, name, surname, company, graduation_year')
          .or(`name.ilike.${like(q)},surname.ilike.${like(q)},company.ilike.${like(q)}`)
          .limit(PER_SOURCE);
        return (data ?? []).map((a: Record<string, string>) => ({
          id: `alumnus:${a.id}`,
          label: `${a.name ?? ''} ${a.surname ?? ''}`.trim(),
          detail: [a.company, a.graduation_year ? `Class of ${a.graduation_year}` : null]
            .filter(Boolean).join(' · '),
          source: 'Alumni',
          resource: 'people-alumni' as ResourceKey,
        }));
      },
    },
    {
      resource: 'events-archive',
      label: 'Event archive',
      run: async (q) => {
        const { data } = await sb.from('events')
          .select('id, title, date, place, event_type')
          .or(`title.ilike.${like(q)},place.ilike.${like(q)},moderator.ilike.${like(q)}`)
          .order('date', { ascending: false })
          .limit(PER_SOURCE);
        return (data ?? []).map((e: Record<string, string>) => ({
          id: `event:${e.id}`,
          label: e.title,
          detail: [e.date ? new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null, e.place]
            .filter(Boolean).join(' · '),
          source: 'Event archive',
          resource: 'events-archive' as ResourceKey,
        }));
      },
    },
    {
      resource: 'reports-archive',
      label: 'Report archive',
      run: async (q) => {
        const { data } = await sb.from('archive_files')
          .select('id, title, date, division, status, deleted_at')
          .is('deleted_at', null)
          .or(`title.ilike.${like(q)},description.ilike.${like(q)}`)
          .order('date', { ascending: false })
          .limit(PER_SOURCE);
        return (data ?? []).map((r: Record<string, string>) => ({
          id: `report:${r.id}`,
          label: r.title,
          detail: [r.division, r.date ? new Date(r.date).getFullYear() : null].filter(Boolean).join(' · '),
          source: 'Report archive',
          resource: 'reports-archive' as ResourceKey,
        }));
      },
    },
    // The resource libraries. Each is its own subsection with its own
    // permission, so each is its own source rather than one query over
    // the table with a category filter: a role with Instagram but not
    // LinkedIn must not have the LinkedIn query sent on its behalf.
    ...([
      ['smm-ig', 'smm_instagram', 'Instagram'],
      ['smm-li', 'smm_linkedin', 'LinkedIn'],
      ['smm-graphics', 'smm_graphics', 'MIMS Graphics'],
      ['smm-other', 'smm_other', 'Other resources'],
      ['reports-templates', 'reports_templates', 'Templates & repositories'],
    ] as const).map(([resource, category, label]): Source => ({
      resource,
      label,
      run: async (q) => {
        const { data } = await sb.from('workspace_resources')
          .select('id, title, description, category, division')
          .eq('category', category)
          .or(`title.ilike.${like(q)},description.ilike.${like(q)},body.ilike.${like(q)}`)
          .limit(PER_SOURCE);
        return (data ?? []).map((r: Record<string, string>) => ({
          id: `resource:${r.id}`,
          label: r.title,
          detail: r.description || label,
          source: label,
          resource: resource as ResourceKey,
        }));
      },
    })),
  ];
}

/**
 * Content matching `query`, restricted to what this role may open.
 *
 * `canView` is passed in rather than read from a hook here so that the
 * gate and the caller can never disagree about which role is being
 * served, and so this hook stays testable on its own.
 */
export function useWorkspaceContentSearch(
  query: string,
  canView: (resource: ResourceKey) => boolean,
  enabled = true,
) {
  const [hits, setHits] = useState<ContentHit[]>([]);
  const [searching, setSearching] = useState(false);
  /** Guards against an older, slower response overwriting a newer one. */
  const runId = useRef(0);

  // THE GATE. Sources are filtered once per role, and a source that does
  // not survive this line is never queried at all.
  const sources = useMemo(
    () => buildSources().filter((s) => canView(s.resource)),
    [canView],
  );

  const q = query.trim();

  useEffect(() => {
    // Two characters is where a search stops being every row in a table.
    if (!enabled || q.length < 2 || sources.length === 0) {
      setHits([]);
      setSearching(false);
      return;
    }
    const id = ++runId.current;
    setSearching(true);
    // Debounced: a person typing "Francesca" should cost one round of
    // queries, not nine.
    const timer = window.setTimeout(async () => {
      const settled = await Promise.allSettled(sources.map((s) => s.run(q)));
      if (id !== runId.current) return;             // a newer query won
      const all: ContentHit[] = [];
      for (const r of settled) {
        // One source failing (a policy refusal, a dropped connection)
        // must not take the others down with it.
        if (r.status === 'fulfilled') all.push(...r.value);
      }
      // A row whose label starts with what was typed is what the person
      // most likely meant; everything else keeps its source order.
      const lower = q.toLowerCase();
      all.sort((a, b) => {
        const as = a.label.toLowerCase().startsWith(lower) ? 0 : 1;
        const bs = b.label.toLowerCase().startsWith(lower) ? 0 : 1;
        return as - bs;
      });
      setHits(all.slice(0, TOTAL));
      setSearching(false);
    }, 250);

    return () => { window.clearTimeout(timer); };
  }, [q, sources, enabled]);

  return { hits, searching };
}
