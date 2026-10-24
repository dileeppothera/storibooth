import { getStore } from '@netlify/blobs';

/**
 * POST a JPEG body (Content-Type: image/jpeg) → stores the Polaroid and
 * returns { url } pointing at a public, long-lived image link.
 * Used by the booth's "Send to WhatsApp" so the chat opens addressed to us
 * with a link to the guest's Polaroid.
 */
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) {
    return Response.json({ error: 'empty or too large' }, { status: 400 });
  }
  const id = crypto.randomUUID().replace(/-/g, '');
  const store = getStore('polaroids');
  await store.set(id, bytes, { metadata: { contentType: 'image/jpeg' } });

  const origin = new URL(req.url).origin;
  // .jpg suffix so WhatsApp renders an image preview of the shared link
  return Response.json({ url: `${origin}/p/${id}.jpg` }, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
};
