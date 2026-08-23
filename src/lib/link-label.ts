// =====================================================================
// link-label — turn a URL into something a colleague can recognise.
// ---------------------------------------------------------------------
// Every resource subsection in the workspace (Templates & repositories,
// MIMS Graphics, Instagram, LinkedIn, Other Resources, External
// Relations, Statute & Documents) lets somebody paste a link. Until now
// the item showed one word for it, the same word for all of them, so a
// list of six links was six identical labels and the only way to learn
// what any of them pointed at was to open it.
//
// WHAT THIS IS NOT. It does not fetch the page. A workspace that made a
// request to every third-party URL somebody had ever pasted would be
// slow, would leak where the association reads, would break on every
// site that refuses cross-origin requests - which is most of them - and
// would need a server to proxy it. None of that is worth it, because
// the URL already carries almost everything a reader needs.
//
// WHAT IT DOES. It reads the URL. The host gives the publication, and
// well-known hosts are named properly rather than as bare domains -
// "Financial Times", not "ft.com". The path gives the subject, if it has
// one: a slug is a title with hyphens in it, which is exactly what one
// needs and no more. The result is a label, a source and the domain, so
// an item can show what the link is, where it comes from, and be checked
// against the address before anybody clicks.
//
// Everything degrades: an unparseable string comes back as itself, and
// the anchor's href is never touched, so a link that this cannot read is
// still a link that works.
// =====================================================================

/**
 * Hosts worth naming properly.
 *
 * Deliberately short, and only entries that would otherwise read badly:
 * abbreviations no one expands in their head (ft, wsj, ssrn), hosts whose
 * domain is not their name (drive.google.com), and the handful of sources
 * this association actually circulates. Anything absent falls back to the
 * domain, tidied - which for most sites is already the right answer.
 */
const KNOWN_HOSTS: Record<string, string> = {
  'ft.com': 'Financial Times',
  'wsj.com': 'The Wall Street Journal',
  'economist.com': 'The Economist',
  'bloomberg.com': 'Bloomberg',
  'reuters.com': 'Reuters',
  'nytimes.com': 'The New York Times',
  'cnbc.com': 'CNBC',
  'marketwatch.com': 'MarketWatch',
  'barrons.com': "Barron's",
  'investopedia.com': 'Investopedia',
  'seekingalpha.com': 'Seeking Alpha',
  'morningstar.com': 'Morningstar',
  'spglobal.com': 'S&P Global',
  'msci.com': 'MSCI',
  'ecb.europa.eu': 'European Central Bank',
  'federalreserve.gov': 'Federal Reserve',
  'imf.org': 'International Monetary Fund',
  'bis.org': 'Bank for International Settlements',
  'oecd.org': 'OECD',
  'worldbank.org': 'World Bank',
  'bancaditalia.it': "Banca d'Italia",
  'istat.it': 'Istat',
  'ssrn.com': 'SSRN',
  'papers.ssrn.com': 'SSRN',
  'arxiv.org': 'arXiv',
  'jstor.org': 'JSTOR',
  'nber.org': 'NBER',
  'github.com': 'GitHub',
  'gitlab.com': 'GitLab',
  'bitbucket.org': 'Bitbucket',
  'colab.research.google.com': 'Google Colab',
  'drive.google.com': 'Google Drive',
  'docs.google.com': 'Google Docs',
  'sheets.google.com': 'Google Sheets',
  'dropbox.com': 'Dropbox',
  'onedrive.live.com': 'OneDrive',
  'sharepoint.com': 'SharePoint',
  'notion.so': 'Notion',
  'figma.com': 'Figma',
  'canva.com': 'Canva',
  'miro.com': 'Miro',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'vimeo.com': 'Vimeo',
  'linkedin.com': 'LinkedIn',
  'instagram.com': 'Instagram',
  'unibocconi.it': 'Bocconi University',
  'minervaims.org': 'Minerva Investment Management Society',
};

/** File extensions worth naming, so a bare PDF link says that it is one. */
const FILE_KINDS: Record<string, string> = {
  pdf: 'PDF', xlsx: 'Spreadsheet', xls: 'Spreadsheet', csv: 'CSV',
  docx: 'Document', doc: 'Document', pptx: 'Slides', ppt: 'Slides',
  zip: 'Archive', ipynb: 'Notebook', py: 'Python', r: 'R script',
};

export interface LinkPreview {
  /** What to show as the link's text. Never empty. */
  label: string;
  /** Where it comes from, e.g. "Financial Times" or "GitHub". */
  source: string;
  /** The bare host, shown small so an address can be checked before clicking. */
  domain: string;
  /** True when the URL could not be parsed and the raw string is being shown. */
  raw: boolean;
}

