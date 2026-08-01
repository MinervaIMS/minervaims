/**
 * Minerva IMS Workspace: Dashboard greeting engine
 *
 * One shared voice. Every member sees the same pool of lines regardless of
 * their role in the society. A first-week analyst, a division head and the
 * President are all addressed as part of the same association.
 *
 * Resolution order:
 *   1. Special block (date range)  overrides everything
 *   2. Period line (month + half)  everyone
 *
 * Halves: early = days 1 to 15, late = day 16 to end of month.
 *
 * The pick is deterministic on userId + year + bucket, so a member sees the
 * same line for a fortnight and two members rarely see the same one.
 *
 * Any line containing a variable that has not loaded is removed from the pool
 * before selection. Never render a greeting with an unresolved placeholder.
 *
 * Variables: {firstName} {memberCount} {alumniCount} {reportsThisSemester}
 *            {reportsAllTime} {readingsCount} {semesterLabel} {semesterOrdinal}
 *
 * {semesterOrdinal} counts the society's semesters since Fall 2019. It is
 * deliberately about Minerva, not about the reader.
 *
 * UK English. No em dashes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Half = 'early' | 'late';

export interface GreetingVars {
  firstName?: string;
  memberCount?: number;
  alumniCount?: number;
  reportsThisSemester?: number;
  reportsAllTime?: number;
  readingsCount?: number;
  semesterLabel?: string;    // e.g. "Fall 2026"
  semesterOrdinal?: string;  // e.g. "15th"
}

// ---------------------------------------------------------------------------
// Special blocks: highest priority
// ---------------------------------------------------------------------------

export const SPECIAL_BLOCKS: Array<{
  key: string;
  match: (month: number, day: number) => boolean;
  lines: string[];
}> = [
  {
    // Summer: 1 July to 15 August. One line only, by design.
    key: 'summer',
    match: (m, d) => m === 7 || (m === 8 && d <= 15),
    lines: [
      "Hope your summer is treating you well, whether you're relaxing somewhere sunny or spending it surrounded by spreadsheets.",
    ],
  },
  {
    // Welcome Week
    key: 'welcome-week',
    match: (m, d) => m === 9 && d <= 10,
    lines: [
      'Welcome Week, {firstName}. Say yes to nearly everything.',
      "Aperitivo weather won't last. Let's enjoy it whilst it does.",
      '{firstName}, our {semesterOrdinal} semester starts here.',
      "Association on Display is coming. Our stand is at its best when we're all on it.",
      '{firstName}, {memberCount} of us and a clean semester ahead.',
      'Nothing due, everyone back. Best week of the year.',
      '{firstName}, this is where {semesterLabel} begins.',
      'New faces on campus and old friends returning. Brilliant week.',
    ],
  },
  {
    // Halloween
    key: 'halloween',
    match: (m, d) => m === 10 && d === 31,
    lines: [
      'Nothing on this page is scarier than exam results. Happy Halloween, {firstName}.',
      "It's Halloween. Close the dashboard and go and enjoy it.",
      '{firstName}, the numbers will still be here tomorrow. Have a good night.',
      'Off you go, {firstName}. Halloween beats a KPI card.',
    ],
  },
  {
    // New Year's Eve
    key: 'nye',
    match: (m, d) => m === 12 && d === 31,
    lines: [
      "Happy New Year's Eve, {firstName}. Go and be with your people.",
      'Last night of the year. Spend it with friends, not with a chart.',
      'Close the laptop, {firstName}. Have a brilliant night.',
      '{firstName}, the numbers rest tonight too. Enjoy every minute.',
      'Buon anno, {firstName}. See you next year.',
      'One year down together. Enjoy tonight.',
    ],
  },
  {
    // New Year
    key: 'new-year',
    match: (m, d) => m === 1 && d <= 3,
    lines: [
      'Happy New Year, {firstName}. Family first today, dashboards later.',
      'A new year and nothing to see here. Enjoy the day.',
      'Welcome to the new year, {firstName}. Rest now, we start soon.',
      '{firstName}, first days of the year. Go and enjoy them properly.',
      'Buon anno, {firstName}. Take these days for the people who matter.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Period lines
// ---------------------------------------------------------------------------

export const PERIOD_LINES: Record<number, Record<Half, string[]>> = {
  // ===== SEPTEMBER =====
  9: {
    // 11 to 15 only; days 1 to 10 are handled by the Welcome Week block.
    early: [
      'Lectures are back, {firstName}. So are we!',
      'Association on Display this month. Come and tell people what we do.',
      '{firstName}, the FT before the first lecture. Worth restarting the habit early.',
      'First briefs land soon. Worth being ready, {firstName}.',
      'Our {semesterOrdinal} semester is under way.',
      "{reportsAllTime} reports since 2019. Let's add properly to that this semester.",
      "{firstName}, we're the ones who explain Minerva best. Association on Display is our chance.",
      "Back in Milan, back to it. Let's make this our best semester yet.",
    ],
    late: [
      'Selections are open. Whoever we choose now shapes the next two years.',
      '{firstName}, recruitment is the biggest thing we do all year.',
      "Applications are landing. Let's tell people properly what we do here.",
      '{firstName}, {memberCount} of us today. More by October.',
      'Remember when it was you sending in that application, {firstName}?',
      "Markets don't wait for research to start. Worth keeping an eye on the WSJ.",
      'The Economist on a Sunday morning. Still the best hour of the week, {firstName}.',
    ],
  },

  // ===== OCTOBER =====
  10: {
    early: [
      "Welcome to everyone joining us, {firstName}. We're {memberCount} members strong today.",
      "The new intake is in. Let's show them how we work.",
      'First briefs and first meetings. This is where semesters get built.',
      "{firstName}, the association has just grown. Let's earn it.",
      'Midterms on the horizon. In bocca al lupo to everyone sitting them.',
      '{firstName}, {semesterLabel} properly starts now.',
      'Bigger room, same standards. Welcome aboard, everyone.',
      'New members, first drafts, and plenty going on in the markets. Proper good month.',
    ],
    late: [
      'Midterms are here, {firstName}. In bocca al lupo.',
      'Exams first. The reports will keep.',
      'Good luck to everyone sitting exams. Then back to the good part.',
      "{firstName}, long hours in the library ahead. We're all in the same one.",
      'Exams now, November next. The second one is considerably better.',
      '{firstName}, a Bloomberg podcast on the walk to campus still counts as keeping up.',
      'Coffee, notes, repeat. It passes quicker than it feels.',
      'Ten minutes with the FT still counts, {firstName}. Even in exam week.',
    ],
  },

  // ===== NOVEMBER =====
  11: {
    early: [
      '{firstName}, this is our month. Reports, events, and more.',
      "November is where the semester gets made. Let's do it properly.",
      '{firstName}, {reportsThisSemester} reports in so far. The best ones land this month.',
      'The fog arrives and the work peaks. Very Milanese.',
      '{firstName}, this is the month of the year people remember us for.',
      'Fund reports, research, events. All of it, now.',
      '{firstName}, loads moving in the markets. Good month to be writing about them.',
      'Full calendar and good company. Enjoy it, {firstName}.',
    ],
    late: [
      "{firstName}, deadlines are close. Let's finish these properly.",
      'Final drafts and team meetings. Strong month.',
      '{firstName}, this is the stretch that shows up in the reports.',
      "Nearly there on this round. Let's keep the standard high.",
      'Events, edits and dark evenings. Worth every hour.',
      "{reportsAllTime} reports all time. Let's move that number, {firstName}.",
      'Busy weeks, {firstName}. Worth asking your team whether anyone needs a hand.',
      '{firstName}, push through these two weeks. December is kinder.',
      'Rain outside, studying inside. Classic November.',
    ],
  },

  // ===== DECEMBER =====
  12: {
    early: [
      "{firstName}, lectures wind down and exams begin. Let's close cleanly.",
      "Last weeks of teaching. Time to tie up what's open.",
      '{firstName}, exams from here. In bocca al lupo.',
      '{firstName}, one stretch left in {semesterLabel}.',
      'Exams first, {firstName}. The panettone tastes better afterwards.',
      "{firstName}, good semester behind us. Let's land it.",
      '{firstName}, ten minutes with the FT before revision. It adds up.',
    ],
    late: [
      "{firstName}, that's the semester. Enjoy Christmas properly.",
      'Wherever home is, go and enjoy it.',
      'Close the laptop, {firstName}. Family first for a couple of weeks.',
      "Buone feste, {firstName}. We've earnt them.",
      '{reportsThisSemester} reports this semester. Well done to us all!',
      'Buon Natale, {firstName}. See you in the new year.',
      'Lights up, calendar empty, people to see. Perfect.',
      "Merry Christmas to everyone, wherever you're spending it.",
    ],
  },

  // ===== JANUARY =====
  1: {
    // 4 to 15; days 1 to 3 are handled by the New Year block.
    early: [
      'Exams time, {firstName}. In bocca al lupo!',
      "Head down. January's short.",
      '{firstName}, the library becomes our second home this month. Good luck.',
      "Exams now, new semester soon. Let's keep going.",
      '{firstName}, good luck with everything this month.',
      'Quiet weeks for the association, busy ones in the library.',
      '{firstName}, we all get through this one together.',
      'Bloomberg between one exam and the next, {firstName}. Keeps the mind in the market.',
    ],
    late: [
      'Last exams, {firstName}. Almost through.',
      "Nearly done. February's a fresh start.",
      "Final stretch, {firstName}. Let's get this done.",
      'Exams end and we start again. Not long now.',
      "One more push and January's behind us.",
      'Our next semester together starts soon, {firstName}.',
      '{firstName}, try a news podcast between revision sessions. The markets have been busy.',
      '{firstName}, the WSJ still runs whilst we revise. Worth a glance.',
    ],
  },

  // ===== FEBRUARY =====
  2: {
    early: [
      "New semester, {firstName}. Cold outside, but let's get going.",
      "Fresh semester, {firstName}. Piano piano, but let's start.",
      '{firstName}, {semesterLabel} begins.',
      'Back on campus. Good to have everyone around again.',
      "{firstName}, our {semesterOrdinal} semester. Let's make it one of the good ones.",
      'A new semester and new briefs, {firstName}. Plenty to get stuck into.',
      '{firstName}, worth catching up on the FT whilst the calendar is still kind.',
      'New semester, {firstName}. Good moment to get back into The Economist.',
    ],
    late: [
      "{firstName}, the semester's warming up. So is the work.",
      "Everything's moving again. Best feeling of the semester.",
      '{memberCount} of us, one semester, and plenty worth writing about.',
      "Let's build some momentum, {firstName}.",
      'What we start now is what we publish in April.',
      "Markets have moved since December. You'd better be up to date, {firstName}.",
      '{firstName}, a Bloomberg podcast on the way to Bocconi. Easiest habit we have.',
      'The FT before lectures, {firstName}. Small habit, big difference.',
    ],
  },

  // ===== MARCH =====
  3: {
    early: [
      'New members joining us, {firstName}. Smaller intake, same welcome.',
      'Spring intake and first drafts. Busy again, and all the better for it.',
      'Welcome to everyone joining us this month, {firstName}.',
      '{firstName}, {memberCount} of us today. Growing again.',
      'March, and the next round of reports is already taking shape.',
      'Good month to get ahead of April, {firstName}.',
      'New faces in every division. March always surprises us.',
      '{firstName}, plenty in the WSJ this week. Worth a read before the next brief.',
    ],
    late: [
      "Semester's in full flow. Let's keep it there.",
      'Good work happening across every division.',
      "{reportsAllTime} reports and counting, {firstName}. Let's keep going!",
      "Let's keep the pace, {firstName}. April is a big one.",
      'Plenty going on in the markets. Good time to have The Economist to hand, {firstName}.',
      '{firstName}, ten minutes with the FT each morning. It shows in the writing.',
      'Bloomberg on the tram, {firstName}. Free education.',
      'Markets rarely stand still in March. Worth staying close to them, {firstName}.',
    ],
  },

  // ===== APRIL =====
  4: {
    early: [
      "{firstName}, a demanding month. Let's make it a great one.",
      "Reports, events and lectures all at once. This is when we're at our best.",
      '{firstName}, April asks a lot of us, and gives back more.',
      'Busy weeks ahead. Every one of our {alumniCount} alumni got through them too.',
      "{firstName}, plenty on this month. Let's help each other through it.",
      "Our biggest month of the semester. Let's do it justice.",
      "Every division is publishing this month. Let's make it count.",
      '{firstName}, the FT before the day starts. Even in April.',
    ],
    late: [
      '{firstName}, deadlines everywhere, but Milan in spring makes up for it.',
      "Second half of April. Let's push the reports through.",
      '{firstName}, warm evenings and open drafts. Both deserve their time.',
      "Good work this month, {firstName}. Let's finish it.",
      '{firstName}, final push on this round of reports.',
      'Almost there. Worth asking your team whether anyone needs a hand.',
      'The Economist this weekend, {firstName}. Worth the hour.',
      '{firstName}, markets have been moving. Keep up with them where you can.',
    ],
  },

  // ===== MAY =====
  5: {
    early: [
      "{firstName}, spring's here and the work's nearly done.",
      'A few last things to close, {firstName}. Then the books.',
      "The semester is winding down. Let's give it a strong finish.",
      "Strong semester behind us, {firstName}. Let's land the last of it.",
      '{firstName}, {reportsThisSemester} reports this semester. Good going, all of us.',
      '{firstName}, May in Milan. Enjoy it before the library calls.',
      'Last activities of the semester. Worth showing up for.',
      '{firstName}, a Bloomberg podcast in the sun. Best of both.',
    ],
    late: [
      "{firstName}, the summer session is on the horizon. Let's get ready in good time.",
      "Semester's done. Nice work, everyone.",
      "That's the semester. {reportsThisSemester} reports on the board.",
      "{firstName}, summer's close. So are the exams.",
      'Wrapping up. Good semester, all of us.',
      '{firstName}, {semesterOrdinal} semester nearly in the books.',
      "Worth saying the thank yous now, whilst we're all still around.",
      'The FT still deserves ten minutes a day, {firstName}. Even now.',
    ],
  },

  // ===== JUNE =====
  6: {
    early: [
      '{firstName}, exams or first weeks at a desk. Either way, a good month to grow.',
      'Studying or working, June rewards the effort.',
      '{firstName}, in bocca al lupo to everyone with exams.',
      'Head down, {firstName}. In the long run everything pays off.',
      '{alumniCount} alumni sat exactly where you are now, {firstName}. Every one of them got through it.',
      "A whole academic year behind us, {firstName}. Look at what we've built together.",
      '{firstName}, The Economist between one exam and the next.',
      "Markets don't sit exams, {firstName}. Keep an eye on the WSJ.",
    ],
    late: [
      '{firstName}, last exams. Then summer.',
      'Nearly through. In bocca al lupo.',
      '{firstName}, finish strong. Then switch off.',
      "Almost there. Summer's worth it.",
      'End of June. Good work this year, everyone.',
      "{firstName}, that's the academic year done.",
      '{firstName}, rest is part of the job too.',
      "Wherever you're headed this summer, make the most of it.",
    ],
  },

  // ===== JULY and AUGUST 1 to 15 are handled by the summer block =====
  7: { early: [], late: [] },

  // ===== AUGUST =====
  8: {
    early: [], // handled by the summer block
    late: [
      "{firstName}, September's close. Enjoy the last of the quiet.",
      'Nearly back. Rest whilst you can.',
      "{firstName}, one more stretch of summer. Let's use it.",
      'Recruitment, reports, events. All of it starts soon.',
      'See you on campus shortly, {firstName}.',
      'Last of the summer. Then we go again.',
      'A new semester starts in a few weeks, {firstName}.',
      '{firstName}, the markets have moved this summer. Worth a catch-up before the semester starts.',
    ],
  },
};

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

const TOKEN = /\{(\w+)\}/g;

/** Ordinal for the society's semester count, e.g. 15 -> "15th". */
export function semesterOrdinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** Stable non-cryptographic hash. */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normaliseFirstName(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes('@')) return undefined;
  const first = trimmed.split(/\s+/)[0];
  return first.length ? first : undefined;
}

function resolvable(line: string, vars: Record<string, unknown>): boolean {
  const tokens = line.match(TOKEN) ?? [];
  return tokens.every(t => {
    const v = vars[t.slice(1, -1)];
    return v !== undefined && v !== null && v !== '';
  });
}

export function pickGreeting(
  now: Date,
  userId: string,
  vars: GreetingVars,
): string {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const half: Half = day <= 15 ? 'early' : 'late';

  const resolved: Record<string, unknown> = {
    ...vars,
    firstName: normaliseFirstName(vars.firstName),
  };

  const special = SPECIAL_BLOCKS.find(b => b.match(month, day));
  const pool = special ? special.lines : PERIOD_LINES[month][half];
  const bucketKey = special
    ? `${now.getFullYear()}-${special.key}`
    : `${now.getFullYear()}-${month}-${half}`;

  const usable = pool.filter(l => resolvable(l, resolved));
  if (!usable.length) return 'Welcome back.';

  const line = usable[hash(userId + bucketKey) % usable.length];
  return line.replace(TOKEN, (_, key: string) => String(resolved[key]));
}
