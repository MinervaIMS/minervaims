// Italian national public holidays. Dates match the DB-side
// public.italian_holiday_on() function, which HARD BLOCKS scheduling on
// these days across events, interview slots, AoD, alumni calls and
// meeting/social calendar entries. This client copy is display-only.

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Easter Sunday for a given year (Gregorian, Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export interface Holiday { date: string; label: string }

export function italianHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const easterMon = new Date(easter); easterMon.setDate(easter.getDate() + 1);
  const fmt = (d: Date) => iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return [
    { date: iso(year, 1, 1),  label: "New Year's Day" },
    { date: iso(year, 1, 6),  label: 'Epiphany' },
    { date: fmt(easter),      label: 'Easter Sunday' },
    { date: fmt(easterMon),   label: 'Easter Monday' },
    { date: iso(year, 4, 25), label: 'Liberation Day' },
    { date: iso(year, 5, 1),  label: 'Labour Day' },
    { date: iso(year, 6, 2),  label: 'Republic Day' },
    { date: iso(year, 8, 15), label: 'Assumption of Mary' },
    { date: iso(year, 11, 1), label: "All Saints' Day" },
    { date: iso(year, 12, 8), label: 'Immaculate Conception' },
    { date: iso(year, 12, 25),label: 'Christmas Day' },
    { date: iso(year, 12, 26),label: "St. Stephen's Day" },
  ];
}

/** yyyy-mm-dd → holiday label or null. */
export function italianHolidayOn(date: string): string | null {
  const y = Number(date.slice(0, 4));
  if (!Number.isFinite(y)) return null;
  const hit = italianHolidays(y).find((h) => h.date === date);
  return hit ? hit.label : null;
}
