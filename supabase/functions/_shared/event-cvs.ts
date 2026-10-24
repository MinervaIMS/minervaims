// =====================================================================
// The CVs given with an interest in a company visit (Step 93B), in the
// private bucket `event-cvs`, one folder per visit and one per person:
// `<event id>/<user id>/<time>-<random>.pdf`. Removing a visit's folder
// removes every CV given for it, those never submitted included (a person
// who attached a file and left the page).
// =====================================================================

export const EVENT_CVS_BUCKET = 'event-cvs';

type Storage = {
  storage: {
    from: (bucket: string) => {
      list: (path?: string, options?: { limit?: number; offset?: number }) => Promise<{ data: { name: string; id: string | null }[] | null; error: unknown }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

/** Every file under `<eventId>/`, as full paths. */
export async function eventCvPaths(supabase: Storage, eventId: string): Promise<string[]> {
  const bucket = supabase.storage.from(EVENT_CVS_BUCKET);
  const { data: people, error } = await bucket.list(eventId, { limit: 1000 });
  if (error) throw error;
  const paths: string[] = [];
  for (const person of people || []) {
    // A folder has no id; a file directly under the visit is taken too.
    if (person.id) { paths.push(`${eventId}/${person.name}`); continue; }
    const { data: files, error: fErr } = await bucket.list(`${eventId}/${person.name}`, { limit: 1000 });
    if (fErr) throw fErr;
    for (const f of files || []) if (f.id) paths.push(`${eventId}/${person.name}/${f.name}`);
  }
  return paths;
}

/** Removes every CV given for this visit. Returns how many files went. */
export async function removeEventCvs(supabase: Storage, eventId: string): Promise<number> {
  const paths = await eventCvPaths(supabase, eventId);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase.storage.from(EVENT_CVS_BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
  return paths.length;
}
