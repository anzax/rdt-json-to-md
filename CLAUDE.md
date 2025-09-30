# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimal Express.js application that converts Reddit threads and user comment histories to clean Markdown format. The app fetches data from Reddit's public JSON API (no OAuth), normalizes it, and outputs copy-ready Markdown.

## Running the Application

```bash
npm install
npm start
```

Server runs at http://localhost:3000

## Architecture

**Three-layer structure:**

1. **Server layer** (`server/index.js`) - Express app with two routes:
   - `GET /api/thread` - Fetches and converts a Reddit thread
   - `GET /api/user-comments` - Fetches and converts user comment history

2. **Data layer** (`server/reddit.js`) - Reddit API interaction:
   - `fetchThread()` / `fetchUserComments()` - HTTP calls to Reddit's `.json` endpoints
   - `flattenComments()` - DFS traversal to convert nested comment trees into flat arrays with depth metadata
   - `normalizePost()` / `normalizeComment()` - Transform Reddit's JSON into minimal DTOs
   - `filterComments()` - Apply user filters (hide AutoModerator, deleted/removed content)

3. **Presentation layer** (`server/md.js`) - Markdown generation:
   - `threadToMd()` - Thread header + post body + nested comment list with 2-space indentation per depth level
   - `userCommentsToMd()` - Flat chronological list grouped by subreddit/post
   - `cleanText()` - Normalizes line endings and collapses excessive newlines (3+ → 2)

**Frontend** (`public/`) - Vanilla JS + Tailwind CSS. Single HTML page with:
- Two input modes (thread URL or username)
- Configurable options (limit, depth, sort, filters)
- Auto-pagination for user comments (up to 500 total)
- Readonly textarea output with copy button

## Key Implementation Details

**Comment flattening:** Reddit returns deeply nested comment trees. `flattenComments()` performs depth-first traversal, attaching a `depth` property to each comment for Markdown indentation (2 spaces per level).

**Rate limiting:** Both fetch functions retry once after 2 seconds on HTTP 429, then fail.

**Markdown normalization:** The `cleanText()` function ensures consistent output by converting CRLF → LF and collapsing 3+ consecutive newlines to exactly 2.

**Text formatting in Markdown output:** When rendering comments with depth > 0 in threads, the output adds both the list indent (`'  '.repeat(comment.depth)`) AND an additional 2-space indent for each line of comment body text. This ensures proper nesting in the Markdown list structure.

## Reddit API Query Parameters

Threads use: `?raw_json=1&limit=<n>&depth=<n>&sort=<confidence|top|new>`
User comments use: `?raw_json=1&limit=<n>&after=<cursor>`

Always include `raw_json=1` to avoid HTML entity encoding issues.
