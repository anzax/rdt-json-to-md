const postUrlInput = document.getElementById('postUrl');
const usernameInput = document.getElementById('username');
const fetchThreadBtn = document.getElementById('fetchThread');
const fetchUserBtn = document.getElementById('fetchUser');
const limitInput = document.getElementById('limit');
const depthInput = document.getElementById('depth');
const sortSelect = document.getElementById('sort');
const hideAutoCheckbox = document.getElementById('hideAuto');
const hideRemovedCheckbox = document.getElementById('hideRemoved');
const autoPaginateCheckbox = document.getElementById('autoPaginate');
const outputPre = document.getElementById('output');
const copyBtn = document.getElementById('copyBtn');
const statusDiv = document.getElementById('status');
const paginationDiv = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageInfo = document.getElementById('pageInfo');
const viewToggleDiv = document.getElementById('viewToggle');
const listViewBtn = document.getElementById('listViewBtn');
const tableViewBtn = document.getElementById('tableViewBtn');
const toggleThreadJsonBtn = document.getElementById('toggleThreadJson');
const threadJsonInput = document.getElementById('threadJsonInput');
const threadJsonTextarea = document.getElementById('threadJson');
const parseThreadJsonBtn = document.getElementById('parseThreadJson');
const toggleUserJsonBtn = document.getElementById('toggleUserJson');
const userJsonInput = document.getElementById('userJsonInput');
const userJsonTextarea = document.getElementById('userJson');
const parseUserJsonBtn = document.getElementById('parseUserJson');
const htmlOutput = document.getElementById('htmlOutput');

// Pagination state
let paginationState = {
  pages: [], // Array of { comments, after }
  currentPage: 0,
  username: null
};

// View state
let viewState = {
  mode: 'list', // 'list' or 'table'
  isUserComments: false,
  htmlCache: {} // Cache HTML for each page
};

function setStatus(msg, isError = false) {
  statusDiv.textContent = msg;
  statusDiv.className = `text-sm ${isError ? 'text-red-600' : 'text-gray-600'}`;
}

function setLoading(isLoading, button) {
  button.disabled = isLoading;
  if (isLoading) {
    button.textContent = 'Loading...';
  } else {
    if (button.id === 'fetchThread') button.textContent = 'Fetch Thread';
    else if (button.id === 'fetchUser') button.textContent = 'Fetch User Comments';
    else if (button.id === 'parseThreadJson') button.textContent = 'Parse Thread JSON';
    else if (button.id === 'parseUserJson') button.textContent = 'Parse User JSON';
  }
}

function resetPagination() {
  paginationState = { pages: [], currentPage: 0, username: null };
  paginationDiv.classList.add('hidden');
  paginationDiv.classList.remove('flex');
}

function updatePaginationUI() {
  const { pages, currentPage } = paginationState;

  if (pages.length === 0) {
    resetPagination();
    return;
  }

  paginationDiv.classList.remove('hidden');
  paginationDiv.classList.add('flex');

  prevPageBtn.disabled = currentPage === 0;
  nextPageBtn.disabled = currentPage === pages.length - 1 && !pages[currentPage].after;

  pageInfo.textContent = `Page ${currentPage + 1}${pages[currentPage].after ? '+' : ''}`;
}

