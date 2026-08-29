import { supabase } from '../lib/supabase.js';
import { handleOptions, json } from '../lib/http.js';

export async function GET(req) {
  const opt = handleOptions(req);
  if (opt) return opt;

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('votes', { ascending: false });

  if (error) return json({ error: error.message }, 500);
  return json({ posts: data });
}