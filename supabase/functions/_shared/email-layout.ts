// =====================================================================
// email-layout: the one layout every email of the Society uses (Step 96).
// ---------------------------------------------------------------------
// "Less is more": the crest centred over the Society's name and a navy
// line, a heading in Times New Roman, a greeting by first name, two or
// three short sentences, the key facts in one compact
// block, at most one button for what the reader will most likely do next,
// secondary links as plain text, the sign-off, and a centred closure with
// the Society's name, the Privacy Policy, a contact link, an unsubscribe
// line where one is needed, and the Society's disclaimer word for word.
//
// Light and dark: the page reads in light by default; clients that honour
// prefers-color-scheme (Apple Mail, iOS Mail, Outlook for Mac, new Outlook)
// and Outlook's own dark mode ([data-ogsc]/[data-ogsb]) get the website's
// dark tokens and the white logo (Step 77). Clients that force-invert
// (Gmail apps, classic Outlook) keep the outlined logo legible.
//
// Every block is a table row of the shell, so the database's own blocks
// (calendar, join, entry code, cancel...) slot in as variables. The marker
// on <body> tells email-responsive.ts to leave the document as it is.
//
// The plain-text part is written from the same HTML by email-text.ts and
// by public.email_html_to_text in the database, which read the hooks set
// here (m-pre, m-kv-l, m-btn-a): keep them when changing a block.
// =====================================================================

export const LAYOUT_MARK = 'data-mims-layout="2"';

export const T = {
  navy: '#1F0F4D', ink: '#141414', muted: '#737373', line: '#E0E0E0', page: '#FFFFFF', soft: '#F5F5F5',
  // Dark: background 5%, card 8%, secondary 15%, foreground 95%, muted 65%,
  // border 20%, primary hsl(252 68% 60%), accent soft (src/index.css).
  dPage: '#0D0D0D', dSoft: '#262626', dInk: '#F2F2F2', dMuted: '#A6A6A6', dLine: '#333333', dAccent: '#6F54DE', dLink: '#A99ED6',
};
export const SANS = "Calibri,Carlito,'Segoe UI',Helvetica,Arial,sans-serif";
export const SERIF = "'EB Garamond','Times New Roman',Georgia,serif";
/** The heading's face: Times New Roman, which every mail app has. */
export const TITLE = "'Times New Roman',Times,Georgia,serif";
export const SITE = 'https://minervaims.org';
export const CONTACT = 'as.minerva@unibocconi.it';
const LOGO_LIGHT = 'https://minervaims.org/email/minerva-logo-light.png';
const LOGO_DARK = 'https://minervaims.org/email/minerva-logo-dark.png';

/** The Society's disclaimer, as every email has carried it. Word for word. */
export const DISCLAIMER = 'Minerva Investment Management Society is a student association at Bocconi University. Its funds are virtual and maintained for educational purposes only; nothing in this communication constitutes investment advice or an offer of any financial product. MIMS operates independently of Bocconi University.';

const HEAD_STYLE = `<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{border:0;-ms-interpolation-mode:bicubic;}
a{color:${T.navy};}
.m-logo-d{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:620px){
  .m-shell{width:100%!important;}
  .m-pad{padding-left:22px!important;padding-right:22px!important;}
  .m-h1{font-size:25px!important;}
  .m-sc{font-size:11px!important;letter-spacing:.1em!important;}
  .m-btn-t{width:100%!important;}
  .m-btn-a{display:block!important;text-align:center!important;}
  .m-kv-l,.m-kv-v{display:block!important;width:auto!important;padding-left:0!important;}
  .m-kv-l{padding-bottom:0!important;}
  .m-kv-v{padding-top:2px!important;}
  .m-nowrap-s{font-size:15px!important;}
  .m-stack-s{display:block!important;}
  .m-stack-s .m-dot{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .m-page{background:${T.dPage}!important;}
  .m-box{background:${T.dSoft}!important;}
  .m-ink{color:${T.dInk}!important;}
  .m-muted{color:${T.dMuted}!important;}
  .m-line{border-color:${T.dLine}!important;}
  .m-rule{border-color:${T.dAccent}!important;}
  .m-link,.m-ink a,.m-muted a{color:${T.dLink}!important;}
  .m-btn,.m-btn-a{background:${T.dAccent}!important;border-color:${T.dAccent}!important;color:#FFFFFF!important;}
  .m-logo-l{display:none!important;}
  .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .m-ink{color:${T.dInk}!important;}
[data-ogsc] .m-muted{color:${T.dMuted}!important;}
[data-ogsc] .m-link,[data-ogsc] .m-ink a,[data-ogsc] .m-muted a{color:${T.dLink}!important;}
[data-ogsc] .m-logo-l{display:none!important;}
[data-ogsc] .m-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsb] .m-page{background:${T.dPage}!important;}
[data-ogsb] .m-box{background:${T.dSoft}!important;}
[data-ogsb] .m-btn,[data-ogsb] .m-btn-a{background:${T.dAccent}!important;border-color:${T.dAccent}!important;}
[data-ogsb] .m-rule{border-color:${T.dAccent}!important;}
[data-ogsb] .m-line{border-color:${T.dLine}!important;}
</style>`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── Inline pieces ──────────────────────────────────────────────────────

