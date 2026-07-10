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
  if (html.includes('class="mims-shell"')) return html;

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
  return out;
}
