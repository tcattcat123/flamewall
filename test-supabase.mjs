import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nouqvujkfwjbmqcmldkk.supabase.co';
const supabaseAnonKey = 'sb_publishable_YlaZxlWC8qGYIAkqp4pBbQ_AiIkxB3j';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vdXF2dWprZndqYm1xY21sZGtrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODAzNzQ0MCwiZXhwIjoyMTAzNjEzNDQwfQ.-EFmH3pBJOlv00JM7HnmZNhOq9uyGc0fs6rGCqMgBcE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const admin = createClient(supabaseUrl, supabaseServiceKey);

// simulate the exact api/post.js flow
const tweetUrl = 'https://x.com/ilo/status/2093609707646632062';

const id = tweetUrl.match(/(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/(\d+)/i)?.[1];
const tres = await fetch('https://api.fxtwitter.com/status/' + id, { headers: { 'User-Agent': 'FlameWall/1.0' } });
const tdata = await tres.json();
const t = tdata?.tweet;
const text = (t?.text || '').slice(0, 200);
const author = t?.author?.screen_name || 'anonymous';
const avatar = t?.author?.avatar_url || null;
const link = t?.url;

console.log('text length:', text.length);

// 1. Round query via supabase (anon)
const { data: round, error: roundErr } = await supabase
  .from('rounds')
  .select('id, pot_cents')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
console.log('round query error:', roundErr?.message || 'OK');
console.log('round id:', round?.id);

const roundId = round?.id;

// 2. Insert via admin
const { data: post, error: insertError } = await admin
  .from('posts')
  .insert({
    round_id: roundId,
    user_id: '00000000-0000-0000-0000-000000000000',
    author_name: author,
    text,
    link: link || null,
    avatar_url: avatar,
    tweet_id: id,
    paid: true,
  })
  .select('*')
  .single();
console.log('insert error:', insertError?.message || 'OK');
console.log('post id:', post?.id);