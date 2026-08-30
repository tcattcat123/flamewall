import { supabase } from '../lib/supabase.js';
import { handleOptions, json, options } from '../lib/http.js';

export { options as OPTIONS };

export async function GET(req) {
  const opt = handleOptions(req);
  if (opt) return opt;

  const { data, error } = await supabase
    .from('rounds')
    .select('*, posts(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') return json({ error: error.message }, 500);

  return json({ round: data || null });
}