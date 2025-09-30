> coding spec for agent

---

# rdt-json-to-md — MVP spec

## Goal

Paste a Reddit post URL or a username, click Fetch, get a single plaintext block in Markdown that the user can copy.

## Scope

- One HTML page. No routing.
- Express.js backend for fetch and normalization.
- Pure JS on the client. Tailwind for layout only.
- No preview or download buttons. One textarea with the final Markdown string.
- No tests, no OAuth, no persistence.

## Page layout

- Header: title and short instructions.
- Input group A: Post URL field + Fetch Thread button.
- Input group B: Username field + Fetch User Comments button.
- Options (checkboxes, all optional):

  - Limit: number input (default 50, max 100)
  - Max depth (thread): number input (default 4)
  - Sort (thread): select [confidence, top, new]
  - Include fields: [author, created, score, permalink, subreddit, flair, edited] (all on by default except flair, edited)
  - Hide AutoModerator
  - Hide deleted and removed

- Output: one large readonly `<textarea>` with Copy button.

## Backend

Express routes. All fetches happen server side to avoid CORS and to centralize params.

- `GET /api/thread?url=...&limit=...&depth=...&sort=...&include=author,score,...&hide_auto=1&hide_removed=1`

  - Validates and parses post URL to `{article}`.
  - Calls `https://www.reddit.com/comments/{article}.json?raw_json=1&limit&depth&sort`.
  - Flattens the comment tree into a simple array with `depth`.
  - Applies hides and field selection.
  - Returns `{ post, comments, truncated, morePresent }`.

- `GET /api/user-comments?user=...&limit=...&after=...&include=...&hide_auto=1&hide_removed=1`

  - Calls `https://www.reddit.com/user/{name}/comments.json?raw_json=1&limit&after`.
  - Returns `{ comments, after }`.

Minimal normalization DTOs

```
CommentDTO = {
  id, depth, author, body_md, created_iso, score,
  permalink, subreddit?, flair?, edited?
}
PostDTO = {
  id, title, author, selftext_md, created_iso,
  score, subreddit, url, flair?
}
```

## Frontend flow

- On Fetch Thread:

  - Disable button. Call `/api/thread`.
  - Build Markdown string from `{post, comments}`.
  - Put the final string into the textarea.

- On Fetch User Comments:

  - Start with `after = null`. Loop:

    - Call `/api/user-comments`.
    - Append to a single local array.
    - If `after` exists and user toggled “fetch next page automatically”, keep going until limit cap (hard cap 500). Otherwise stop after first page.

  - Build Markdown and place in textarea.

## Markdown format

Thread export

```
# {post_title}
Link: {post_url}
Subreddit: r/{subreddit}
Author: u/{author} | Created: {created_iso} | Score: {score}
Flair: {flair}

## Post Body
{selftext_md}

## Comments
- [u/{author}] {score} pts | {created_iso} | [link]({permalink})
  {body_md}
  - [u/{child_author}] {score} pts | {created_iso}
    {child_body}
```

User comments export

```
# Comments by u/{username}
Fetched: {iso_time}

- r/{subreddit} | [{post_title}]({post_link})
  {created_iso} | {score} pts | [comment]({permalink})
  {body_md}

- r/{subreddit2} | [{post_title}]({post_link})
  ...
```

Rules

- 2 spaces per depth in the list.
- Replace CRLF with LF. Collapse 3+ newlines to 2.
- If hidden or removed and not shown, output a single line placeholder, e.g. `[removed]` or `[deleted]`.

## Pagination handling

- User comments: keep `after` cursor. If “auto paginate” is off, include a short footer in the Markdown:
  `More available. Next cursor: {after}`
- Thread comments: do not expand `more` nodes in MVP. Set `morePresent = true` and append a footer:
  `Note: some branches omitted.`

## Limits

- Default limit 50. Hard cap 100 per request.
- Default depth 4. Hard cap 6.
- Auto paginate cap 500 comments per run.
- Simple backoff on 429: retry once after 2 seconds, then abort with a readable error string.

## File layout

```
/server
  index.js          // express, two routes
  reddit.js         // fetchers + normalizers
  md.js             // dto -> markdown
/public
  index.html        // single page
  main.js           // event handlers, fetch, render
  tailwind.css
```

## Implementation sketch

`server/reddit.js`

```js
export async function fetchThread({ article, limit, depth, sort }) {
  /* fetch .json with raw_json=1 */
}
export function flattenComments(tree) {
  /* DFS -> [{depth, ...}] */
}
export function filterMapComments(list, opts) {
  /* hide automod, removed, pick fields */
}
```

`server/md.js`

```js
export function threadToMd(post, comments) {
  /* build header + body + list */
}
export function userCommentsToMd(username, comments) {
  /* group by subreddit+link title, then list */
}
```

`public/main.js`

```js
async function onFetchThread() {
  /* read inputs -> GET /api/thread -> threadToMd -> textarea.value = md */
}
async function onFetchUser() {
  /* loop pages optionally -> userCommentsToMd -> textarea.value = md */
}
```

## Acceptance checks for this iteration

- Given a valid post URL with fewer than 300 comments, clicking Fetch outputs a single Markdown string within a few seconds, with visible nesting.
- Given a username, clicking Fetch outputs at least the first page (up to 100) of comments as Markdown. If more are available, a next cursor note appears.
- Toggling “hide removed” immediately affects the next fetch result. No page reload required.

## Traps and how to avoid them

- Thread size explosion. Do not expand `morechildren` in MVP. Document this clearly.
- HTML entities. Always request `raw_json=1`.
- CORS. Fetch from the server, not from the browser.
- Sort inconsistencies. Lock a default sort and expose it, but warn that changing sort changes which comments land in the top N.
