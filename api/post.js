import { supabase, admin } from '../lib/supabase.js';
import { handleOptions, json, readJson } from '../lib/http.js';
import { fetchTweet } from '../lib/tweet.js';

const POST_PRICE_CENTS = Number(process.env.POST_PRICE_CENTS || 100);

export async function POST(req) {
  try {
    const opt = handleOptions(req);
    if (opt) return opt;

    if (!admin) return json({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set' }, 500);

    const body = await readJson(req);
    const text = String(body.text || '').trim();
    const tweetUrl = String(body.tweet_url || '').trim();
    const link = String(body.link || '').trim();
    const authorName = String(body.author_name || 'anonymous').trim();
    const userId = String(body.user_id || '').trim();

    let tweetData = null;
    if (tweetUrl) {
      tweetData = await fetchTweet(tweetUrl);
    }

    const finalText = tweetData ? tweetData.text.slice(0, 200) : text;
    const finalLink = tweetData ? tweetData.link : link;
    const finalAuthor = tweetData ? tweetData.author_name : authorName;
    const finalAvatar = tweetData ? tweetData.avatar_url : null;
    const finalTweetId = tweetData ? tweetData.tweet_id : null;

    if (!finalText || finalText.length > 200) {
      return json({ error: 'Text is required (max 200 chars)' }, 400);
    }
    if (finalLink && !/^https?:\/\//i.test(finalLink)) {
      return json({ error: 'Link must start with http(s)://' }, 400);
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return json({ error: 'user_id (anonymous uuid) is required' }, 400);
    }

    const paymentConfirmed = body.demo_payment === true || process.env.DEMO_MODE === 'true';
    if (!paymentConfirmed) {
      return json({ error: `Payment of $${(POST_PRICE_CENTS / 100).toFixed(2)} is required.` }, 402);
    }

    const { data: round, error: roundErr } = await supabase
      .from('rounds')
      .select('id, pot_cents')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (roundErr) return json({ error: 'Database error: ' + roundErr.message }, 500);

    const roundId = round?.id;
    if (!roundId) return json({ error: 'No active round' }, 409);

    const { data: post, error: insertError } = await admin
      .from('posts')
      .insert({
        round_id: roundId,
        user_id: userId,
        author_name: finalAuthor,
        text: finalText,
        link: finalLink || null,
        avatar_url: finalAvatar,
        tweet_id: finalTweetId,
        paid: true,
      })
      .select('*')
      .single();
    if (insertError) return json({ error: 'Insert error: ' + insertError.message }, 500);

    await admin
      .from('rounds')
      .update({ pot_cents: round.pot_cents + POST_PRICE_CENTS })
      .eq('id', roundId);

    return json({ post }, 201);
  } catch (err) {
    return json({ error: 'Server error: ' + (err.message || String(err)) }, 500);
  }
}