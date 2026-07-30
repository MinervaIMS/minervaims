// =====================================================================
// file-download — one place that decides what a saved file is CALLED.
// ---------------------------------------------------------------------
// Browsers name a download after the URL's last path segment unless they
// are told otherwise, which is why reports used to land in the Downloads
// folder as "3f9c1e2a-....pdf" instead of their title. The `download`
// attribute only works same-origin, and report files are served from
// Supabase storage (a different origin), so the attribute alone is
// ignored. Fetching the bytes and saving them from a blob URL puts the
// file on the same origin as the page, and the chosen name is honoured
// everywhere. If the fetch is blocked, the direct link is still opened so
// the user is never left without the file.
// =====================================================================

/** Turn a human title into a safe, readable file name (no extension). */
export function safeFileName(title: string, fallback = 'document'): string {
  const cleaned = (title || '')
    .replace(/[\\/:*?"<>|]+/g, ' ')   // characters no file system accepts
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

/** Extension of a URL path (without the dot), defaulting to `pdf`. */
export function extensionOf(url: string, fallback = 'pdf'): string {
  try {
    const path = new URL(url, window.location.origin).pathname;
    const m = path.match(/\.([a-z0-9]{1,8})$/i);
    return m ? m[1].toLowerCase() : fallback;
  } catch {
    const m = url.split('?')[0].match(/\.([a-z0-9]{1,8})$/i);
    return m ? m[1].toLowerCase() : fallback;
  }
}

/** Compose "<title>.<ext>", deriving the extension from the URL. */
export function downloadNameFor(title: string, url: string, fallbackExt = 'pdf'): string {
  return `${safeFileName(title)}.${extensionOf(url, fallbackExt)}`;
}

/**
 * Save `url` to disk under `filename`, whatever the origin serving it.
 * Returns true when the blob path was used (the name is guaranteed) and
 * false when it fell back to a plain navigation.
 */
export async function downloadAs(url: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Give the browser a moment to start reading the blob before releasing it.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return true;
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return false;
  }
}

/** Convenience: save a titled document (report, template, attachment). */
export function downloadTitled(url: string, title: string, fallbackExt = 'pdf'): Promise<boolean> {
  return downloadAs(url, downloadNameFor(title, url, fallbackExt));
}
