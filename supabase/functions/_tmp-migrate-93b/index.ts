import { createClient } from 'npm:@supabase/supabase-js@2'
Deno.serve(async (req) => {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (req.headers.get('authorization') !== `Bearer ${key}`) return new Response('no', { status: 401 })
  const sql = await req.text()
  const url = Deno.env.get('SUPABASE_URL')!
  const dbUrl = url.replace('https://', 'postgres://postgres.') // unused
  // Use the Postgres connection via supabase-js rpc is not possible for DDL; use the SQL over the pg wire through PostgREST is not possible either.
  // Instead: use the service role with the 'pg' driver is unavailable; so we use the management SQL endpoint via fetch to /pg with service key? Not available.
  return new Response('placeholder', { status: 500 })
})
