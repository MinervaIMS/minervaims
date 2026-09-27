import { CHECKIN_PREFIX, isRenderableToken } from '../_shared/checkin.ts';
import { qrPng } from './png.ts';

// =====================================================================
// checkin-qr: the image of a ticket, for the event emails.
// GET ?t=<token>  →  a PNG of the QR code `MIMS-CHECKIN:<token>`.
//
// Public, because a mail app fetches it without signing in, and harmless
// for the same reason: it draws the code it is given and reads nothing
// from the database. Knowing a token lets nobody do anything; checking a
// person in needs full access to Events, Attendance (admin-event-reg).
// `t=sample` draws the placeholder used by previews and test emails.
// =====================================================================

const headers = { 'Access-Control-Allow-Origin': '*' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  const t = new URL(req.url).searchParams.get('t');
  if (!isRenderableToken(t)) return new Response('Not a ticket', { status: 404, headers });
  try {
    const png = await qrPng(`${CHECKIN_PREFIX}${t === 'sample' ? 'sample' : t}`);
    return new Response(png, {
      headers: {
        ...headers,
        'Content-Type': 'image/png',
        // A ticket never changes: mail apps and proxies may keep it for good.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error('checkin-qr error:', e);
    return new Response('Error', { status: 500, headers });
  }
});
