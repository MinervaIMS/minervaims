// =====================================================================
// THE ORDER OF PEOPLE > MEMBERS (Step 107).
// ---------------------------------------------------------------------
// By role, as the register has always opened; or by the events each
// member attended this semester, most first or fewest first, for the
// roles that see the attendance (the full-access roles of Members, the
// same ones the "Events" column is shown to); or by surname. Equal
// counts keep the order by role, then by surname, so the list never
// shuffles between two looks.
//
// The choice is kept in this browser only (a convenience, never needed:
// without it the register opens by role).
// =====================================================================

export type MemberOrder = 'role' | 'attended-most' | 'attended-least' | 'surname';

export const MEMBER_ORDERS: { value: MemberOrder; label: string; attendance?: true }[] = [
  { value: 'role', label: 'By role' },
  { value: 'attended-most', label: 'Most events attended', attendance: true },
  { value: 'attended-least', label: 'Fewest events attended', attendance: true },
  { value: 'surname', label: 'By surname' },
];

const KEY = 'mims_members_order';

export function readMemberOrder(seesAttendance: boolean): MemberOrder {
  try {
    const v = localStorage.getItem(KEY) as MemberOrder | null;
    const known = MEMBER_ORDERS.find((o) => o.value === v);
    if (known && (!known.attendance || seesAttendance)) return known.value;
  } catch { /* private mode: by role */ }
  return 'role';
}

export function keepMemberOrder(order: MemberOrder) {
  try { localStorage.setItem(KEY, order); } catch { /* private mode: not kept */ }
}

interface Orderable { id: string; role: string; first_name: string; surname: string }

/** The members in the order chosen. Pure. */
export function orderMembers<T extends Orderable>(
  rows: T[],
  order: MemberOrder,
  rank: (role: string) => number,
  attended: Record<string, number> | null,
): T[] {
  const byName = (a: T, b: T) => `${a.surname} ${a.first_name}`.localeCompare(`${b.surname} ${b.first_name}`, 'en', { sensitivity: 'base' });
  const byRole = (a: T, b: T) => rank(a.role) - rank(b.role) || byName(a, b);
  const count = (m: T) => attended?.[m.id] ?? 0;
  const cmp = order === 'surname' ? byName
    : order === 'attended-most' && attended ? (a: T, b: T) => count(b) - count(a) || byRole(a, b)
    : order === 'attended-least' && attended ? (a: T, b: T) => count(a) - count(b) || byRole(a, b)
    : byRole;
  return [...rows].sort(cmp);
}