/** A link inside running text: navy and underlined, so it reads without colour too. */
export const a = (href: string, label: string) =>
  `<a class="m-link" href="${href}" style="color:${T.navy};text-decoration:underline;">${label}</a>`;

/** The contact address as a link. */
export const contactLink = () => a(`mailto:${CONTACT}`, CONTACT);

/** A value that must not break across lines (an IBAN, a code). */
export const nowrap = (html: string) => `<span class="m-nowrap-s" style="white-space:nowrap;">${html}</span>`;

const logo = (size: number) =>
  `<img class="m-logo-l" src="${LOGO_LIGHT}" width="${size}" height="${size}" alt="" style="display:block;width:${size}px;height:${size}px;border:0;" />`
  + `<!--[if !mso]><!--><div class="m-logo-d" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="${LOGO_DARK}" width="${size}" height="${size}" alt="" style="display:block;width:${size}px;height:${size}px;border:0;" /></div><!--<![endif]-->`;

// ── Rows of the shell ──────────────────────────────────────────────────

const pad = (inner: string, padding = '0 40px') => `<tr><td class="m-pad" style="padding:${padding};">${inner}</td></tr>`;
const pStyle = (size: number, color: string, margin: string, extra = '') =>
  `margin:${margin};font-family:${SANS};font-size:${size}px;line-height:1.6;color:${color};${extra}`;

/** A paragraph of the body. */
export const para = (html: string) => pad(`<p class="m-ink" style="${pStyle(16, T.ink, '0 0 16px')}">${html}</p>`);

/** A secondary line: smaller and grey, for links that are not the main action. */
export const small = (html: string) => pad(`<p class="m-muted" style="${pStyle(14, T.muted, '0 0 10px')}">${html}</p>`);

/** A short heading inside the body, for a rule the reader must not miss. */
export const subhead = (text: string) =>
  pad(`<p class="m-ink" style="${pStyle(16, T.ink, '8px 0 6px', 'font-weight:700;')}">${text}</p>`);

/** One fact of the key block: the label, then the value. */
export const keyRow = (label: string, value: string) =>
  `<tr><td class="m-kv-l m-muted" valign="top" style="width:104px;padding:6px 12px 6px 0;font-family:${SANS};font-size:14px;line-height:1.5;color:${T.muted};">${label}</td>`
  + `<td class="m-kv-v m-ink" valign="top" style="padding:6px 0;font-family:${SANS};font-size:16px;line-height:1.5;color:${T.ink};">${value}</td></tr>`;

/** The key block around rows already written (keyRow). */
export const keyWrap = (rowsHtml: string, padding = '4px 40px 22px') => pad(
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-rule" style="border-left:2px solid ${T.navy};padding:2px 0 2px 16px;">`
  + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table></td></tr></table>`,
  padding);

/** The key facts: label and value, one per row, behind a thin navy rule. */
export function keyBlock(rows: Array<[string, string]>, padding = '4px 40px 22px'): string {
  return keyWrap(rows.map(([label, value]) => keyRow(label, value)).join(''), padding);
}

/** The one button: the action the reader most likely wants next. */
export function button(label: string, href: string, padding = '6px 40px 22px'): string {
  return pad(
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-btn-t"><tr><td class="m-btn" bgcolor="${T.navy}" style="background:${T.navy};">`
    + `<a class="m-btn-a" href="${href}" style="display:inline-block;padding:13px 24px;border:1px solid ${T.navy};background:${T.navy};font-family:${SANS};font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;">${label}</a>`
    + '</td></tr></table>',
    padding);
}

