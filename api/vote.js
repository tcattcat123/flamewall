import { supabase, admin } from '../lib/supabase.js';
import { handleOptions, json, readJson } from '../lib/http.js';
import { requireUser } from '../lib/auth.js';

export async function POST(req) {
  const opt = handleOptions(req);
  if (opt) return opt;

  const { user, error } = await requireUser(req);
  if (error) return json(error, error.status);

  const body = await readJson(req);
  const postId = String(body.post_id || '');

  if (!postId) return json({ error: 'post_id is required' }, 400);

  const { data: existing } = await supabase
    .from('votes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return json({ error: 'Already voted for this post' }, 409);
  }

  const { error: voteError } = await admin.from('votes').insert({
    post_id: postId,
    user_id: user.id,
  });
  if (voteError) return json({ error: voteError.message }, 500);

  const { data, error: incError } = await admin.rpc('increment_post_votes', {
    p_post_id: postId,
  });
  if (incError) return json({ error: incError.message }, 500);

  return json({ votes: data ?? 1 });
}