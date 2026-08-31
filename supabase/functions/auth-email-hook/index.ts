import { parseEmailWebhookPayload } from 'npm:@lovable.dev/email-js'
import { WebhookError, verifyWebhookRequest } from 'npm:@lovable.dev/webhooks-js'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { AUTH_SUBJECTS, renderAuthEmail } from '../_shared/auth-emails.ts'
import { normalizeEmailSubject } from '../_shared/email-subjects.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_NAME = 'Minerva IMS'
const SENDER_DOMAIN = 'notify.minervaims.org'
const FROM_DOMAIN = 'minervaims.org'

const SAMPLE_PROJECT_URL = 'https://minervaims.org/auth/callback?token=preview'
const SAMPLE_DATA: Record<string, { confirmationUrl?: string; token?: string; oldEmail?: string; newEmail?: string; firstName?: string }> = {
  signup: { confirmationUrl: SAMPLE_PROJECT_URL, token: '123456' },
  recovery: { confirmationUrl: SAMPLE_PROJECT_URL, token: '123456' },
  magiclink: { confirmationUrl: SAMPLE_PROJECT_URL, token: '123456' },
  invite: { confirmationUrl: SAMPLE_PROJECT_URL },
  email_change: { confirmationUrl: SAMPLE_PROJECT_URL, token: '123456', oldEmail: 'old@example.test', newEmail: 'new@example.test' },
  reauthentication: { token: '123456' },
}

