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

// Pagination state
let paginationState = {
  pages: [], // Array of { comments, after }
  currentPage: 0,
  username: null
};

function setStatus(msg, isError = false) {
  statusDiv.textContent = msg;
  statusDiv.className = `text-sm ${isError ? 'text-red-600' : 'text-gray-600'}`;
}

function setLoading(isLoading, button) {
  button.disabled = isLoading;
  button.textContent = isLoading ? 'Loading...' : button.id === 'fetchThread' ? 'Fetch Thread' : 'Fetch User Comments';
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

function renderUserComments(comments, username) {
  let markdown = `# Comments by u/${username}\n\nFetched: ${new Date().toISOString()}\n\n`;

  for (const comment of comments) {
    markdown += `- r/${comment.subreddit || 'unknown'}`;
    if (comment.link_title) {
      const linkUrl = comment.link_permalink?.startsWith('http')
        ? comment.link_permalink
        : `https://reddit.com${comment.link_permalink || ''}`;
      markdown += ` | [${comment.link_title}](${linkUrl})`;
    }
    markdown += '\n';
    markdown += `${comment.created_iso} | ${comment.score} pts | [comment](${comment.permalink})\n\n`;

    const bodyLines = comment.body_md.split('\n');
    for (const line of bodyLines) {
      markdown += `${line}\n`;
    }
    markdown += '\n';
  }

  return markdown;
}

async function onFetchThread() {
  const url = postUrlInput.value.trim();
  if (!url) {
    setStatus('Please enter a post URL', true);
    return;
  }

  resetPagination();
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

      outputPre.textContent = renderUserComments(allComments, username);
      copyBtn.disabled = false;
      setStatus(`Fetched ${totalFetched} comments`);
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

      outputPre.textContent = renderUserComments(data.comments, username);
      copyBtn.disabled = false;
      setStatus(`Page 1: ${data.count} comments`);
      updatePaginationUI();
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
    outputPre.textContent = renderUserComments(pages[paginationState.currentPage].comments, username);
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
    outputPre.textContent = renderUserComments(data.comments, username);
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

  outputPre.textContent = renderUserComments(pages[currentPage].comments, username);
  setStatus(`Page ${currentPage + 1}: ${pages[currentPage].comments.length} comments`);
  updatePaginationUI();
}

function onCopy() {
  navigator.clipboard.writeText(outputPre.textContent);
  const originalText = copyBtn.textContent;
  copyBtn.textContent = 'Copied!';
  setTimeout(() => {
    copyBtn.textContent = originalText;
  }, 2000);
}

fetchThreadBtn.addEventListener('click', onFetchThread);
fetchUserBtn.addEventListener('click', onFetchUser);
copyBtn.addEventListener('click', onCopy);
prevPageBtn.addEventListener('click', onPrevPage);
nextPageBtn.addEventListener('click', onNextPage);