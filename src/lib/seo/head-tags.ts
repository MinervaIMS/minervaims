// =====================================================================
// A PAGE'S HEAD, WORKED OUT ONCE (Step 109).
// ---------------------------------------------------------------------
// The title, the description, the canonical address, the robots rule and
// the whole sharing card (Open Graph and Twitter) of a page, computed by
// one function that both the app's Seo component and the build's static
// pages call (vite.static-pages.ts). A link preview read from the HTML the
// server sends and the tags the app writes once it has started are
// therefore the same tags, word for word: what a machine reads is what
// the page says (AGENTS.md).
//
// Only relative imports: the build reads this file.
// =====================================================================

import { fullTitle } from './head';
import { SITE_NAME, SITE_LOCALE, absoluteUrl, canonicalPath } from './site';
import {
  SHARE_IMAGE_HEIGHT, SHARE_IMAGE_TYPE, SHARE_IMAGE_WIDTH, shareCardForPath, shareImageAlt, shareImagePath,
} from './share-cards';

export const ROBOTS_INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
export const ROBOTS_NOINDEX = 'noindex, nofollow';

export interface HeadInput {
  /** The page's address (its canonical form is used). */
  path: string;
  /** The title, without the Society's name: fullTitle() adds it. */
  title: string;
  /** The exact <title>, where a page writes its own (the workspace). */
  documentTitle?: string;
  description: string;
  /** A friendlier title for the sharing card. */
  socialTitle?: string;
  /** The card's line, where it should say more than the search snippet. */
  socialDescription?: string;
  /** The picture's card (lib/seo/share-cards.ts); the address's own otherwise. */
  card?: string;
  /** An explicit picture, absolute or site-relative, instead of a card. */
  image?: string;
  noindex?: boolean;
}

export interface HeadTags {
  title: string;
  description: string;
  robots: string;
  /** Absent on a page that is not to be indexed (Seo explains why). */
  canonical: string | null;
  /** The Open Graph and Twitter tags, in the order they are written. */
  meta: { attr: 'property' | 'name'; key: string; content: string }[];
}

export function headTags(input: HeadInput): HeadTags {
  const path = canonicalPath(input.path);
  const url = absoluteUrl(path);
  const card = input.card ?? shareCardForPath(path);
  const image = absoluteUrl(input.image ?? shareImagePath(card));
  const alt = shareImageAlt(card);
  const socialTitle = fullTitle(input.socialTitle ?? input.title);
  const socialDescription = input.socialDescription ?? input.description;
  const p = (key: string, content: string) => ({ attr: 'property' as const, key, content });
  const n = (key: string, content: string) => ({ attr: 'name' as const, key, content });
  return {
    title: input.documentTitle ?? fullTitle(input.title),
    description: input.description,
    robots: input.noindex ? ROBOTS_NOINDEX : ROBOTS_INDEX,
    canonical: input.noindex ? null : url,
    meta: [
      p('og:type', 'website'),
      p('og:site_name', SITE_NAME),
      p('og:locale', SITE_LOCALE),
      p('og:url', url),
      p('og:title', socialTitle),
      p('og:description', socialDescription),
      p('og:image', image),
      p('og:image:secure_url', image),
      p('og:image:type', SHARE_IMAGE_TYPE),
      p('og:image:width', String(SHARE_IMAGE_WIDTH)),
      p('og:image:height', String(SHARE_IMAGE_HEIGHT)),
      p('og:image:alt', alt),
      // A large card where a link is shared on X. The Society has no X
      // account, so no twitter:site names one (Step 94B).
      n('twitter:card', 'summary_large_image'),
      n('twitter:title', socialTitle),
      n('twitter:description', socialDescription),
      n('twitter:image', image),
      n('twitter:image:alt', alt),
    ],
  };
}

/** Text that is safe inside an HTML attribute or element. */
const esc = (s: string): string => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const reKey = (s: string) => s.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&');

/**
 * Write a page's head into the app's index.html: every tag the app owns
 * (those carrying data-rh, which react-helmet-async takes over when the
 * app starts) is replaced where it is and added before </head> where it
 * is not, so the page never carries two of one tag.
 */
export function applyHeadTags(html: string, tags: HeadTags): string {
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(tags.title)}</title>`);
  const set = (attr: 'name' | 'property', key: string, value: string) => {
    const re = new RegExp(`<meta(?: data-rh="true")? ${attr}="${reKey(key)}" content="[^"]*"\\s*/?>`);
    const tag = `<meta data-rh="true" ${attr}="${key}" content="${esc(value)}" />`;
    out = re.test(out) ? out.replace(re, tag) : out.replace('</head>', `  ${tag}\n  </head>`);
  };
  set('name', 'description', tags.description);
  set('name', 'robots', tags.robots);
  const canonicalRe = /<link data-rh="true" rel="canonical" href="[^"]*"\s*\/?>\n?\s*/;
  if (tags.canonical) {
    const link = `<link data-rh="true" rel="canonical" href="${esc(tags.canonical)}" />`;
    out = canonicalRe.test(out) ? out.replace(/<link data-rh="true" rel="canonical" href="[^"]*"\s*\/?>/, link) : out.replace('</head>', `  ${link}\n  </head>`);
  } else {
    out = out.replace(canonicalRe, '');
  }
  for (const m of tags.meta) set(m.attr, m.key, m.content);
  return out;
}
