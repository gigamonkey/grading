# Plan: Speedrun Grading UI in app.js

## Context

The CLI tool `grade-speedruns.js` provides interactive terminal-based speedrun grading — it loops through ungraded speedruns, shows commit-by-commit timelines with test results, and prompts y/n/s. This plan moves that functionality into the `app.js` web UI so grading can happen in the browser with a proper timeline visualization and accept/reject/skip buttons.

Two key changes from the CLI version:
1. Java speedruns now use `com.gigamonkeys.bhs.grading.Grade --range --output json` instead of the old `Speedrun check` command
2. The server's sha bug is fixed — `first_sha` and `last_sha` are now exact, so the `nextCommit` kludge in `showCommits` is no longer needed

## Files to Modify

- **`app.js`** — add routes for speedrun grading
- **`modules/speedruns.js`** — add a function that returns structured data (instead of console.log) for JavaScript speedruns
- **`views/app/speedruns.njk`** — update the list page to link into the grading UI
- **`views/app/speedruns/grade.njk`** — new template for the grading UI (commit timeline + buttons)

## Implementation

### 1. Add `getCommitData()` to `modules/speedruns.js`

Refactor `showCommits` logic into a pure-data function that returns an array of commit objects instead of printing to console. Each commit object:

```js
{ sha, shortSha, timestamp, date, totalElapsed, elapsed, passed, attempted, error }
```

Also return `{ commits, totalTime, maxPassed, questions }`.

Reuse existing helpers: `numPassed`, `numAttempted`, `durationString`, `dateFormat`. The key difference from `showCommits`: no `nextCommit` kludge (server sha bug is fixed), and returns data instead of logging.

### 2. Add Java speedrun analysis via Grade tool

In `app.js` (or a helper), invoke the Grade CLI for Java speedruns:

```
java -cp classes:bhs-cs.jar com.gigamonkeys.bhs.grading.Grade \
  --range firstSha..lastSha \
  --repo ../github/<github>.git \
  --file <path>/<file> \
  --tester <testClass> \
  --output json
```

Parse the JSON output. Each entry has `sha`, `time`, `delta`, `elapsed`, `score`, and `results` (array of test results). Transform into the same commit-data shape used by the JavaScript path so the template can render both uniformly.

### 3. Add routes to `app.js`

**`GET /speedruns`** — already exists, update to make each row link to the grading page.

**`GET /speedruns/:speedrunId`** — the grading UI for a single speedrun:
1. Fetch the speedrun from DB via `db.specificSpeedrun({ speedrunId })`
2. Fetch assignment config from API (`api.assignment()`, `api.codingConfig()`)
3. Determine language from `config.files[0]` extension (`.java` vs `.js`), following the pattern already used in `app.js:608`:
   - **Java** (file ends with `.java`): Run `Grade --range --output json`, parse results
   - **JavaScript** (file ends with `.js`): Load testcases via `api.jsTestcases()`, call the new `getCommitData()` from `modules/speedruns.js`
4. Render template with commit timeline data + speedrun metadata

**`POST /speedruns/:speedrunId/grade`** — accept/reject a speedrun:
1. Read `ok` from request body (1 for accept, 0 for reject)
2. Call `db.ensureGradedSpeedrun({ speedrunId, ok })`
3. Respond with HTMX: redirect to next ungraded speedrun (or back to list if none left)

**`POST /speedruns/:speedrunId/skip`** — skip, redirect to the next ungraded speedrun.

### 4. Update `views/app/speedruns.njk`

Add links from each speedrun row to `/speedruns/<speedrun_id>` for grading. Add a count indicator (e.g. "1 of 12").

### 5. Create `views/app/speedruns/grade.njk`

Layout:
- Header: student github, assignment title, course, "N of M" progress indicator
- Commit timeline table:
  - Columns: SHA (short), Time, +Delta, Total Elapsed, Tests Passed
  - Each row is a commit, oldest first
  - Errors shown inline
- Summary line: total time, max passed, questions count
- Action buttons: Accept (green), Reject (red), Skip (neutral)
  - Accept/Reject POST to `/speedruns/:id/grade` with `ok=1` or `ok=0`
  - Skip POSTs to `/speedruns/:id/skip`
  - All use HTMX to navigate to the next speedrun seamlessly

### 6. Navigation flow

After grading or skipping, determine the next ungraded speedrun:
- Query `db.ungradedSpeedruns()`, find the first one
- If exists, redirect to `/speedruns/<nextId>`
- If none left, redirect to `/speedruns` (shows "No ungraded speedruns")

Use `HX-Redirect` header for HTMX navigation.

## Verification

1. Run `node db-smoke-test.js` to verify no SQL issues
2. Start the app, navigate to `/speedruns`
3. Click into a speedrun — verify the commit timeline renders with correct elapsed times and test results
4. Test Accept/Reject/Skip buttons — verify DB updates and navigation to next speedrun
5. Verify both Java and JavaScript speedruns render correctly
