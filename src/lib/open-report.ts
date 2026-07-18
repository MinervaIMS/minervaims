// ---------- Open PDF in new tab with custom title ----------
// Shared helper used across the site (homepage Latest Reports, division pages,
// archive page, lightbox cover button, etc.) so every "open report" flow uses
// the same wrapper tab, clean title, and clean download filename.

function sanitizeFilename(t: string): string {
  const cleaned = String(t || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Report';
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]!));
}

function withDownloadParam(url: string, filename: string): string {
  // Supabase Storage public URLs honour ?download=<name> by sending
  // Content-Disposition: attachment; filename="<name>". No CORS needed:
  // the browser navigates to the URL, it does not fetch it via JS.
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}download=${encodeURIComponent(filename)}`;
}

// Mobile browsers (iOS Safari above all) render a PDF inside an <iframe>
// as a single, unscrollable first page. Their NATIVE PDF viewers, reached
// by navigating straight to the file, scroll and zoom perfectly and offer
// share/download built in. So on phones and tablets the wrapper tab is
// skipped entirely.
function isMobileViewer(): boolean {
  const ua = navigator.userAgent || '';
  const iPadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod|Android/i.test(ua) || iPadOs;
}

export function openReportInTab(title: string, url: string) {
  if (!url) return;

  const niceTitle = sanitizeFilename(title);
  const filename = `${niceTitle}.pdf`;
  const downloadUrl = withDownloadParam(url, filename);

  if (isMobileViewer()) {
    // Straight to the PDF: the platform viewer handles scrolling, zooming
    // and sharing far better than anything embeddable.
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  // IMPORTANT: pass no feature string. 'noopener' and 'noreferrer' both
  // force window.open() to return null in Chromium while still opening
  // the tab — that is what produced the orphan about:blank tab + the
  // second fallback tab in the previous behaviour.
  const w = window.open('about:blank', '_blank');
  if (!w) {
    // Genuine popup-block: simulate a user-driven anchor click. A second
    // window.open() here would also be blocked.
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  const safeTitle = escapeHtml(niceTitle);
  const safeUrl = escapeHtml(url);
  const safeDownloadUrl = escapeHtml(downloadUrl);
  const safeFilename = escapeHtml(filename);

  w.document.open();
  w.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<meta name="description" content="${safeTitle}">
<style>
html,body{margin:0;height:100%;background:#1F0F4D;color:#fff;font-family:'Times New Roman',Times,serif;}
.bar{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:#1F0F4D;border-bottom:1px solid rgba(255,255,255,.15);height:56px;box-sizing:border-box;}
.bar h1{margin:0;font-size:18px;font-weight:normal;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:16px;}
.bar a.dl{flex-shrink:0;display:inline-block;padding:8px 18px;background:#fff;color:#1F0F4D;border:1px solid #000;text-decoration:none;font-family:'Times New Roman',Times,serif;font-size:15px;}
.bar a.dl:hover{opacity:.9;}
.stage{position:absolute;top:56px;left:0;right:0;bottom:0;}
iframe{border:0;width:100%;height:100%;display:block;background:#fff;}
</style>
</head>
<body>
<header class="bar"><h1>${safeTitle}</h1><a class="dl" href="${safeDownloadUrl}" download="${safeFilename}">Download</a></header>
<div class="stage"><iframe src="${safeUrl}" title="${safeTitle}" allow="fullscreen"></iframe></div>
<script>
(function(){
  var TITLE=${JSON.stringify(niceTitle)};
  function pin(){if(document.title!==TITLE){document.title=TITLE;}}
  pin();
  try{
    var head=document.head||document.getElementsByTagName('head')[0];
    if(head&&window.MutationObserver){
      new MutationObserver(pin).observe(head,{childList:true,subtree:true,characterData:true});
    }
  }catch(e){}
  setInterval(pin,1000);
  window.addEventListener('focus',pin);
  window.addEventListener('blur',pin);
})();
</script>
</body>
</html>`);
  w.document.close();
  try { w.document.title = niceTitle; } catch (e) {}
}
