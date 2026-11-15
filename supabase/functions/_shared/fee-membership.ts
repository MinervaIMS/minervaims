// Exchange and semester leave do not end dues-paying membership.
// Keep this list identical to public.fee_member_status in the database.
export const FEE_MEMBERSHIP_STATUSES = ['active', 'on_exchange', 'one_semester_pause'];

export function isFeeMemberStatus(status: string | null | undefined): boolean {
  return typeof status === 'string' && FEE_MEMBERSHIP_STATUSES.includes(status);
}