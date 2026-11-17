// =====================================================================
// rate-limit.ts: a limit per address on the forms anybody can send.
// ---------------------------------------------------------------------
// Two functions write and send for people who are not signed in:
// registering for an event and applying. Without a limit a script could
// use them to send thousands of emails in the association's name or to
// fill a register. (The Division Fit test answers visitors too, but it
// writes nothing and sends nothing, so it is not counted.) public.request_rate_check (Step 106) counts requests
// per address in a window; this file asks it.
//
// THE LIMITS ARE DELIBERATELY HIGH. A lecture hall registers from one
// university address, and a limit a real audience can reach is worse
// than none: they are set far above what people do and far below what a
// script does.
//
// IT FAILS OPEN. If the question cannot be asked (the migration is not
// in yet, the database is busy), the request goes through, exactly as it
// did before this file existed.
// =====================================================================

// Any Supabase client: only its `rpc` is used, and its answer is read as
// data and an error.
type RpcAnswer = { data: unknown; error: unknown };
type Client = { rpc: (fn: string, args: Record<string, unknown>) => unknown };

/** The caller's address, as the gateway reports it. */
export function callerAddress(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? '';
  return forwarded.split(',')[0].trim().slice(0, 64) || 'unknown';
}

/** Is this address over the limit for this form? Never true on an error. */
export async function overLimit(
  supabase: Client, req: Request, bucket: string, limit: number, windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = (await supabase.rpc('request_rate_check', {
      p_bucket: bucket, p_key: callerAddress(req), p_limit: limit, p_window_seconds: windowSeconds,
    })) as RpcAnswer;
    if (error) return false;
    return data === false;
  } catch {
    return false;
  }
}

/** The answer an address over the limit gets. */
export const TOO_MANY = 'Too many requests from this network in a short time. Please wait a few minutes and try again.';
