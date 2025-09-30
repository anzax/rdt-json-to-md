export async function fetchThread({ article, limit = 50, depth = 4, sort = 'confidence' }) {
  const url = `https://www.reddit.com/comments/${article}.json?raw_json=1&limit=${limit}&depth=${depth}&sort=${sort}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'rdt-json-to-md/1.0' } });

  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 2000));
    const retry = await fetch(url, { headers: { 'User-Agent': 'rdt-json-to-md/1.0' } });
    if (!retry.ok) throw new Error('Rate limited');
    return retry.json();
  }

  if (!res.ok) throw new Error(`Reddit API error: ${res.status}`);
  return res.json();
}

export async function fetchUserComments({ username, limit = 50, after = null }) {
  const params = new URLSearchParams({ raw_json: 1, limit });
  if (after) params.set('after', after);

  const url = `https://www.reddit.com/user/${username}/comments.json?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'rdt-json-to-md/1.0' } });

  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 2000));
    const retry = await fetch(url, { headers: { 'User-Agent': 'rdt-json-to-md/1.0' } });
    if (!retry.ok) throw new Error('Rate limited');
    return retry.json();
  }

  if (!res.ok) throw new Error(`Reddit API error: ${res.status}`);
  return res.json();
}

export function normalizePost(data, includeFields) {
  const post = data.selftext ? data : data.data;
  const dto = {
    id: post.id,
    title: post.title,
    author: post.author,
    selftext_md: post.selftext || '',
    created_iso: new Date(post.created_utc * 1000).toISOString(),
    score: post.score,
    subreddit: post.subreddit,
    url: `https://reddit.com${post.permalink}`
  };

  if (includeFields.includes('flair') && post.link_flair_text) {
    dto.flair = post.link_flair_text;
  }

  return dto;
}

export function flattenComments(children, depth = 0) {
  const result = [];

  for (const child of children) {
    if (!child.data) continue;
    if (child.kind !== 't1') continue;

    result.push({ ...child.data, depth });

    if (child.data.replies?.data?.children) {
      result.push(...flattenComments(child.data.replies.data.children, depth + 1));
    }
  }

  return result;
}

export function normalizeComment(comment, includeFields, depth) {
  const dto = {
    id: comment.id,
    depth,
    author: comment.author,
    body_md: comment.body,
    created_iso: new Date(comment.created_utc * 1000).toISOString(),
    score: comment.score,
    permalink: `https://reddit.com${comment.permalink}`
  };

  if (includeFields.includes('subreddit') && comment.subreddit) {
    dto.subreddit = comment.subreddit;
  }

  if (includeFields.includes('flair') && comment.author_flair_text) {
    dto.flair = comment.author_flair_text;
  }

  if (includeFields.includes('edited') && comment.edited) {
    dto.edited = new Date(comment.edited * 1000).toISOString();
  }

  return dto;
}

export function filterComments(comments, opts = {}) {
  const includeFields = opts.include ? opts.include.split(',') : ['author', 'created', 'score', 'permalink', 'subreddit'];

  return comments
    .filter(c => {
      if (opts.hide_auto && c.author === 'AutoModerator') return false;
      if (opts.hide_removed && (c.author === '[deleted]' || c.body === '[removed]')) return false;
      return true;
    })
    .map(c => normalizeComment(c, includeFields, c.depth));
}