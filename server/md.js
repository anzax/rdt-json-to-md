function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function threadToMd(post, comments) {
  let md = `# ${post.title}\n`;
  md += `Link: ${post.url}\n`;
  md += `Subreddit: r/${post.subreddit}\n`;
  md += `Author: u/${post.author} | Created: ${post.created_iso} | Score: ${post.score}\n`;

  if (post.flair) {
    md += `Flair: ${post.flair}\n`;
  }

  md += `\n## Post Body\n`;
  if (post.selftext_md) {
    md += cleanText(post.selftext_md) + '\n';
  } else {
    md += '(No text content)\n';
  }

  md += `\n## Comments\n`;

  for (const comment of comments) {
    const indent = '  '.repeat(comment.depth);
    md += `${indent}- [u/${comment.author}] ${comment.score} pts | ${comment.created_iso}`;

    if (comment.depth === 0) {
      md += ` | [link](${comment.permalink})`;
    }

    md += '\n';

    const bodyLines = cleanText(comment.body_md).split('\n');
    for (const line of bodyLines) {
      if (comment.depth === 0) {
        md += `  ${line}\n`;
      } else {
        md += `${indent}  ${line}\n`;
      }
    }
  }

  return md;
}

export function userCommentsToMd(username, comments) {
  let md = `# Comments by u/${username}\n`;
  md += `Fetched: ${new Date().toISOString()}\n`;

  for (const comment of comments) {
    md += `\n- r/${comment.subreddit || 'unknown'}`;

    if (comment.link_title) {
      const linkUrl = comment.link_permalink.startsWith('http')
        ? comment.link_permalink
        : `https://reddit.com${comment.link_permalink}`;
      md += ` | [${comment.link_title}](${linkUrl})`;
    }

    md += '\n';
    md += `${comment.created_iso} | ${comment.score} pts | [comment](${comment.permalink})\n`;

    const bodyLines = cleanText(comment.body_md).split('\n');
    for (const line of bodyLines) {
      md += `${line}\n`;
    }
  }

  return md;
}

export function userCommentsToTable(username, comments) {
  let md = `# Comments by u/${username}\n`;
  md += `Fetched: ${new Date().toISOString()}\n\n`;
  md += `| Metadata | Comment |\n`;
  md += `|----------|----------|\n`;

  for (const comment of comments) {
    // Build metadata column
    let metadata = `r/${comment.subreddit || 'unknown'}`;

    if (comment.link_title) {
      const linkUrl = comment.link_permalink.startsWith('http')
        ? comment.link_permalink
        : `https://reddit.com${comment.link_permalink}`;
      metadata += `<br>[${comment.link_title}](${linkUrl})`;
    }

    metadata += `<br>${comment.created_iso}`;
    metadata += `<br>${comment.score} pts`;
    metadata += `<br>[comment](${comment.permalink})`;

    // Clean and escape comment body for table
    const body = cleanText(comment.body_md)
      .replace(/\n/g, '<br>')
      .replace(/\|/g, '\\|');

    md += `| ${metadata} | ${body} |\n`;
  }

  return md;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function userCommentsToHtmlTable(username, comments) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comments by u/${escapeHtml(username)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .timestamp {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      background: white;
      border-collapse: collapse;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      background: #4a5568;
      color: white;
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 16px;
      border-bottom: 1px solid #e5e5e5;
      vertical-align: top;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover {
      background: #f9f9f9;
    }
    .metadata {
      width: 300px;
      font-size: 13px;
      line-height: 1.6;
    }
    .metadata a {
      color: #0066cc;
      text-decoration: none;
    }
    .metadata a:hover {
      text-decoration: underline;
    }
    .subreddit {
      font-weight: 600;
      color: #1a1a1a;
    }
    .post-title {
      margin: 4px 0;
    }
    .meta-detail {
      color: #666;
      margin: 2px 0;
    }
    .comment-body {
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .score {
      color: #ff4500;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <h1>Comments by u/${escapeHtml(username)}</h1>
  <div class="timestamp">Fetched: ${new Date().toISOString()}</div>
  <table>
    <thead>
      <tr>
        <th>Metadata</th>
        <th>Comment</th>
      </tr>
    </thead>
    <tbody>`;

  for (const comment of comments) {
    const subreddit = escapeHtml(comment.subreddit || 'unknown');
    const linkUrl = comment.link_permalink?.startsWith('http')
      ? comment.link_permalink
      : `https://reddit.com${comment.link_permalink || ''}`;
    const postTitle = escapeHtml(comment.link_title || 'Post');
    const created = escapeHtml(comment.created_iso);
    const score = comment.score;
    const commentUrl = escapeHtml(comment.permalink);
    const body = escapeHtml(cleanText(comment.body_md));

    html += `
      <tr>
        <td class="metadata">
          <div class="subreddit">r/${subreddit}</div>
          <div class="post-title"><a href="${escapeHtml(linkUrl)}" target="_blank">${postTitle}</a></div>
          <div class="meta-detail">${created}</div>
          <div class="meta-detail"><span class="score">${score} pts</span></div>
          <div class="meta-detail"><a href="${commentUrl}" target="_blank">view comment</a></div>
        </td>
        <td class="comment-body">${body}</td>
      </tr>`;
  }

  html += `
    </tbody>
  </table>
</body>
</html>`;

  return html;
}