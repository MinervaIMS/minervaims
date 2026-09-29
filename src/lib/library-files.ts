// =====================================================================
// library-files: what a file IS, for the workspace's file libraries.
// ---------------------------------------------------------------------
// Instagram, LinkedIn, MIMS Graphics, Other resources, Templates &
// repositories, External relations and Statute & documents are all the
// same store (workspace_resources) drawn by the same library. This
// module is the part of it with no React in it: which kind a file is,
// how to call it, what counts as a match for a search, how to sort, and
// whether a file can be uploaded at all. Pure functions only, so the
// library, the upload dialog and the tests all read one answer.
// =====================================================================

import type { ResourceRow, ResourceSource, ResourceSourceKind } from '@/lib/resources-api';

// ---------------------------------------------------------------------
// File kinds
// ---------------------------------------------------------------------

/** What a single file is, as a person would say it. */
export type FileKind = 'image' | 'video' | 'pdf' | 'doc' | 'sheet' | 'slides' | 'archive' | 'text' | 'other';

const EXT_KIND: Record<string, FileKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', avif: 'image', bmp: 'image', heic: 'image', heif: 'image', svg: 'image',
  mp4: 'video', mov: 'video', webm: 'video', m4v: 'video',
  pdf: 'pdf',
  doc: 'doc', docx: 'doc', odt: 'doc', rtf: 'doc', pages: 'doc',
  xls: 'sheet', xlsx: 'sheet', xlsm: 'sheet', ods: 'sheet', csv: 'sheet', numbers: 'sheet',
  ppt: 'slides', pptx: 'slides', odp: 'slides', key: 'slides',
  zip: 'archive', rar: 'archive', '7z': 'archive',
  txt: 'text', md: 'text',
};

/** The extension of a name or a stored path, lower case, without the dot. */
export function fileExtension(nameOrPath: string | null | undefined): string {
  const clean = String(nameOrPath ?? '').split('?')[0];
  const m = clean.match(/\.([a-z0-9]{1,8})$/i);
  return m ? m[1].toLowerCase() : '';
}

/** The kind of a file source, read from its name first and its path second. */
export function fileKindOf(source: Pick<ResourceSource, 'value' | 'label'>): FileKind {
  const ext = fileExtension(source.label) || fileExtension(source.value);
  return EXT_KIND[ext] ?? 'other';
}

/** The short badge on a file: "PDF", "DOCX", "PNG". Never empty. */
export function fileBadge(source: Pick<ResourceSource, 'value' | 'label'>): string {
  const ext = fileExtension(source.label) || fileExtension(source.value);
  return ext ? ext.toUpperCase() : 'FILE';
}

export const FILE_KIND_LABEL: Record<FileKind, string> = {
  image: 'Image', video: 'Video', pdf: 'PDF', doc: 'Document', sheet: 'Spreadsheet',
  slides: 'Presentation', archive: 'ZIP archive', text: 'Text file', other: 'File',
};

const FILE_KIND_PLURAL: Record<FileKind, string> = {
  image: 'images', video: 'videos', pdf: 'PDFs', doc: 'documents', sheet: 'spreadsheets',
  slides: 'presentations', archive: 'ZIP archives', text: 'text files', other: 'files',
};

// ---------------------------------------------------------------------
// What an item holds, and the filter chips over it
// ---------------------------------------------------------------------

/**
 * The type filters a library offers. An item matches a filter when it
 * holds at least one thing of that type, so a post with a caption and two
 * pictures is found under Images AND under Captions and notes.
 */
export type LibraryFilter = 'images' | 'videos' | 'documents' | 'sheets' | 'slides' | 'archives' | 'links' | 'notes' | 'contacts';

