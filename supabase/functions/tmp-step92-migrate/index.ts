import postgres from 'npm:postgres@3.4.4';
import SQL from './sql.ts';
Deno.serve(async (req) => {
  if (req.headers.get('x-run') !== 'step92-once') return new Response('no', { status: 403 });
  const notices: string[] = [];
  const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1, onnotice: (n) => notices.push(n.message), prepare: false });
  try {
    await sql.begin(async (tx) => { await tx.unsafe(SQL); });
    return Response.json({ ok: true, notices });
  } catch (e) {
    return Response.json({ ok: false, error: String(e), notices }, { status: 500 });
  } finally { await sql.end(); }
});
