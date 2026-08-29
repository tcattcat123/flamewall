import { supabase } from '../lib/supabase.js';
import { handleOptions, json, readJson } from '../lib/http.js';

export async function POST(req) {
  const opt = handleOptions(req);
  if (opt) return opt;

  const body = await readJson(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return json({ error: 'Email and password are required' }, 400);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return json({ error: error.message }, 401);

  return json({ user: data.user, session: data.session });
}
