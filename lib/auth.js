import { supabase } from './supabase.js';

export async function requireUser(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { error: { status: 401, message: 'Not authorized' } };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { error: { status: 401, message: 'Invalid token' } };
  return { user: data.user };
}
