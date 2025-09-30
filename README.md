# Reddit to Markdown

Convert Reddit threads and user comments to clean Markdown format.

## Features

- Fetch entire Reddit threads with nested comments
- Fetch user comment history (with auto-pagination up to 500 comments)
- Configurable depth, limit, and sort options
- Filter out AutoModerator and deleted/removed content
- Clean, properly indented Markdown output
- Copy-to-clipboard support

## Getting Started

```bash
npm install
npm start
```

Open http://localhost:3000

## Usage

**Fetch Thread:**
Paste a Reddit post URL (e.g., `https://reddit.com/r/askreddit/comments/abc123/...`) and click "Fetch Thread"

**Fetch User Comments:**
Enter a username and click "Fetch User Comments". Enable auto-pagination to fetch up to 500 comments automatically.

**Options:**
- Limit: Max comments per request (1-100)
- Max Depth: Comment nesting level for threads (1-6)
- Sort: Comment sorting (confidence/top/new)
- Filters: Hide AutoModerator, deleted/removed comments

## API Endpoints

### `GET /api/thread`
Query params: `url`, `limit`, `depth`, `sort`, `hide_auto`, `hide_removed`

### `GET /api/user-comments`
Query params: `user`, `limit`, `after`, `hide_auto`, `hide_removed`

Both return JSON with `markdown`, `comments`, and metadata.