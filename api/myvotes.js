import { supabase } from '../lib/supabase.js';
import { handleOptions, json, options } from '../lib/http.js';

export { options as OPTIONS };

export async function GET(req) {
  const opt = handleOptions(req);
  if (opt) return opt;

  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id') || '';

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return json({ error: 'user_id (anonymous uuid) is required' }, 400);
  }

  const { data, error } = await supabase
    .from('votes')
    .select('post_id')
    .eq('user_id', userId);

  if (error) return json({ error: error.message }, 500);

  return json({ post_ids: (data || []).map((v) => v.post_id) });
}