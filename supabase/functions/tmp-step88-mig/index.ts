import postgres from 'npm:postgres@3.4.4';
import SQL from './sql.ts';
Deno.serve(async (req) => {
  const b = await req.json().catch(() => ({}));
  if (b.k !== 'mig-step88') return new Response('no', { status: 403 });
  const db = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1, prepare: false });
  const out: string[] = [];
  try { for (const s of SQL) { await db.unsafe(s); out.push('ok'); } return new Response(JSON.stringify({ out })); }
  catch (e) { return new Response(JSON.stringify({ out, error: String(e) })); }
  finally { await db.end(); }
});