/** A boxed note on a light grey ground, for a short set of instructions. */
export const box = (inner: string, padding = '4px 40px 22px') =>
  pad(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="m-box" style="background:${T.soft};padding:16px 18px;">${inner}</td></tr></table>`, padding);

/** A paragraph for inside a box or a block (no row of its own). */
export const innerP = (html: string, last = false) =>
  `<p class="m-ink" style="${pStyle(15, T.ink, last ? '0' : '0 0 8px')}">${html}</p>`;

// ── The document ───────────────────────────────────────────────────────

export type Section =
  | { p: string }
  | { small: string }
  | { subhead: string }
  | { key: Array<[string, string]> }
  | { button: [string, string] }
  | { raw: string };

export interface EmailDoc {
  /** The subject, for <title>. */
  subject: string;
  /** The preview line inboxes show after the subject. */
  preheader: string;
  heading: string;
  /** The greeting; null for none. Default "Dear {{first_name}},". */
  greeting?: string | null;
  sections: Section[];
  /** "Kind regards," and the signature lines. */
  signoff?: string;
  signature: string[];
  /** For the optional emails only: what the reader can stop, and why they get it. */
  unsubscribe?: { topic: string; reason: string; label: string };
}

function section(s: Section): string {
  if ('p' in s) return para(s.p);
  if ('small' in s) return small(s.small);
  if ('subhead' in s) return subhead(s.subhead);
  if ('key' in s) return keyBlock(s.key);
  if ('button' in s) return button(s.button[0], s.button[1]);
  return s.raw;
}

function closure(unsub?: EmailDoc['unsubscribe']): string {
  const muted = (size: number, margin: string) => `margin:${margin};font-family:${SANS};font-size:${size}px;line-height:1.6;color:${T.muted};`;
  const link = (href: string, label: string) => `<a class="m-link" href="${href}" style="color:${T.muted};text-decoration:underline;">${label}</a>`;
  const sep = (href: string, label: string) => `<span style="white-space:nowrap;"><span class="m-dot">&nbsp;&middot;&nbsp; </span>${link(href, label)}</span>`;
  return `<tr><td class="m-pad" align="center" style="padding:10px 40px 36px;">`
    + `<p class="m-ink" style="margin:0 0 4px;font-family:${SERIF};font-size:15px;line-height:1.4;letter-spacing:.04em;color:${T.ink};">Minerva Investment Management Society</p>`
    + `<p class="m-muted" style="${muted(12, '0')}">Bocconi University, Milan ${sep(`${SITE}/privacy-policy`, 'Privacy Policy')} ${sep(`mailto:${CONTACT}`, 'Contact')}</p>`
    + (unsub
      ? `<p class="m-muted" style="${muted(12, '10px 0 0')}">${unsub.reason} ${link(`{{unsubscribe_url}}&amp;topic=${unsub.topic}`, unsub.label)}</p>`
      : '')
    + `<p class="m-muted" style="${muted(11, '12px 0 0')}line-height:1.5;">${DISCLAIMER}</p>`
    + '</td></tr>';
}

/** The whole email, ready to be stored: responsive, light and dark. */
export function emailDocument(d: EmailDoc): string {
  const greeting = d.greeting === undefined ? 'Dear {{first_name}},' : d.greeting;
  const body = [
    // The masthead: the crest centred over the Society's name in small
    // capitals, and a thin navy line.
    `<tr><td class="m-pad" align="center" style="padding:34px 40px 0;">`
      + `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center">${logo(52)}</td></tr></table>`
      + `<p class="m-ink m-sc" style="margin:12px 0 0;font-family:${SERIF};font-size:13px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:${T.navy};"><span class="m-ink" style="color:${T.navy};">Minerva Investment Management Society</span></p></td></tr>`,
    pad(`<div class="m-rule" style="border-top:1px solid ${T.navy};font-size:0;line-height:0;">&nbsp;</div>`, '22px 40px 0'),
    pad(`<h1 class="m-h1 m-ink" style="margin:0 0 18px;font-family:${TITLE};font-size:28px;line-height:1.25;font-weight:400;color:${T.ink};">${d.heading}</h1>`, '28px 40px 4px'),
    greeting ? para(greeting) : '',
    ...d.sections.map(section),
    pad(`<p class="m-ink" style="${pStyle(16, T.ink, '0')}">${d.signoff ?? 'Kind regards,'}</p>`
      + d.signature.map((l) => `<p class="m-ink" style="${pStyle(16, T.ink, '0')}">${l}</p>`).join(''), '10px 40px 30px'),
    closure(d.unsubscribe),
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${esc(d.subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>body,table,td,p,a{font-family:Calibri,Arial,sans-serif!important;}</style><![endif]-->
${HEAD_STYLE}
</head>
<body class="m-page" ${LAYOUT_MARK} style="margin:0;padding:0;background:${T.page};">
<div class="m-pre" style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">${d.preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" style="background:${T.page};"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="m-shell m-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${T.page};margin:0 auto;">
${body}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>`;
}
