// Shared mobile-responsive shell for all Minerva email templates.
//
// Root cause of "text too small on mobile":
// Every template uses <table width="600" style="width:600px;max-width:600px">
// as the outer container. Many mobile clients (iOS Mail, Outlook mobile) will
// NOT shrink a 600px table below its declared width — instead they scale the
// whole message down proportionally, dropping effective body text from 15px
// to ~9–10px. Templates also have no @media rules and use 40px side padding,
// which leaves ~295px of text column on a 375px screen.
//
// Fix: (a) rewrite the outer container to be fluid (width:100%, max-width:600px),
// (b) inject a <style> block with @media rules that bump font sizes and shrink
// side padding under 600px, (c) tag inline-styled elements with class hooks so
// the media query can override them (inline styles beat class selectors, so
// the media query uses !important).

const RESPONSIVE_STYLE = `<style>
body,table,td,p,a,span,div{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
img{-ms-interpolation-mode:bicubic;}
@media only screen and (max-width:600px){
  .mims-shell{width:100%!important;max-width:100%!important;}
  .mims-pad{padding-left:22px!important;padding-right:22px!important;}
  .mims-h1{font-size:26px!important;line-height:1.25!important;}
  .mims-hero-title{font-size:19px!important;line-height:1.3!important;}
  .mims-body{font-size:16px!important;line-height:1.7!important;}
  .mims-small{font-size:13px!important;line-height:1.7!important;}
  .mims-xsmall{font-size:12px!important;line-height:1.7!important;}
  .mims-eyebrow{font-size:10px!important;}
  .mims-btn{display:block!important;width:auto!important;text-align:center!important;}
}
@media (prefers-color-scheme: dark){
  body,.mims-shell{background:#F5F5F5!important;color:#141414!important;}
}
</style>`;

// Original fixed-width container declaration used by every template.
const OUTER_TABLE_RE =
  /<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;">/g;
const OUTER_TABLE_REPLACEMENT =
  '<table role="presentation" class="mims-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E0E0E0;margin:0 auto;">';

