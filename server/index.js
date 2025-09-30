import express from 'express';
import { fetchThread, fetchUserComments, normalizePost, flattenComments, filterComments } from './reddit.js';
import { threadToMd, userCommentsToMd, userCommentsToHtmlTable } from './md.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

app.get('/api/thread', async (req, res) => {
  try {
    const { url, limit = 50, depth = 4, sort = 'confidence', include, hide_auto, hide_removed } = req.query;

    const match = url.match(/comments\/([a-z0-9]+)/i);
    if (!match) return res.status(400).json({ error: 'Invalid post URL' });

    const article = match[1];
    const data = await fetchThread({
      article,
      limit: Math.min(Number(limit), 100),
      depth: Math.min(Number(depth), 6),
      sort
    });

    const postData = data[0]?.data?.children?.[0]?.data;
    if (!postData) return res.status(404).json({ error: 'Post not found' });

    const includeFields = include ? include.split(',') : ['author', 'created', 'score', 'permalink', 'subreddit'];
    const post = normalizePost(postData, includeFields);

    const commentTree = data[1]?.data?.children || [];
    const flatComments = flattenComments(commentTree);
    const comments = filterComments(flatComments, {
      include,
      hide_auto: hide_auto === '1',
      hide_removed: hide_removed === '1'
    });

    const markdown = threadToMd(post, comments);

    res.json({ markdown, post, comments, count: comments.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user-comments', async (req, res) => {
  try {
    const { user, limit = 50, after, include, hide_auto, hide_removed, format = 'markdown' } = req.query;

    if (!user) return res.status(400).json({ error: 'Username required' });

    const data = await fetchUserComments({
      username: user,
      limit: Math.min(Number(limit), 100),
      after
    });

    const children = data.data?.children || [];
    const includeFields = include ? include.split(',') : ['author', 'created', 'score', 'permalink', 'subreddit'];

    let comments = children
      .filter(c => c.kind === 't1')
      .map(c => ({
        ...c.data,
        depth: 0,
        subreddit: c.data.subreddit,
        link_title: c.data.link_title,
        link_permalink: c.data.link_permalink
      }));

    comments = filterComments(comments, {
      include,
      hide_auto: hide_auto === '1',
      hide_removed: hide_removed === '1'
    });

    // Re-attach link metadata
    comments = comments.map((c, idx) => ({
      ...c,
      subreddit: children[idx]?.data?.subreddit,
      link_title: children[idx]?.data?.link_title,
      link_permalink: children[idx]?.data?.link_permalink
    }));

    const nextAfter = data.data?.after;
    const markdown = userCommentsToMd(user, comments);
    const html = format === 'html' ? userCommentsToHtmlTable(user, comments) : null;

    res.json({ markdown, html, comments, after: nextAfter, count: comments.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/thread-json', async (req, res) => {
  try {
    const { json, include, hide_auto, hide_removed } = req.body;

    if (!json) return res.status(400).json({ error: 'JSON data required' });

    let data;
    try {
      data = typeof json === 'string' ? JSON.parse(json) : json;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON format' });
    }

    // Handle both array format [post, comments] and single object format
    const postData = Array.isArray(data)
      ? data[0]?.data?.children?.[0]?.data
      : data.data?.children?.[0]?.data;

    if (!postData) return res.status(400).json({ error: 'Invalid post data structure' });

    const includeFields = include ? include.split(',') : ['author', 'created', 'score', 'permalink', 'subreddit'];
    const post = normalizePost(postData, includeFields);

    const commentTree = Array.isArray(data)
      ? (data[1]?.data?.children || [])
      : (data.data?.children?.[0]?.data?.replies?.data?.children || []);

    const flatComments = flattenComments(commentTree);
    const comments = filterComments(flatComments, {
      include,
      hide_auto: hide_auto === true || hide_auto === '1',
      hide_removed: hide_removed === true || hide_removed === '1'
    });

    const markdown = threadToMd(post, comments);

    res.json({ markdown, post, comments, count: comments.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user-comments-json', async (req, res) => {
  try {
    const { json, include, hide_auto, hide_removed, format = 'markdown' } = req.body;

    if (!json) return res.status(400).json({ error: 'JSON data required' });

    let data;
    try {
      data = typeof json === 'string' ? JSON.parse(json) : json;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON format' });
    }

    const children = data.data?.children || [];
    const includeFields = include ? include.split(',') : ['author', 'created', 'score', 'permalink', 'subreddit'];

    let comments = children
      .filter(c => c.kind === 't1')
      .map(c => ({
        ...c.data,
        depth: 0,
        subreddit: c.data.subreddit,
        link_title: c.data.link_title,
        link_permalink: c.data.link_permalink
      }));

    comments = filterComments(comments, {
      include,
      hide_auto: hide_auto === true || hide_auto === '1',
      hide_removed: hide_removed === true || hide_removed === '1'
    });

    // Re-attach link metadata
    comments = comments.map((c, idx) => ({
      ...c,
      subreddit: children[idx]?.data?.subreddit,
      link_title: children[idx]?.data?.link_title,
      link_permalink: children[idx]?.data?.link_permalink
    }));

    const username = children[0]?.data?.author || 'unknown';
    const nextAfter = data.data?.after;
    const markdown = userCommentsToMd(username, comments);
    const html = format === 'html' ? userCommentsToHtmlTable(username, comments) : null;

    res.json({ markdown, html, comments, after: nextAfter, count: comments.length, username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});