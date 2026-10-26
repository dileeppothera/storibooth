import { getStore } from '@netlify/blobs';

/**
 * POST { name, phone, event_date, photo_url, source } from the booth form.
 * 1) keeps a durable backup in Netlify Blobs (so a lead is never lost), and
 * 2) appends a row to the Google Sheet via the Apps Script web app URL in
 *    the SHEET_WEBHOOK_URL environment variable (see README §10).
 */
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }

  const str = (v, n) => (v == null ? '' : String(v)).slice(0, n).trim();
  const row = {
    timestamp: new Date().toISOString(),
    name: str(body.name, 120),
    phone: str(body.phone, 40),
    event_date: str(body.event_date, 40),
    photo_url: str(body.photo_url, 600),
    source: str(body.source, 120),
  };
  if (!row.name || !row.phone) return Response.json({ error: 'name and phone required' }, { status: 400 });

  // 1) durable backup — never lose a lead even if the sheet is unreachable
  try {
    const store = getStore('leads');
    await store.setJSON(`${Date.now()}-${Math.round(Math.random() * 1e6)}`, row);
  } catch (_) {}

  // 2) append to the Google Sheet
  const hook = process.env.SHEET_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
    } catch (_) {}
  }

  return Response.json({ ok: true }, { headers: { 'Access-Control-Allow-Origin': '*' } });
};
