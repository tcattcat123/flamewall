import { supabase, admin } from '../lib/supabase.js';
import { handleOptions, json, readJson } from '../lib/http.js';
import { requireUser } from '../lib/auth.js';

const POST_PRICE_CENTS = Number(process.env.POST_PRICE_CENTS || 100);

export async function POST(req) {
  const opt = handleOptions(req);
  if (opt) return opt;

  const { user, error } = await requireUser(req);
  if (error) return json(error, error.status);

  const body = await readJson(req);
  const text = String(body.text || '').trim();
  const link = String(body.link || '').trim();
  const authorName = String(body.author_name || user.user_metadata?.username || 'anonymous').trim();

  if (!text || text.length > 200) {
    return json({ error: 'Text is required (max 200 chars)' }, 400);
  }
  if (link && !/^https?:\/\//i.test(link)) {
    return json({ error: 'Link must start with http(s)://' }, 400);
  }

  // TODO: integrate real payment gateway here.
  const paymentConfirmed = body.demo_payment === true || process.env.DEMO_MODE === 'true';
  if (!paymentConfirmed) {
    return json({ error: `Payment of $${(POST_PRICE_CENTS / 100).toFixed(2)} is required.` }, 402);
  }

  const { data: round } = await supabase
    .from('rounds')
    .select('id, pot_cents')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const roundId = round?.id;
  if (!roundId) {
    return json({ error: 'No active round' }, 409);
  }

  const { data: post, error: insertError } = await admin
    .from('posts')
    .insert({
      round_id: roundId,
      user_id: user.id,
      author_name: authorName,
      text,
      link: link || null,
      paid: true,
    })
    .select('*')
    .single();

  if (insertError) return json({ error: insertError.message }, 500);

  await admin
    .from('rounds')
    .update({ pot_cents: round.pot_cents + POST_PRICE_CENTS })
    .eq('id', roundId);

  return json({ post }, 201);
}