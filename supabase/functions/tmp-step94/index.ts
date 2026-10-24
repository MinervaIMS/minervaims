// THROWAWAY: applies the Step 94 migration once, then this function is deleted.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import postgres from 'npm:postgres@3.4.5'

const GUARD = 'step94-run-once-7f3a9c'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.headers.get('x-tmp-guard') !== GUARD) {
    return new Response(JSON.stringify({ error: 'no' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const notices: string[] = []
  try {
    const url = Deno.env.get('SUPABASE_DB_URL')
    if (!url) throw new Error('SUPABASE_DB_URL not set')
    const sql = postgres(url, { max: 1, onnotice: (n) => notices.push(String(n.message ?? n)) })
    const text = await Deno.readTextFile(new URL('./migration.sql', import.meta.url))
    await sql.unsafe(text)
    await sql.end()
    return new Response(JSON.stringify({ ok: true, notices }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), notices }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
