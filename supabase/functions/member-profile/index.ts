import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// member-profile — self-service for the logged-in user's My Profile page.
//   * get    : returns the user's linked member row, OR (if none) the list
//              of claimable to_redeem placeholders + needsRedemption flag.
//              It NEVER silently creates a member — redemption is explicit.
//   * redeem : claims a chosen placeholder, or creates a new member from
//              the user's name + role assignment.
//   * update : edits ONLY the user's phone + photo (report 3).
// The admin role is treated as a user, not a member: no member is created
// or surfaced for it.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UpdateSchema = z.object({
  phone: z.string().trim().min(3, 'Phone number is required').max(40),
  photo_url: z.string().max(500).nullable().optional()
    .refine((v) => !v || v.startsWith('http://') || v.startsWith('https://'), 'Photo URL must be a valid URL'),
});

const RedeemSchema = z.object({
  memberId: z.string().uuid().optional(),
  create: z.boolean().optional(),
});

const PUBLIC_ROLES = new Set([
  'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
  'team_leader', 'senior_analyst', 'portfolio_manager', 'analyst', 'head_of_media',
  'media_analyst', 'head_of_operations', 'advisor',
]);

const ROLE_RANK: Record<string, number> = {
  president: 1, vice_president: 2, head_of_asset_management: 3, head_of_division: 4,
  head_of_media: 5, head_of_operations: 6, portfolio_manager: 7, team_leader: 8,
  senior_analyst: 9, analyst: 10, media_analyst: 11, advisor: 12,
  alumni: 90, member: 95, candidate: 98, pending: 99, admin: 99,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function splitName(full: string | null | undefined, fallbackEmail: string): { first: string; surname: string } {
  const name = (full || '').trim();
  if (!name) return { first: fallbackEmail.split('@')[0] || 'Member', surname: '' };
  const parts = name.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], surname: '' };
  return { first: parts[0], surname: parts.slice(1).join(' ') };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.split(' ')[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: roleRows } = await supabase
      .from('user_roles').select('role, division').eq('user_id', user.id);
    const roleList = (roleRows || []) as Array<{ role: string; division: string | null }>;
    const roles: string[] = roleList.map((r) => r.role);
    const isCandidate = roles.includes('candidate') && !roles.some((r) => r !== 'candidate' && r !== 'pending');
    // The admin role is a user, not a member.
    const isAdminRole = roles.includes('admin') && !roles.some((r) => PUBLIC_ROLES.has(r));

    // ── Photo upload (multipart) — reuses the team-photos bucket ──────────
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      if (isCandidate || isAdminRole) return json({ error: 'Not available' }, 403);
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return json({ error: 'No file provided' }, 400);
      if (!file.type.startsWith('image/')) return json({ error: 'Only image files are allowed' }, 400);
      if (file.size > 5 * 1024 * 1024) return json({ error: 'Image size must be less than 5MB' }, 400);

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const arrayBuffer = await file.arrayBuffer();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-photos')
        .upload(fileName, arrayBuffer, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploadError) return json({ error: 'Failed to upload photo to storage' }, 500);
      const { data: urlData } = supabase.storage.from('team-photos').getPublicUrl(uploadData.path);
      return json({ success: true, photo_url: urlData.publicUrl });
    }

    const body = await req.json().catch(() => ({}));
    const action: 'get' | 'update' | 'redeem' =
      body.action === 'update' ? 'update' : body.action === 'redeem' ? 'redeem' : 'get';

    if (isCandidate || isAdminRole) return json({ member: null, isCandidate, isAdmin: isAdminRole });

    const findLinked = async () => {
      const { data } = await supabase.from('members').select('*').eq('user_id', user.id).maybeSingle();
      return data;
    };

    const primaryAssignment = (): { role: string; division: string | null } | undefined =>
      [...roleList].sort((a, b) => (ROLE_RANK[a.role] ?? 99) - (ROLE_RANK[b.role] ?? 99))[0];

    // Does this user hold a real staff role (beyond member/pending/candidate)?
    const hasStaffRole = roleList.some((r) => !['member', 'pending', 'candidate', 'admin'].includes(r.role));

    // ── GET ──────────────────────────────────────────────────────────────
    // Linking order: (1) the member row already linked to this account;
    // (2) the account-redeem path — link_member_account() claims the roster
    //     profile carrying this user's CONFIRMED email and applies its stored
    //     role and division to workspace access, all server-side;
    // (3) only for users who already hold a staff role (assigned in
    //     Settings → Users), a fresh roster row is provisioned. Accounts
    //     without a role never silently create members: that would produce
    //     duplicate/ghost roster rows.
    if (action === 'get') {
      const linked = await findLinked();
      if (linked) {
        // Backfill the email from the login if it is missing.
        if (!linked.email && user.email) {
          const { data: u } = await supabase.from('members')
            .update({ email: user.email }).eq('id', linked.id).select().single();
          return json({ member: u ?? linked });
        }
        return json({ member: linked });
      }

      // Account redeem: secure server-side linking by confirmed email.
      const { data: linkResult } = await supabase.rpc('link_member_account', { p_user_id: user.id });
      const linkStatus = (linkResult as { status?: string } | null)?.status ?? 'no_match';
      if (linkStatus === 'linked' || linkStatus === 'already_linked') {
        const claimed = await findLinked();
        if (claimed) return json({ member: claimed, redeemed: linkStatus === 'linked' });
      }

      if (!hasStaffRole) {
        // No linked profile, no claimable profile, no assigned role: surface
        // the redeem outcome instead of creating a ghost member row.
        return json({ member: null, redeemStatus: linkStatus });
      }

      // Create a fresh member from the user's profile + role.
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const { first, surname } = splitName(profile?.full_name, user.email || '');
      const primary = primaryAssignment();
      const role = primary?.role ?? 'member';
      const division = primary?.division ?? 'none';
      const { data: created } = await supabase.from('members').insert({
        user_id: user.id, first_name: first, surname, email: user.email ?? null,
        division, role, account_status: 'approved', membership_status: 'active',
        is_public: PUBLIC_ROLES.has(role),
      }).select().single();
      return json({ member: created });
    }

    // ── REDEEM ─────────────────────────────────────────────────────────────
    if (action === 'redeem') {
      const linked = await findLinked();
      if (linked) return json({ member: linked }); // idempotent

      const parsed = RedeemSchema.safeParse(body);
      if (!parsed.success) return json({ error: 'Validation failed' }, 400);

      if (parsed.data.memberId) {
        const { data: target } = await supabase.from('members').select('*')
          .eq('id', parsed.data.memberId).maybeSingle();
        if (!target || target.user_id) return json({ error: 'This profile cannot be claimed' }, 409);
        // Explicit redemption is only allowed for the profile carrying the
        // caller's own (verified) login email — claiming someone else's
        // profile by id is rejected.
        if (!target.email || !user.email || target.email.toLowerCase() !== user.email.toLowerCase()) {
          return json({ error: 'This profile is registered to a different email address. Contact as.minerva@unibocconi.it.' }, 403);
        }
        const { data: linkResult } = await supabase.rpc('link_member_account', { p_user_id: user.id });
        const linkStatus = (linkResult as { status?: string } | null)?.status;
        if (linkStatus === 'linked' || linkStatus === 'already_linked') {
          const claimed = await findLinked();
          if (claimed) return json({ member: claimed });
        }
        return json({ error: 'This profile cannot be claimed', redeemStatus: linkStatus }, 409);
      }

      if (!hasStaffRole) return json({ error: 'No role assigned yet. Contact as.minerva@unibocconi.it.' }, 403);

      // Create a fresh approved member from the user's profile + role.
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const { first, surname } = splitName(profile?.full_name, user.email || '');
      const primary = primaryAssignment();
      const role = primary?.role ?? 'member';
      const division = primary?.division ?? 'none';
      const { data: created, error } = await supabase.from('members').insert({
        user_id: user.id, first_name: first, surname, email: user.email ?? null,
        division, role, account_status: 'approved', membership_status: 'active',
        is_public: PUBLIC_ROLES.has(role),
      }).select().single();
      if (error) throw error;
      return json({ member: created });
    }

    // ── UPDATE (phone + photo only) ────────────────────────────────────────
    const member = await findLinked();
    if (!member) return json({ error: 'No member record to update' }, 404);

    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);

    // photo_url: undefined keeps the current value; null clears it (delete).
    const nextPhoto = 'photo_url' in body ? (parsed.data.photo_url ?? null) : member.photo_url;
    const { data: updated, error } = await supabase.from('members')
      .update({ phone: parsed.data.phone, photo_url: nextPhoto })
      .eq('id', member.id).eq('user_id', user.id).select().single();
    if (error) throw error;
    return json({ success: true, member: updated });
  } catch (error) {
    console.error('member-profile error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
