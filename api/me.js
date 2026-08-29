import { handleOptions, json } from '../lib/http.js';
import { requireUser } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

export async function GET(req) {
  if (handleOptions(req)) return handleOptions(req);

  const { user, error } = await requireUser(req);
  if (error) return json(error, error.status);

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return json({ user: { id: user.id, email: user.email, profile } });
}