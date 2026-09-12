import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const USER_ID = '62b07dbf-2abb-42f3-927d-50644a1bc7ac';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: listed } = await supabase.storage.from('applications').list(USER_ID);
  const paths = (listed || []).map((f) => `${USER_ID}/${f.name}`);
  let removed: unknown = null;
  if (paths.length) {
    const { data, error } = await supabase.storage.from('applications').remove(paths);
    removed = error ? { error: error.message } : data;
  }

  const { error: delErr } = await supabase.auth.admin.deleteUser(USER_ID);

  return new Response(
    JSON.stringify({ paths, removed, authDeleted: !delErr, authError: delErr?.message ?? null }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
