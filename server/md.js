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