export const LIBRARY_FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: 'images', label: 'Images' },
  { key: 'videos', label: 'Videos' },
  { key: 'documents', label: 'PDFs and documents' },
  { key: 'sheets', label: 'Spreadsheets' },
  { key: 'slides', label: 'Presentations' },
  { key: 'archives', label: 'ZIP archives' },
  { key: 'links', label: 'Links' },
  { key: 'notes', label: 'Texts' },
  { key: 'contacts', label: 'Contacts' },
];

function filterOfFile(kind: FileKind): LibraryFilter {
  switch (kind) {
    case 'image': return 'images';
    case 'video': return 'videos';
    case 'sheet': return 'sheets';
    case 'slides': return 'slides';
    case 'archive': return 'archives';
    default: return 'documents';
  }
}

function filterOfSource(s: ResourceSource): LibraryFilter {
  if (s.kind === 'file') return filterOfFile(fileKindOf(s));
  if (s.kind === 'link') return 'links';
  if (s.kind === 'text') return 'notes';
  return 'contacts';
}

/** Every filter an item answers to. */
export function itemFilters(item: Pick<ResourceRow, 'sources'>): Set<LibraryFilter> {
  return new Set(item.sources.map(filterOfSource));
}

export const filesOf = (item: Pick<ResourceRow, 'sources'>) => item.sources.filter((s) => s.kind === 'file');
export const sourcesOfKind = (item: Pick<ResourceRow, 'sources'>, kind: ResourceSourceKind) => item.sources.filter((s) => s.kind === kind);

/**
 * What an item mainly is, for its tile and the Type column.
 *
 * The first file decides when there is one, because a file is what people
 * come to a library for; then a link, then a text, then a contact. An item
 * that holds several files of different kinds says so.
 */
export type ItemLook = { kind: FileKind | 'link' | 'note' | 'contact'; badge: string; label: string };

export function itemLook(item: Pick<ResourceRow, 'sources'>): ItemLook {
  const files = filesOf(item);
  if (files.length > 0) {
    const kinds = new Set(files.map(fileKindOf));
    const first = files[0];
    const kind = fileKindOf(first);
    if (files.length > 1 && kinds.size > 1) return { kind, badge: `${files.length} FILES`, label: `${files.length} files` };
    if (files.length > 1) return { kind, badge: fileBadge(first), label: `${files.length} ${FILE_KIND_PLURAL[kind]}` };
    return { kind, badge: fileBadge(first), label: FILE_KIND_LABEL[kind] };
  }
  if (item.sources.some((s) => s.kind === 'link')) return { kind: 'link', badge: 'LINK', label: 'Link' };
  if (item.sources.some((s) => s.kind === 'text')) return { kind: 'note', badge: 'TEXT', label: 'Text' };
  return { kind: 'contact', badge: 'CONTACT', label: 'Contact' };
}

/** "2 files, 1 link, 1 text": what is inside, in words. */
export function contentsLine(item: Pick<ResourceRow, 'sources'>): string {
  const n = (k: ResourceSourceKind) => item.sources.filter((s) => s.kind === k).length;
  const parts: string[] = [];
  const add = (count: number, one: string, many: string) => { if (count) parts.push(`${count} ${count === 1 ? one : many}`); };
  add(n('file'), 'file', 'files');
  add(n('link'), 'link', 'links');
  add(n('text'), 'text', 'texts');
  add(n('phone'), 'phone number', 'phone numbers');
  add(n('email'), 'email address', 'email addresses');
  return parts.join(', ');
}

/** The first picture in an item, whose thumbnail stands for it. */
export function coverImage(item: Pick<ResourceRow, 'sources'>): ResourceSource | null {
  return filesOf(item).find((s) => fileKindOf(s) === 'image' && fileExtension(s.label || s.value) !== 'svg') ?? null;
}

// ---------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------

/**
 * A title from a file name: "Minerva_logo-white_v2.png" reads "Minerva logo
 * white v2". Separators become spaces, the extension goes, and the first
 * letter is raised; everything else is kept as the person wrote it, since
 * "IB", "Q4" and "DCF" mean something in that case.
 */
