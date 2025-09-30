# Reddit to Markdown

Convert Reddit threads and user comments to clean Markdown or HTML table format.

## Features

- **Fetch entire Reddit threads** with nested comments
- **Fetch user comment history** with auto-pagination (up to 500 comments)
- **Multiple view modes** for user comments:
  - List view: Clean Markdown with proper indentation
  - HTML Table view: Styled, interactive table with clickable links
- **JSON paste mode**: Bypass rate limits by pasting Reddit JSON directly
- **Configurable options**: depth, limit, sort, and content filters
- **Filter out** AutoModerator and deleted/removed content
- **Manual pagination**: Browse user comments page by page
- **Copy-to-clipboard** support for Markdown output

## Getting Started

```bash
npm install
npm start
```

Open http://localhost:3000

## Usage

### Fetch Thread

**Option 1: URL Fetch**

- Paste a Reddit post URL (e.g., `https://reddit.com/r/askreddit/comments/abc123/...`)
- Click "Fetch Thread"

**Option 2: JSON Paste** (for rate limits)

- Click "Paste JSON Instead"
- Open the Reddit JSON URL manually (add `.json` to the post URL)
- Paste the JSON and click "Parse Thread JSON"

### Fetch User Comments

**Option 1: Username Fetch**

- Enter a username
- Toggle "Auto-paginate" to fetch up to 500 comments at once, or leave it off for manual page-by-page browsing
- Click "Fetch User Comments"

**Option 2: JSON Paste** (for rate limits)

- Click "Paste JSON Instead"
- Open `https://reddit.com/user/USERNAME/comments.json` manually
- Paste the JSON and click "Parse User JSON"

**View Modes** (User Comments Only)

- **List**: Markdown format with hierarchical layout
- **HTML Table**: Styled table with metadata column and comment column

### Options

- **Limit**: Max comments per request (1-100)
- **Max Depth**: Comment nesting level for threads (1-6)
- **Sort**: Comment sorting (confidence/top/new) for threads
- **Hide AutoModerator**: Filter out AutoModerator comments
- **Hide deleted/removed**: Filter out deleted/removed content
- **Auto-paginate**: Automatically fetch multiple pages up to 500 comments

## API Endpoints

### `GET /api/thread`

Fetch thread from Reddit API.

Query params: `url`, `limit`, `depth`, `sort`, `hide_auto`, `hide_removed`

Returns: `{ markdown, post, comments, count }`

### `POST /api/thread-json`

Parse thread from pasted JSON.

Body: `{ json, hide_auto, hide_removed }`

Returns: `{ markdown, post, comments, count }`

### `GET /api/user-comments`

Fetch user comments from Reddit API.

Query params: `user`, `limit`, `after`, `hide_auto`, `hide_removed`, `format`

Returns: `{ markdown, html, comments, after, count }`

### `POST /api/user-comments-json`

Parse user comments from pasted JSON.

Body: `{ json, hide_auto, hide_removed, format }`

Returns: `{ markdown, html, comments, after, count, username }`

## Rate Limiting

Reddit may rate limit requests. If this happens:

1. Click "Paste JSON Instead"
2. Manually open the Reddit JSON URL in your browser
3. Copy the entire JSON response
4. Paste it into the textarea and parse it

This bypasses the rate limit since the request comes from your browser, not the server.
