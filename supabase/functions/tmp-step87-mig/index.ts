import postgres from 'npm:postgres@3.4.4';
import SQL from './sql.ts';
Deno.serve(async (req) => {
  const b = await req.json().catch(() => ({}));
  if (b.k !== 'mig-step87') return new Response('no', { status: 403 });
  const db = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1, prepare: false });
  try { await db.unsafe(SQL); return new Response(JSON.stringify({ ok: true })); }
  catch (e) { return new Response(JSON.stringify({ error: String(e) })); }
  finally { await db.end(); }
});
