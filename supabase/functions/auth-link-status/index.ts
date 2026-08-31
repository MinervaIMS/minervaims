// ---------------------------------------------------------------------------
// "Is this spent link one of ours, and is that account already confirmed?"
//
// Auth tokens are strictly single-use, so a second or third click on a mailed
// confirmation link can never mint a session again. What it CAN do is stop
// looking like a failure: this endpoint tells the verification page whether the
// link it holds was really issued by us and whether the account it belonged to
// is now confirmed, so the page can say "already confirmed - continue" instead
// of "invalid or expired".
//
// It returns a status word and nothing else: no tokens, no session, no personal
// data. The lookup key is a SHA-256 of the token hash, recorded by
// `auth-email-hook` when the link was mailed.
// ---------------------------------------------------------------------------
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let tokenHash = ''
  try {
    const body = await req.json()
    tokenHash = typeof body?.token_hash === 'string' ? body.token_hash.trim() : ''
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  // A token hash is a bounded hex/base64 string; anything else is not worth a
  // database round trip.
  if (!tokenHash || tokenHash.length > 256 || !/^[A-Za-z0-9_.:-]+$/.test(tokenHash)) {
    return json({ error: 'Invalid token_hash' }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const key = await sha256Hex(tokenHash)
  const { data: receipt, error } = await supabase
    .from('auth_link_receipts')
    .select('user_id, action_type, expires_at')
    .eq('token_sha256', key)
    .maybeSingle()

  if (error) {
    console.error('Receipt lookup failed', { message: error.message })
    return json({ status: 'unknown' })
  }
  if (!receipt) return json({ status: 'unknown' })

  // The link was ours. Was the thing it existed to do already done?
  if (receipt.user_id) {
    try {
      const { data } = await supabase.auth.admin.getUserById(receipt.user_id)
      const confirmedAt = (data?.user as { email_confirmed_at?: string } | undefined)?.email_confirmed_at
      if (confirmedAt) {
        return json({ status: 'already_confirmed', action_type: receipt.action_type })
      }
    } catch (e) {
      console.error('User lookup failed', { message: (e as Error).message })
    }
  }

  const expired = new Date(receipt.expires_at).getTime() < Date.now()
  return json({ status: expired ? 'expired' : 'issued', action_type: receipt.action_type })
})
