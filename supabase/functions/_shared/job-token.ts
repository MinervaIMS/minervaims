// =====================================================================
// job-token: how the database's scheduled jobs prove who they are.
// ---------------------------------------------------------------------
// A daily job (pg_cron, then pg_net) calls an edge function. It used to
// send the service role key, read from the vault; Lovable Cloud does not
// let a migration read a secret, so the jobs added since Step 93B carry a
// token of their own instead: a random value per job, created by the
// migration in public.scheduled_job_tokens (row level security on, no
// policies, no grants to anon or authenticated: only the database itself
// and the service role read it). The job sends it in the `x-job-token`
// header; the function reads the same row with the service role and
// compares. A token opens one job's action and nothing else.
// =====================================================================

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

/** Compares two strings in time that does not depend on where they differ. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when the request carries the token of `job` (read with the service role client). */
export async function isScheduledJob(supabase: Client, req: Request, job: string): Promise<boolean> {
  const sent = (req.headers.get('x-job-token') || '').trim();
  if (sent.length < 32) return false;
  const { data, error } = await supabase.from('scheduled_job_tokens').select('token').eq('job', job).maybeSingle();
  if (error || !data?.token) return false;
  return sameText(sent, String(data.token));
}