// Cells whose inline padding uses 40px on the sides.
const PAD_CELL_RE = /<td style="padding:([^"]*\b40px\b[^"]*)"/g;

// Font-size buckets → class names. Regex captures: (tag)(style-before)(size)(style-after).
type Bucket = { tags: string; sizes: string; cls: string };
const BUCKETS: Bucket[] = [
  { tags: 'p|span|div|td|a',      sizes: '15px',                       cls: 'mims-body' },
  { tags: 'p|span|div|td|a',      sizes: '12px',                       cls: 'mims-small' },
  { tags: 'p|span|div|td|a',      sizes: '11px|10\\.5px|10px',         cls: 'mims-xsmall' },
  { tags: 'p|span|div|td|a',      sizes: '9\\.5px|9px',                cls: 'mims-eyebrow' },
  { tags: 'h1',                   sizes: '32px|31px|30px|29px|28px|27px|26px', cls: 'mims-h1' },
  { tags: 'div|span',             sizes: '21px',                       cls: 'mims-hero-title' },
];

function applyBucket(html: string, b: Bucket): string {
  const re = new RegExp(
    `<(${b.tags}) style="([^"]*)font-size:(${b.sizes})([^"]*)"`,
    'g',
  );
  return html.replace(re, (_m, tag, before, size, after) =>
    `<${tag} class="${b.cls}" style="${before}font-size:${size}${after}"`,
  );
}

export function withResponsiveShell(html: string): string {
  if (!html || typeof html !== 'string') return html;
  // Guard against double-application (idempotent for retries / re-previews).
  // A body shelled before the dark-mode header existed still gets it.
  if (html.includes('class="mims-shell"')) return withDarkModeHeader(html);

  let out = html;
  // 1. Inject responsive stylesheet into <head> (fall back to prepending if absent).
  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${RESPONSIVE_STYLE}\n</head>`);
  } else {
    out = `${RESPONSIVE_STYLE}\n${out}`;
  }
  // 2. Convert the fixed 600px outer table into a fluid container.
  out = out.replace(OUTER_TABLE_RE, OUTER_TABLE_REPLACEMENT);
  // 3. Add mims-pad hook to 40px-side-padding cells.
  out = out.replace(PAD_CELL_RE, '<td class="mims-pad" style="padding:$1"');
  // 4. Add font-size class hooks so the media query can override inline sizes.
  for (const b of BUCKETS) out = applyBucket(out, b);
  return withDarkModeHeader(out);
}

// =====================================================================
// THE HEADER IN DARK MODE.
// ---------------------------------------------------------------------
// The emails ask to stay light ("light only"), and Apple Mail does. Some
// clients darken them anyway: Outlook recolours the text (the dark purple
// society name turns pink) and leaves the transparent purple logo on a
// dark background, where it cannot be seen; the Gmail apps do the same.
//
// Three layers, each safe where the others do not apply:
// 1. The default logo carries a thin white outline. On the white header
//    it is invisible, so light mode looks exactly as before; where a
//    client darkens the page without reading any CSS (the Gmail apps),
//    the outline keeps the logo readable.
// 2. Outlook marks what it darkened with [data-ogsc]. There, the white
//    logo replaces the purple one and the society name is set in white.
// 3. Clients that read the dark-mode media query get the same white logo
//    and name on a deep purple masthead that continues the strip above
//    it, so they read on whatever background the client paints.
// The white logo is hidden inline and wrapped away from Outlook for
// Windows, so a client that strips the <style> block never shows it.
// Its own <style> block: a client that rejects one rule drops that block
// only, never the responsive one.
// =====================================================================

export const EMAIL_LOGO_LIGHT_URL = 'https://minervaims.org/email/minerva-logo-light.png';
export const EMAIL_LOGO_DARK_URL = 'https://minervaims.org/email/minerva-logo-dark.png';

const LEGACY_LOGO_URL =
  'https://minervaims.org/__l5e/assets-v1/c3b55bfa-5266-4923-984e-74243ab40e3b/minerva-email-logo.png';

const DARK_STYLE = `<style>
@media (prefers-color-scheme: dark){
  .mims-mast{background:#1F0F4D!important;border-bottom-color:#1F0F4D!important;}
  .mims-rule{border-left-color:#5E5288!important;}
  .mims-logo-light{display:none!important;}
  .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
  .mims-brand{color:#FFFFFF!important;}
}
[data-ogsc] .mims-logo-light{display:none!important;}
[data-ogsc] .mims-logo-dark{display:block!important;max-height:none!important;max-width:none!important;overflow:visible!important;}
[data-ogsc] .mims-brand{color:#FFFFFF!important;}
</style>`;

const LOGO_IMG =
  `<img src="${LEGACY_LOGO_URL}" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" />`;
const LOGO_PAIR =
  `<img class="mims-logo-light" src="${EMAIL_LOGO_LIGHT_URL}" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" />` +
  `<!--[if !mso]><!--><div class="mims-logo-dark" style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;">` +
  `<img src="${EMAIL_LOGO_DARK_URL}" width="60" height="60" alt="Minerva IMS" style="display:block;width:60px;height:60px;border:0;" />` +
  `</div><!--<![endif]-->`;

const MAST_CELL = '<td class="mims-pad" style="padding:30px 40px 22px;border-bottom:1px solid #E0E0E0;">';
const RULE_CELL = '<td style="vertical-align:middle;border-left:1px solid #E0E0E0;padding-left:14px;">';
const BRAND_DIV =
  `<div class="mims-hero-title" style="font-family:'Times New Roman',Georgia,serif;font-size:21px;line-height:1.29;color:#1F0F4D;letter-spacing:.005em;">Minerva Investment`;

export function withDarkModeHeader(html: string): string {
  if (!html || typeof html !== 'string') return html;
  if (html.includes('mims-logo-dark') || !html.includes(LOGO_IMG)) return html;
  let out = html.split(LOGO_IMG).join(LOGO_PAIR);
  out = out.split(MAST_CELL).join('<td class="mims-pad mims-mast" style="padding:30px 40px 22px;border-bottom:1px solid #E0E0E0;">');
  out = out.split(RULE_CELL).join('<td class="mims-rule" style="vertical-align:middle;border-left:1px solid #E0E0E0;padding-left:14px;">');
  out = out.split(BRAND_DIV).join(BRAND_DIV.replace('class="mims-hero-title"', 'class="mims-hero-title mims-brand"'));
  out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${DARK_STYLE}\n</head>`) : `${DARK_STYLE}\n${out}`;
  return out;
}
