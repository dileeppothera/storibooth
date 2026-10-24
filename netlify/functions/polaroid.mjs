import { getStore } from '@netlify/blobs';

/** GET /p/:id → serves the stored Polaroid JPEG. */
export const config = { path: '/p/:id' };

export default async (_req, context) => {
  const id = context.params.id.replace(/\.jpg$/, '');
  const store = getStore('polaroids');
  const data = await store.get(id, { type: 'arrayBuffer' });
  if (!data) return new Response('Not found', { status: 404 });
  return new Response(data, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
};
