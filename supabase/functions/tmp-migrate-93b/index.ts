import postgres from 'npm:postgres@3'

Deno.serve(async (req) => {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (req.headers.get('authorization') !== `Bearer ${key}`) return new Response('no', { status: 401 })
  const sqlText = await req.text()
  const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1, onnotice: (n) => notices.push(n.message) })
  const notices: string[] = []
  try {
    await sql.unsafe(sqlText).simple()
    return new Response(JSON.stringify({ ok: true, notices }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), { status: 500 })
  } finally {
    await sql.end()
  }
})
