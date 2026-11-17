// =====================================================================
// admin-auth: RETIRED (Step 106).
// ---------------------------------------------------------------------
// This was the first way into the workspace: a user name and a password
// of its own, checked against the `admin_users` table, answered with a
// token only this function understood. The workspace has signed people
// in with their own accounts for a long time, no page calls this
// function any more, and no other function accepts its token.
//
// It was still deployed, though, and still answering: anybody could send
// it guesses at that old user name and password. A door nobody uses is
// closed here rather than left with its lock on. It reads no secret,
// touches no table and answers every request the same way.
//
// The function can also simply be deleted from the project; until it is,
// this is what it does.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({ error: 'This sign-in was retired. Sign in to the Minerva Workspace with your own account.' }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
