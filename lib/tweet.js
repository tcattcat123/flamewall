export function extractTweetId(url) {
  if (!url || typeof url !== 'string') return null;
  const m = String(url).match(/(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/(\d+)/i);
  return m ? m[1] : null;
}

export async function fetchTweet(tweetUrl) {
  const id = extractTweetId(tweetUrl);
  if (!id) {
    const err = new Error('Invalid Twitter/X link');
    err.status = 400;
    throw err;
  }

  const res = await fetch(`https://api.fxtwitter.com/status/${id}`, {
    headers: { 'User-Agent': 'FlameWall/1.0' },
  });
  if (!res.ok) {
    const err = new Error('Could not load that tweet (status ' + res.status + ')');
    err.status = 502;
    throw err;
  }

  const data = await res.json();
  const t = data?.tweet;
  if (!t || !t.text) {
    const err = new Error('Tweet not found or private');
    err.status = 404;
    throw err;
  }

  const media = Array.isArray(t.media?.all) ? t.media.all : [];
  const firstMedia = media[0] && media[0].url ? media[0].url : null;

  return {
    tweet_id: id,
    text: t.text || '',
    author_name: t.author?.screen_name || t.author?.name || 'anonymous',
    display_name: t.author?.name || t.author?.screen_name || '',
    avatar_url: t.author?.avatar_url || null,
    link: t.url || tweetUrl,
    media_url: firstMedia,
    likes: t.likes || 0,
  };
}