function renderUserComments(comments, username, asTable = false) {
  if (asTable) {
    return renderUserCommentsTable(comments, username);
  }

  let markdown = `# Comments by u/${username}\n`;
  markdown += `Fetched: ${new Date().toISOString()}\n`;

  for (const comment of comments) {
    markdown += `\n- r/${comment.subreddit || 'unknown'}`;
    if (comment.link_title) {
      const linkUrl = comment.link_permalink?.startsWith('http')
        ? comment.link_permalink
        : `https://reddit.com${comment.link_permalink || ''}`;
      markdown += ` | [${comment.link_title}](${linkUrl})`;
    }
    markdown += '\n';
    markdown += `${comment.created_iso} | ${comment.score} pts | [comment](${comment.permalink})\n`;

    const bodyLines = comment.body_md.split('\n');
    for (const line of bodyLines) {
      markdown += `${line}\n`;
    }
  }

  return markdown;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderUserCommentsHtmlTable(comments, username) {
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
    const body = escapeHtml(comment.body_md
      .replace(/\r\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim());

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

async function onFetchThread() {
  const url = postUrlInput.value.trim();
  if (!url) {
    setStatus('Please enter a post URL', true);
    return;
  }

  resetPagination();
  viewState.isUserComments = false;
  viewToggleDiv.classList.add('hidden');
  viewToggleDiv.classList.remove('flex');
  setLoading(true, fetchThreadBtn);
  setStatus('Fetching thread...');

  try {
    const params = new URLSearchParams({
      url,
      limit: limitInput.value,
      depth: depthInput.value,
      sort: sortSelect.value
    });

    if (hideAutoCheckbox.checked) params.set('hide_auto', '1');
    if (hideRemovedCheckbox.checked) params.set('hide_removed', '1');

    const res = await fetch(`/api/thread?${params}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to fetch thread');

    outputPre.textContent = data.markdown;
    copyBtn.disabled = false;
    setStatus(`Fetched ${data.count} comments`);
  } catch (error) {
    setStatus(error.message, true);
    outputPre.textContent = '';
    copyBtn.disabled = true;
  } finally {
    setLoading(false, fetchThreadBtn);
  }
}

async function fetchUserPage(username, after = null) {
  const params = new URLSearchParams({
    user: username,
    limit: limitInput.value
  });

  if (after) params.set('after', after);
  if (hideAutoCheckbox.checked) params.set('hide_auto', '1');
  if (hideRemovedCheckbox.checked) params.set('hide_removed', '1');

  const res = await fetch(`/api/user-comments?${params}`);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Failed to fetch user comments');

  return data;
}

async function onFetchUser() {
  const username = usernameInput.value.trim();
  if (!username) {
    setStatus('Please enter a username', true);
    return;
  }

  viewState.isUserComments = true;
  viewState.mode = 'list';
  updateViewToggle();
  const autoPaginate = autoPaginateCheckbox.checked;

  if (autoPaginate) {
    // Auto-paginate mode: fetch all pages up to 500 comments
    resetPagination();
    setLoading(true, fetchUserBtn);
    setStatus('Fetching user comments...');

    try {
      const allComments = [];
      let after = null;
      let totalFetched = 0;
      const maxComments = 500;

      do {
        const data = await fetchUserPage(username, after);
        allComments.push(...data.comments);
        totalFetched += data.count;
        after = data.after;

        setStatus(`Fetched ${totalFetched} comments${after ? ', loading more...' : ''}...`);

        if (!after || totalFetched >= maxComments) break;

        await new Promise(resolve => setTimeout(resolve, 1000));
      } while (after);

      paginationState.pages = [{ comments: allComments, after: null }];
      paginationState.username = username;

      if (viewState.mode === 'table') {
        const html = renderUserCommentsHtmlTable(allComments, username);
        htmlOutput.srcdoc = html;
        outputPre.classList.add('hidden');
        htmlOutput.classList.remove('hidden');
        copyBtn.disabled = true;
      } else {
        outputPre.textContent = renderUserComments(allComments, username, false);
        htmlOutput.classList.add('hidden');
        outputPre.classList.remove('hidden');
        copyBtn.disabled = false;
      }

      setStatus(`Fetched ${totalFetched} comments`);
      viewToggleDiv.classList.remove('hidden');
      viewToggleDiv.classList.add('flex');
    } catch (error) {
      setStatus(error.message, true);
      outputPre.textContent = '';
      copyBtn.disabled = true;
    } finally {
      setLoading(false, fetchUserBtn);
    }
  } else {
    // Manual pagination mode: fetch first page and cache it
    paginationState = { pages: [], currentPage: 0, username };
    setLoading(true, fetchUserBtn);
    setStatus('Fetching page 1...');

    try {
      const data = await fetchUserPage(username);

      paginationState.pages.push({
        comments: data.comments,
        after: data.after
      });

      if (viewState.mode === 'table') {
        const html = renderUserCommentsHtmlTable(data.comments, username);
        htmlOutput.srcdoc = html;
        outputPre.classList.add('hidden');
        htmlOutput.classList.remove('hidden');
        copyBtn.disabled = true;
      } else {
        outputPre.textContent = renderUserComments(data.comments, username, false);
        htmlOutput.classList.add('hidden');
        outputPre.classList.remove('hidden');
        copyBtn.disabled = false;
      }

      setStatus(`Page 1: ${data.count} comments`);
      updatePaginationUI();
      viewToggleDiv.classList.remove('hidden');
      viewToggleDiv.classList.add('flex');
    } catch (error) {
      setStatus(error.message, true);
      outputPre.textContent = '';
      copyBtn.disabled = true;
      resetPagination();
    } finally {
      setLoading(false, fetchUserBtn);
    }
  }
}

async function onNextPage() {
  const { pages, currentPage, username } = paginationState;

  // Check if we already have next page cached
  if (currentPage + 1 < pages.length) {
    paginationState.currentPage++;
    if (viewState.mode === 'table') {
      const html = renderUserCommentsHtmlTable(pages[paginationState.currentPage].comments, username);
      htmlOutput.srcdoc = html;
    } else {
      outputPre.textContent = renderUserComments(pages[paginationState.currentPage].comments, username, false);
    }
    setStatus(`Page ${paginationState.currentPage + 1}: ${pages[paginationState.currentPage].comments.length} comments`);
    updatePaginationUI();
    return;
  }

  // Fetch next page
  const currentAfter = pages[currentPage].after;
  if (!currentAfter) return;

  nextPageBtn.disabled = true;
  setStatus('Loading next page...');

  try {
    const data = await fetchUserPage(username, currentAfter);

    paginationState.pages.push({
      comments: data.comments,
      after: data.after
    });

    paginationState.currentPage++;
    if (viewState.mode === 'table') {
      const html = renderUserCommentsHtmlTable(data.comments, username);
      htmlOutput.srcdoc = html;
    } else {
      outputPre.textContent = renderUserComments(data.comments, username, false);
    }
    setStatus(`Page ${paginationState.currentPage + 1}: ${data.count} comments`);
    updatePaginationUI();
  } catch (error) {
    setStatus(error.message, true);
    updatePaginationUI();
  }
}

function onPrevPage() {
  if (paginationState.currentPage === 0) return;

  paginationState.currentPage--;
  const { pages, currentPage, username } = paginationState;

  if (viewState.mode === 'table') {
    const html = renderUserCommentsHtmlTable(pages[currentPage].comments, username);
    htmlOutput.srcdoc = html;
  } else {
    outputPre.textContent = renderUserComments(pages[currentPage].comments, username, false);
  }
  setStatus(`Page ${currentPage + 1}: ${pages[currentPage].comments.length} comments`);
  updatePaginationUI();
}

function updateViewToggle() {
  if (viewState.mode === 'list') {
    listViewBtn.className = 'px-3 py-1.5 text-sm rounded bg-white shadow-sm font-medium text-gray-900';
    tableViewBtn.className = 'px-3 py-1.5 text-sm rounded font-medium text-gray-600 hover:text-gray-900';
  } else {
    listViewBtn.className = 'px-3 py-1.5 text-sm rounded font-medium text-gray-600 hover:text-gray-900';
    tableViewBtn.className = 'px-3 py-1.5 text-sm rounded bg-white shadow-sm font-medium text-gray-900';
  }
}

function switchView(mode) {
  if (!viewState.isUserComments) return;

  viewState.mode = mode;
  updateViewToggle();

  const { pages, currentPage, username } = paginationState;
  if (pages.length > 0 && username) {
    if (mode === 'table') {
      // Show HTML table
      const html = renderUserCommentsHtmlTable(pages[currentPage].comments, username);
      htmlOutput.srcdoc = html;
      outputPre.classList.add('hidden');
      htmlOutput.classList.remove('hidden');
      copyBtn.disabled = true; // Can't copy from iframe easily
    } else {
      // Show markdown
      outputPre.textContent = renderUserComments(pages[currentPage].comments, username, false);
      htmlOutput.classList.add('hidden');
      outputPre.classList.remove('hidden');
      copyBtn.disabled = false;
    }
  }
}

function onCopy() {
  navigator.clipboard.writeText(outputPre.textContent);
  const originalText = copyBtn.textContent;
  copyBtn.textContent = 'Copied!';
  setTimeout(() => {
    copyBtn.textContent = originalText;
  }, 2000);
}

async function onParseThreadJson() {
  const json = threadJsonTextarea.value.trim();
  if (!json) {
    setStatus('Please paste JSON data', true);
    return;
  }

  resetPagination();
  viewState.isUserComments = false;
  viewToggleDiv.classList.add('hidden');
  viewToggleDiv.classList.remove('flex');
  setLoading(true, parseThreadJsonBtn);
  setStatus('Parsing thread JSON...');

  try {
    const res = await fetch('/api/thread-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json,
        hide_auto: hideAutoCheckbox.checked ? '1' : '0',
        hide_removed: hideRemovedCheckbox.checked ? '1' : '0'
      })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to parse thread JSON');

    outputPre.textContent = data.markdown;
    copyBtn.disabled = false;
    setStatus(`Parsed ${data.count} comments`);
  } catch (error) {
    setStatus(error.message, true);
    outputPre.textContent = '';
    copyBtn.disabled = true;
  } finally {
    setLoading(false, parseThreadJsonBtn);
  }
}

async function onParseUserJson() {
  const json = userJsonTextarea.value.trim();
  if (!json) {
    setStatus('Please paste JSON data', true);
    return;
  }

  viewState.isUserComments = true;
  viewState.mode = 'list';
  updateViewToggle();
  resetPagination();
  setLoading(true, parseUserJsonBtn);
  setStatus('Parsing user comments JSON...');

  try {
    const res = await fetch('/api/user-comments-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json,
        hide_auto: hideAutoCheckbox.checked ? '1' : '0',
        hide_removed: hideRemovedCheckbox.checked ? '1' : '0'
      })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to parse user JSON');

    paginationState.pages = [{ comments: data.comments, after: data.after }];
    paginationState.username = data.username;
    paginationState.currentPage = 0;

    if (viewState.mode === 'table') {
      const html = renderUserCommentsHtmlTable(data.comments, data.username);
      htmlOutput.srcdoc = html;
      outputPre.classList.add('hidden');
      htmlOutput.classList.remove('hidden');
      copyBtn.disabled = true;
    } else {
      outputPre.textContent = renderUserComments(data.comments, data.username, false);
      htmlOutput.classList.add('hidden');
      outputPre.classList.remove('hidden');
      copyBtn.disabled = false;
    }

    setStatus(`Parsed ${data.count} comments`);
    viewToggleDiv.classList.remove('hidden');
    viewToggleDiv.classList.add('flex');
  } catch (error) {
    setStatus(error.message, true);
    outputPre.textContent = '';
    copyBtn.disabled = true;
  } finally {
    setLoading(false, parseUserJsonBtn);
  }
}

function toggleThreadJsonInput() {
  const isHidden = threadJsonInput.classList.contains('hidden');
  if (isHidden) {
    threadJsonInput.classList.remove('hidden');
    toggleThreadJsonBtn.textContent = 'Use URL Instead';
  } else {
    threadJsonInput.classList.add('hidden');
    toggleThreadJsonBtn.textContent = 'Paste JSON Instead';
  }
}

function toggleUserJsonInput() {
  const isHidden = userJsonInput.classList.contains('hidden');
  if (isHidden) {
    userJsonInput.classList.remove('hidden');
    toggleUserJsonBtn.textContent = 'Use Username Instead';
  } else {
    userJsonInput.classList.add('hidden');
    toggleUserJsonBtn.textContent = 'Paste JSON Instead';
  }
}

fetchThreadBtn.addEventListener('click', onFetchThread);
fetchUserBtn.addEventListener('click', onFetchUser);
copyBtn.addEventListener('click', onCopy);
prevPageBtn.addEventListener('click', onPrevPage);
nextPageBtn.addEventListener('click', onNextPage);
listViewBtn.addEventListener('click', () => switchView('list'));
tableViewBtn.addEventListener('click', () => switchView('table'));
toggleThreadJsonBtn.addEventListener('click', toggleThreadJsonInput);
parseThreadJsonBtn.addEventListener('click', onParseThreadJson);
toggleUserJsonBtn.addEventListener('click', toggleUserJsonInput);
parseUserJsonBtn.addEventListener('click', onParseUserJson);