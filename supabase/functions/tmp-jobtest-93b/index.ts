import postgres from 'npm:postgres@3'

Deno.serve(async (req) => {
  const key = Deno.env.get('TMP_JOBTEST_93B_TOKEN')!
  if (req.headers.get('authorization') !== `Bearer ${key}`) return new Response('no', { status: 401 })
  const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1 })
  try {
    await sql.unsafe(`SELECT net.http_post(url := 'https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/key-numbers', headers := public.scheduled_job_headers('estr_fill'), body := '{"action":"fill-estr"}'::jsonb)`)
    await sql.unsafe(`SELECT net.http_post(url := 'https://asjudzdgsccacpjbzsue.supabase.co/functions/v1/company-visits', headers := public.scheduled_job_headers('company_visit_cv_cleanup'), body := '{"action":"cleanup"}'::jsonb)`)
    await sql.unsafe(`SELECT pg_sleep(10)`)
    const rows = await sql.unsafe(`SELECT status_code, content FROM net._http_response ORDER BY created DESC LIMIT 2`)
    return new Response(JSON.stringify({ ok: true, rows }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), { status: 500 })
  } finally {
    await sql.end()
  }
})
