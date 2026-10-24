import postgres from 'npm:postgres@3'

Deno.serve(async (req) => {
  const key = Deno.env.get('TMP_MIGRATE_93B_TOKEN')!
  if (req.headers.get('authorization') !== `Bearer ${key}`) return new Response('no', { status: 401 })
  const sqlText = await Deno.readTextFile(new URL('./migration.sql', import.meta.url))
  const notices: string[] = []
  const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1, onnotice: (n) => notices.push(n.message) })
  try {
    await sql.unsafe(sqlText).simple()
    return new Response(JSON.stringify({ ok: true, notices }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), { status: 500 })
  } finally {
    await sql.end()
  }
})
