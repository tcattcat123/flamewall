import { supabase, admin } from '../lib/supabase.js';
import { handleOptions, json, readJson, options } from '../lib/http.js';

export { options as OPTIONS };

export async function POST(req) {
  const opt = handleOptions(req);
  if (opt) return opt;

  const body = await readJson(req);
  const postId = String(body.post_id || '');
  const userId = String(body.user_id || '');

  if (!postId) return json({ error: 'post_id is required' }, 400);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return json({ error: 'user_id (anonymous uuid) is required' }, 400);
  }

  const { data: existing } = await supabase
    .from('votes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return json({ error: 'Already voted for this post' }, 409);
  }

  const { error: voteError } = await admin.from('votes').insert({
    post_id: postId,
    user_id: userId,
  });
  if (voteError) return json({ error: voteError.message }, 500);

  const { data, error: incError } = await admin.rpc('increment_post_votes', {
    p_post_id: postId,
  });
  if (incError) return json({ error: incError.message }, 500);

  return json({ votes: data ?? 1 });
}