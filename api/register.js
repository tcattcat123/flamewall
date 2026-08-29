import { supabase } from '../lib/supabase.js';
import { handleOptions, json, readJson } from '../lib/http.js';

export async function POST(req) {
  const opt = handleOptions(req);
  if (opt) return opt;

  const body = await readJson(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const username = String(body.username || '').trim().replace(/[^a-zA-Z0-9_]/g, '');
  const displayName = String(body.display_name || username || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email' }, 400);
  }
  if (password.length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, 400);
  }
  if (username.length < 3 || username.length > 20) {
    return json({ error: 'Username must be 3-20 characters (letters, numbers, _)' }, 400);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: displayName || username },
    },
  });

  if (error) {
    const status = error.message.toLowerCase().includes('already registered') ? 409 : 400;
    return json({ error: error.message }, status);
  }

  const user = data.user;
  if (user.identities && user.identities.length === 0) {
    return json({ error: 'Email already registered. Try to sign in.' }, 409);
  }

  return json(
    {
      user: { id: user.id, email: user.email },
      session: data.session,
    },
    201
  );
}
