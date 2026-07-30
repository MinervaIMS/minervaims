import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// useSeniorAnalystDivisions — which divisions actually have one.
// ---------------------------------------------------------------------
// The organisational chart draws a Senior Analysts level under every
// team, but a division only has that level when somebody holds the role.
// Reading it from the same register the public Members page reads means
// the chart follows the society instead of describing an ideal: appoint
// the first senior analyst in Macro Research and the level appears there
// on the next visit, with no code change.
//
// Until the answer arrives the level is assumed present, which is what
// the chart shows in overview anyway: the sub-trees are hidden at that
// point, so the layout settles before anyone can see it change.
// =====================================================================

const SENIOR_ANALYST = 'Senior Analyst';

export function useSeniorAnalystDivisions() {
  const [divisions, setDivisions] = useState<Set<string> | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('division')
          .eq('position', SENIOR_ANALYST);
        if (error) throw error;
        const found = new Set<string>();
        (data || []).forEach((row) => {
          if (row.division) found.add(row.division);
        });
        if (active) setDivisions(found);
      } catch (error) {
        // A failed read must not remove a level that probably exists:
        // fall back to the full structure.
        console.error('Error reading senior analysts:', error);
        if (active) setDivisions(null);
      }
    })();
    return () => { active = false; };
  }, []);

  /** True while the answer is unknown, so the level is drawn by default. */
  const hasSeniorAnalysts = (division: string) =>
    divisions === null || divisions.has(division);

  return { hasSeniorAnalysts, loaded: divisions !== null };
}