export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[a-z0-9]{1,8}$/i, '');
  const spaced = base.replace(/[_]+/g, ' ').replace(/(\S)-(?=\S)/g, '$1 ').replace(/\s+/g, ' ').trim();
  if (!spaced) return 'Untitled file';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** "2.4 MB", "830 KB". Empty when the size is not known. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

// ---------------------------------------------------------------------
// Uploading: the same rules the server applies, said before the wait
// ---------------------------------------------------------------------

/** The server's ceiling, per file. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * The types the server accepts, by extension. The server decides on the
 * MIME type; this list exists so a refusal can be given at once, with the
 * reason, instead of after the upload.
 */
const ACCEPTED_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'txt', 'csv', 'zip',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'mp4', 'mov', 'webm',
]);

/** The `accept` attribute for the file picker. */
export const ACCEPT_ATTR = Array.from(ACCEPTED_EXT).map((e) => `.${e}`).join(',');

/** The sentence that lists what can be uploaded. */
export const ACCEPTED_SENTENCE = 'Images (PNG, JPG, GIF, WebP), short videos (MP4, MOV, WebM), PDF, Word, Excel, PowerPoint, CSV, text and ZIP, up to 25 MB each.';

/** Why a file cannot be uploaded, or null if it can. */
export function uploadProblem(file: { name: string; size: number }): string | null {
  const ext = fileExtension(file.name);
  if (!ACCEPTED_EXT.has(ext)) {
    return ext === 'svg'
      ? 'SVG files cannot be uploaded for security reasons. Export a PNG, or put the SVG inside a ZIP.'
      : `${ext ? `.${ext}` : 'This'} files are not accepted. Put it inside a ZIP to share it.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) return `Larger than 25 MB (${formatBytes(file.size)}). Compress it, or share it as a link.`;
  if (file.size === 0) return 'The file is empty.';
  return null;
}

// ---------------------------------------------------------------------
// Search and sort
// ---------------------------------------------------------------------

/** Lower case, accents folded, so "attivita" finds "attività". */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Everything a search can match on an item, folded once. */
export function searchText(item: ResourceRow): string {
  return fold([
    item.title,
    item.description ?? '',
    item.author_name ?? '',
    ...item.sources.map((s) => `${s.label ?? ''} ${s.kind === 'file' ? fileBadge(s) : s.value}`),
  ].join(' \u0001 '));
}

/** Every word of the query appears somewhere in the item. */
export function matchesQuery(haystack: string, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return words.every((w) => haystack.includes(w));
}

export type LibrarySort = 'newest' | 'oldest' | 'name' | 'name-desc' | 'type';

export const LIBRARY_SORTS: { key: LibrarySort; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'name', label: 'Name, A to Z' },
  { key: 'name-desc', label: 'Name, Z to A' },
  { key: 'type', label: 'Type' },
];

const collator = typeof Intl !== 'undefined' ? new Intl.Collator('en', { sensitivity: 'base', numeric: true }) : null;
const byName = (a: ResourceRow, b: ResourceRow) => (collator ? collator.compare(a.title, b.title) : a.title.localeCompare(b.title));

export function sortItems(items: ResourceRow[], sort: LibrarySort): ResourceRow[] {
  const out = [...items];
  switch (sort) {
    case 'oldest': return out.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case 'name': return out.sort(byName);
    case 'name-desc': return out.sort((a, b) => byName(b, a));
    case 'type': return out.sort((a, b) => itemLook(a).label.localeCompare(itemLook(b).label) || byName(a, b));
    default: return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

/** "12 Sep 2026". */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' });
}

/** The object path inside the bucket, from a stored path or a legacy public URL. */
export function objectPathOf(fileUrl: string): string {
  const marker = '/workspace-resources/';
  const i = fileUrl.indexOf(marker);
  return (i >= 0 ? fileUrl.slice(i + marker.length) : fileUrl).split('?')[0];
}
