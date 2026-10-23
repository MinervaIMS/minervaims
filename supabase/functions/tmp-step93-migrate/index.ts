import postgres from 'npm:postgres@3.4.4';
import TEXT from './m.ts';
Deno.serve(async (req) => {
  if (req.headers.get('x-run') !== 'step93-go') return new Response('no', { status: 403 });
  const notices: string[] = [];
  const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1, onnotice: (n) => notices.push(n.message) });
  try {
    const text = TEXT;
    await sql.unsafe(text).simple();
    return Response.json({ ok: true, notices });
  } catch (e) {
    return Response.json({ ok: false, error: String(e), notices }, { status: 500 });
  } finally { await sql.end(); }
});
