/** A date deadline expires at the end of that day in Rome. */
export function firstFeeDeadlineExpired(first: string | null | undefined, now = new Date()): boolean {
  if (!first) return false;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return today > first.slice(0, 10);
}