/** "the-fed-holds-rates_again.html" -> "The fed holds rates again". */
function deslug(segment: string): string {
  const text = decodeURIComponent(segment)
    .replace(/\.[a-z0-9]{1,6}$/i, '')
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Path words that describe the ROUTE rather than the thing at the end of it.
 *
 * Without this the labels came out as "Content", "View", "Edit" and "Abs" -
 * every Financial Times article called "Content", every Drive link called
 * "View" - which is the same fault as calling them all "Link", only harder to
 * spot. When the last segment is one of these the search carries on up the
 * path, and if nothing readable is left the publication's name is used, which
 * is at least true.
 */
const ROUTE_WORDS = new Set([
  'view', 'edit', 'preview', 'open', 'download', 'watch', 'read', 'browse',
  'content', 'contents', 'article', 'articles', 'story', 'stories', 'news',
  'post', 'posts', 'page', 'pages', 'index', 'home', 'main', 'default',
  'file', 'files', 'folder', 'folders', 'document', 'documents', 'doc', 'docs',
  'share', 'shared', 'sharing', 'link', 'links', 'item', 'items',
  'detail', 'details', 'abs', 'pdf', 'html', 'htm', 'php', 'aspx', 'asp',
  'blog', 'video', 'videos', 'media', 'assets', 'static', 'public',
]);

/**
 * A path segment only helps if it reads like words.
 *
 * Storage keys, document ids and hashes are path segments too, and
 * "1a2B3c4D5e6F7g8H9i" is a worse label than the site's own name. The test is
 * blunt on purpose: enough letters, not too long, not a run of random case
 * and digits, and not one of the route words above.
 */
function looksLikeTitle(segment: string): boolean {
  const s = decodeURIComponent(segment).replace(/\.[a-z0-9]{1,6}$/i, '');
  if (s.length < 3 || s.length > 80) return false;
  if (ROUTE_WORDS.has(s.toLowerCase())) return false;
  const letters = (s.match(/[a-zA-Z]/g) || []).length;
  if (letters < 3) return false;
  // A segment that is mostly digits is an id, a date or a page number.
  if (letters / s.length < 0.5) return false;
  // One unbroken run of letters and digits is an id, not a title: "1AbCdEf",
  // "9f8b2c1a". A real title has spacing of some kind, and a real single-word
  // segment ("archive", "outlook") has no digits in it.
  if (!/[-_ ]/.test(s) && /\d/.test(s)) return false;
  return true;
}

/** The registrable-looking part of a host, e.g. "sub.ft.com" -> "ft.com". */
function baseHost(host: string): string {
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  // Two-part public suffixes worth keeping whole.
  const tail3 = parts.slice(-3).join('.');
  if (/\.(co|com|ac|org|gov|net)\.[a-z]{2}$/.test(tail3)) return tail3;
  return parts.slice(-2).join('.');
}

/** Turn a domain into a name: "seekingalpha.com" -> "Seekingalpha". */
function domainName(host: string): string {
  const name = baseHost(host).split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Read a URL into something a person can recognise.
 *
 * `given` is an explicit label somebody typed. It always wins: a human who
 * has said what a link is knows better than any of this.
 */
export function previewLink(rawUrl: string, given?: string | null): LinkPreview {
  const explicit = (given ?? '').trim();
  const value = (rawUrl ?? '').trim();

  let url: URL | null = null;
  try {
    // A pasted address often arrives without a scheme.
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    url = null;
  }

  if (!url || !url.hostname.includes('.')) {
    const fallback = explicit || value || 'Link';
    return { label: fallback, source: '', domain: '', raw: true };
  }

  const host = url.hostname.replace(/^www\./, '');
  const source = KNOWN_HOSTS[host] || KNOWN_HOSTS[baseHost(host)] || domainName(host);

  if (explicit) return { label: explicit, source, domain: host, raw: false };

  const segments = url.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  const extension = /\.([a-z0-9]{1,6})$/i.exec(last)?.[1]?.toLowerCase();
  const kind = extension ? FILE_KINDS[extension] : undefined;

  // A repository reads as owner/name, which is how people refer to one.
  if ((host === 'github.com' || host === 'gitlab.com') && segments.length >= 2) {
    return { label: `${segments[0]}/${segments[1]}`, source, domain: host, raw: false };
  }

  // Otherwise the last segment that reads like words, searching backwards:
  // the deepest part of a path is usually the specific thing.
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (!looksLikeTitle(segments[i])) continue;
    const title = deslug(segments[i]);
    if (!title) continue;
    return {
      label: kind && i === segments.length - 1 ? `${title} (${kind})` : title,
      source,
      domain: host,
      raw: false,
    };
  }

  // Nothing in the path is readable: the publication is the honest answer,
  // and it is still far more than one repeated word for every link.
  return { label: kind ? `${source} ${kind}` : source, source, domain: host, raw: false };
}

/** The one-line form, for places with room for a single string. */
export function linkLabel(rawUrl: string, given?: string | null): string {
  return previewLink(rawUrl, given).label;
}
