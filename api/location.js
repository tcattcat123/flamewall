import { supabase, admin } from '../lib/supabase.js';
import { handleOptions, json, readJson, options } from '../lib/http.js';

export { options as OPTIONS };

export async function POST(req) {
  const opt = handleOptions(req);
  if (opt) return opt;

  const body = await readJson(req);
  const postId = String(body.post_id || '');
  const lat = parseFloat(body.lat);
  const lng = parseFloat(body.lng);
  const userId = String(body.user_id || '');

  if (!postId) return json({ error: 'post_id is required' }, 400);
  if (isNaN(lat) || isNaN(lng)) return json({ error: 'lat and lng must be numbers' }, 400);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return json({ error: 'user_id (anonymous uuid) is required' }, 400);
  }

  const { error } = await admin
    .from('posts')
    .update({ lat, lng })
    .eq('id', postId);

  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, lat, lng });
}