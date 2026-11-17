// =====================================================================
// plain-text.ts: a name is a name (Step 106).
// ---------------------------------------------------------------------
// The emails place a person's name exactly as it was typed. The two
// forms anybody can send (registering for an event, applying) therefore
// keep a name to what a name is: one line of text, no angle brackets,
// which a name never contains and which would otherwise let somebody
// write markup or a link into an email sent in the association's name.
// Every real name reads exactly as before.
// =====================================================================

/** A typed name as plain text: angle brackets removed, one line, bounded. */
export function plainName(value: string | null | undefined, max = 120): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