async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }
  if (req.method === 'OPTIONS') return new Response(null, { headers: previewCorsHeaders })

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')
  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rendered = renderAuthEmail(type, { firstName: 'Riccardo', ...(SAMPLE_DATA[type] || {}) })
  if (!rendered) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }
  return new Response(rendered.html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

const DEFAULT_APP_ORIGIN = 'https://minervaims.org'

// ---------------------------------------------------------------------------
// Email link scanners (Microsoft Defender / Safe Links on studbocconi.it, and
// most corporate mail filters) OPEN every link in a message to inspect it.
// The auth server's /auth/v1/verify endpoint is a one-time GET: that scan
// consumes the token, so by the time the student clicks, the link is already
// spent and the app can only say "invalid or has expired".
//
// So we never mail the verify endpoint. We mail one of OUR pages carrying the
// token hash. Opening that page does nothing by itself — the token is redeemed
// only when the page calls verifyOtp (a POST from the browser), which a link
// scanner never performs.
// ---------------------------------------------------------------------------
function appHostedLink(verifyUrl: string | undefined, actionType: string): string | undefined {
  if (!verifyUrl) return verifyUrl
  // EVERY action type that carries a clickable link must land on one of our own
  // pages. Leaving even one pointing at /auth/v1/verify would keep that flow
  // broken, because a plain GET there redeems the token server-side and no
  // amount of client-side care can help. `reauthentication` has no link at all
  // (it is code-only), so it never reaches this function with a URL.
  const landing = actionType === 'recovery'
    ? '/reset-password'
    : (actionType === 'signup' || actionType === 'invite' || actionType === 'email_change' ||
       actionType === 'magiclink' || actionType === 'email')
      ? '/verify-email'
      : null
  if (!landing) return verifyUrl


  try {
    const url = new URL(verifyUrl)
    const tokenHash = url.searchParams.get('token') || url.searchParams.get('token_hash')
    const type = url.searchParams.get('type') || actionType
    const redirectTo = url.searchParams.get('redirect_to')
    if (!tokenHash) return verifyUrl

    let origin = DEFAULT_APP_ORIGIN
    let next = ''
    if (redirectTo) {
      try {
        const dest = new URL(redirectTo)
        origin = dest.origin
        next = `${dest.pathname}${dest.search}`
      } catch { /* keep defaults */ }
    }

    const link = new URL(landing, origin)
    link.searchParams.set('token_hash', tokenHash)
    link.searchParams.set('type', type)
    if (next && next !== '/') link.searchParams.set('next', next)
    return link.toString()
  } catch {
    return verifyUrl
  }
}

// ---------------------------------------------------------------------------
// A receipt for every link we mail.
//
// One-time tokens cannot be made reusable, so instead we remember that WE
// issued this one. When a student clicks the same link a second or third time,
// the verification page asks `auth-link-status` about it and can say "already
// confirmed" rather than "invalid or expired". Only a SHA-256 of the token hash
// is stored — the receipt can recognise a link, never reconstruct one.
// ---------------------------------------------------------------------------
const RECEIPT_TTL_HOURS = 24

function tokenHashFrom(verifyUrl: string | undefined): string | null {
  if (!verifyUrl) return null
  try {
    const url = new URL(verifyUrl)
    return url.searchParams.get('token') || url.searchParams.get('token_hash')
  } catch {
    return null
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function recordLinkReceipt(
  supabase: any,
  verifyUrl: string | undefined,
  actionType: string,
  email: string,
): Promise<void> {
  const tokenHash = tokenHashFrom(verifyUrl)
  if (!tokenHash) return
  try {
    const lower = (email || '').toLowerCase()
    const { data: profile } = await supabase
      .from('profiles').select('id').ilike('email', lower).maybeSingle()
    await supabase.from('auth_link_receipts').upsert({
      token_sha256: await sha256Hex(tokenHash),
      user_id: profile?.id ?? null,
      email: lower || null,
      action_type: actionType,
      expires_at: new Date(Date.now() + RECEIPT_TTL_HOURS * 3600 * 1000).toISOString(),
    }, { onConflict: 'token_sha256' })
    // Housekeeping: receipts are only useful while a link could still be
    // clicked, so anything a week past its expiry is removed on the way past.
    await supabase
      .from('auth_link_receipts')
      .delete()
      .lt('expires_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
  } catch (e) {
    // A missing receipt only costs the friendlier wording on a repeat click.
    console.error('Failed to record auth link receipt', { message: (e as Error).message })
  }
}



// ---------------------------------------------------------------------------
// Recipient first name resolution: profiles -> members -> roster -> auth
// metadata -> email local part ("name.surname@..." => "Name").
// ---------------------------------------------------------------------------
function firstNameFromEmail(email: string): string {
  const local = (email || '').split('@')[0] || ''
  const raw = local.split(/[._\-+]/)[0] || ''
  if (!raw || /^\d+$/.test(raw)) return ''
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

async function resolveFirstName(supabase: any, email: string): Promise<string> {
  const lower = (email || '').toLowerCase()
  if (!lower) return ''
  try {
    const { data: profile } = await supabase
      .from('profiles').select('full_name').ilike('email', lower).maybeSingle()
    const fromProfile = (profile?.full_name || '').trim()
    if (fromProfile) return fromProfile.split(' ')[0]
  } catch (_e) { /* table shape may differ; fall through */ }
  try {
    const { data: member } = await supabase
      .from('members').select('first_name').ilike('email', lower).maybeSingle()
    const fromMember = (member?.first_name || '').trim()
    if (fromMember) return fromMember.split(' ')[0]
  } catch (_e) { /* ignore */ }
  return firstNameFromEmail(lower)
}

async function handleWebhook(req: Request): Promise<Response> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: any
  let run_id = ''
  try {
    const verified = await verifyWebhookRequest({ req, secret: apiKey, parser: parseEmailWebhookPayload })
    payload = verified.payload
    run_id = payload.run_id
  } catch (error) {
    if (error instanceof WebhookError) {
      switch (error.code) {
        case 'invalid_signature':
        case 'missing_timestamp':
        case 'invalid_timestamp':
        case 'stale_timestamp':
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        case 'invalid_payload':
        case 'invalid_json':
          return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
      }
    }
    console.error('Webhook verification failed', { error })
    return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!run_id) {
    return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (payload.version !== '1') {
    return new Response(JSON.stringify({ error: `Unsupported payload version: ${payload.version}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const emailType = payload.data.action_type
  console.log('Received auth event', { emailType, email: payload.data.email, run_id })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const firstName = await resolveFirstName(supabase, payload.data.email)

  await recordLinkReceipt(supabase, payload.data.url, emailType, payload.data.email)

  const rendered = renderAuthEmail(emailType, {
    firstName,
    confirmationUrl: appHostedLink(payload.data.url, emailType),
    token: payload.data.token,
    oldEmail: payload.data.old_email,
    newEmail: payload.data.new_email,
  })

  if (!rendered) {
    console.error('Unknown email type', { emailType, run_id })
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const messageId = crypto.randomUUID()

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: payload.data.email,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      run_id,
      message_id: messageId,
      to: payload.data.email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: normalizeEmailSubject(AUTH_SUBJECTS[emailType] || rendered.subject),
      html: rendered.html,
      text: rendered.text,
      purpose: 'transactional',
      label: emailType,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue auth email', { error: enqueueError, run_id, emailType })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: payload.data.email,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Auth email enqueued', { emailType, email: payload.data.email, run_id })
  return new Response(JSON.stringify({ success: true, queued: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (url.pathname.endsWith('/preview')) return handlePreview(req)
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
