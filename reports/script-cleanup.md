# Plan: CLI Script Cleanup

## Overview

There are 39 `.js` files in the root directory plus several `.py` and `.sh`
scripts. This plan categorizes them relative to `app.js` (the HTMX grading
server), identifies dead code, and describes cleanup opportunities.

---

## Scripts Superseded by app.js

These scripts can be deleted — `app.js` already provides equivalent
functionality through its web UI:

- **`add-assignment.js`** — Interactive: adds assignment to DB.
  → `POST /assignments`, `POST /assigned/:id/add`

- **`add-override.js`** — Interactive: adds score override.
  → `POST /overrides`

- **`map-mastery-ic-names.js`** — Interactive: maps mastery standards to IC names.
  → `/mastery-ic-names` UI

- **`load-answers.js`** — Loads form assessment answers from `answers.json` into DB.
  → `fetchAndLoadAnswers()` + `POST /quiz-scoring/:id/fetch`

- **`load-exported-gradebook.js`** — Loads IC grade exports (TSV) into `ic_grades`.
  → `POST /assignments/reload-gradebook`

- **`grade-java-unit-tests.js`** — Grades Java unit tests from `results.json`.
  → `POST /assignments/:id/grade-java`

- **`grade-javascript-unit-tests.js`** — Runs JS tests in isolated VM.
  → `POST /assignments/:id/grade-js`

- **`grade-speedruns.js`** — Interactive speedrun grader.
  → `/speedruns/:id/grade` + `/speedruns/:id/results` UI

- **`recheck-speedrun.js`** — Re-examines graded speedrun.
  → `POST /speedruns/:id/regrade`

- **`sync-speedruns.js`** — Pulls speedrun data from server.
  → `POST /speedruns/sync`

- **`score-answers.py`** — Interactive answer scorer (multiple choice and free
  response).
  → `/quiz-scoring/:id/question/:n/score-choice`, `score-free`, `toggle-mchoice`

- **`weight-assignment.js`** — Interactive: assigns weights to standards.
  References `assignment_weights` table and `weighted_assignments_for_standard`
  view which no longer exist in the schema (superseded by
  `assignment_point_values`). Dead code *and* superseded.

---

## Functionality to Move into app.js

These scripts do useful work that the grading server doesn't yet handle.
Moving them into `app.js` would let us delete the scripts.

- **`grade-expressions.js`** — Grades ITP expression problem sets from
  `answers.json` files. Writes to `expressions` table. Needs an endpoint like
  `POST /assignments/:id/grade-expressions`, analogous to grade-java/grade-js.

- **`grade-reflection.js`** / **`grade-all-reflections.js`** — Grades reflection
  assignments based on word count, timeliness, and completeness. Writes to
  `direct_scores`. Needs a reflection grading endpoint and/or a bulk "grade all
  reflections" action.

- **`post-graded-speedruns.js`** — Posts graded speedrun verdicts to the server
  API. The speedruns UI already has grading but no "post to server" button. Add
  a button or batch action to push verdicts.

- **`sync-server-grades.js`** / **`compare-grades.js`** — Fetches server grades
  and compares to local DB, identifying discrepancies. Would be valuable as a
  grade comparison view in the UI (the `/to-update` page partially addresses
  this but doesn't show server-side data).

- **`load-direct-scores.js`** — Bulk-loads scores from a TSV file into
  `direct_scores`. The app has per-student score entry but no bulk upload. A TSV
  upload form would replace this.

- **`get-file.js`** / **`get-assignment-json.js`** — Snapshot student files to
  disk and fetch assignment metadata. The app fetches directly from git repos at
  grading time, so the disk-snapshotting workflow may be obsolete. Verify whether
  any remaining scripts depend on the on-disk snapshots before deleting.

---

## Libraries and Server Entry Points (not CLI scripts)

- **`api.js`** — HTTP client class wrapping all BHS-CS server API calls. Used by
  most scripts and by `app.js`.
- **`index.js`** — Express server for grading prompt responses and reviewing
  student code (takes a directory argument).
- **`app.js`** — HTMX web app; the main gradebook UI.

---

## Remaining CLI Scripts (still useful)

### History & Commit Analysis

These show how student work evolved commit-by-commit. Could eventually become
an app.js view but are useful as CLI tools for now:

- **`file-history.js`** — Git commit history for single-file assignments with
  timestamps and diffs. Has an unused `questions` variable.
- **`java-history.js`** — Commit history for Java assignments using the Java
  `Speedrun` utility. Has an unused `questions` variable (line 26).
- **`javascript-test-history.js`** — Test-passing progress over commits for JS
  assignments; optionally outputs sparkline summary.
- **`spike-javascript-speedrun.js`** — Similar to `javascript-test-history.js`
  but shows a JS speedrun from a specific start SHA. Overlaps significantly —
  consider merging.
- **`average-commits.js`** — Analyzes commit frequency from TSV, shows
  per-date/per-student statistics and percentile rankings.

### Similarity / Plagiarism Detection

- **`similarity.js`** — Compares two files for similarity using LCS. Bug: both
  Commander arguments named `<file1>` (line 25 should be `<file2>`).
- **`pairwise-similarity.js`** — Compares all pairs of files in a directory.
- **`similarity-timeline.js`** — Analyzes similarity between two students' code
  over time across commits.
- **`compare-dom.js`** — Compares static HTML to JS-generated HTML using jsdom
  and prettier. `nonEmptyText()` has a typo (`legth`) creating dead code.

### Reporting

- **`compare-grades.js`** — Listed above under "move into app.js" but also
  useful standalone until that happens.
- **`user.js`** — Finds roster entries by name or GitHub handle.
- **`make-key.js`** — Reads `scored_answers` and dumps JSON answer key to stdout.

### Grading (niche)

- **`grade-java-from-sha.js`** — Grades a specific Java commit SHA using
  `TestSha`. Niche use case not covered by app.js batch grading.
- **`grade-prompt-responses.py`** — Interactive grading of prompt responses.
  Works with `index.js` server.

### Data Fetching (Python)

- **`get-answers.py`** — Loads quiz answers from local GitHub mirrors.
- **`get-expressions.py`** — Stub/placeholder (imports `api` module only).
- **`get-student-answers.py`** — Fetches student answers.
- **`free-answers.py`** — Processes free-response answers.
- **`markup-to-questions.py`** / **`markup_quiz.py`** / **`mcqs-to-questions.py`**
  — Load questions from markup files into DB.

### Shell Scripts

- **`test-java-files.sh`** — Runs Java TestRunner on student files. Used by
  the old file-based workflow; app.js calls Java directly.
- **`test-java-stdin.sh`** — Variant of `test-java-files.sh`.
- **`bhs-data-root.sh`** — Exports `BHS_DATA_ROOT` env var.
- **`prod-env.sh`** — Production environment setup.
- **`setup-worktree.sh`** — Git worktree setup helper.
- **`reload-gradebook.sh`** — Reloads gradebook data. Likely superseded by
  `POST /assignments/reload-gradebook` — verify.
- **`check-reformats.sh`** — Checks for reformatting issues.
- **`dump-itp-exam-timelines.sh`** — Exports ITP exam timeline data.

### Infrastructure

- **`db-smoke-test.js`** — Validates SQL query files load without name
  collisions. Keep.

---

## Dead Code

Delete these:

- **`foo.sh`** — Empty placeholder.
- **`dump-grades.js`** — Explicitly marked `OBSOLETE` in its own comments.
- **`count-questions.js`** — Duplicates functionality in
  `get-assignment-json.js`.
- **`get-expressions.py`** — Stub that only imports `api`. No logic.

---

## Bugs to Fix

- **`similarity.js` line 25** — Commander argument mislabeled `<file1>` (should
  be `<file2>`).
- **`java-history.js` line 26** and **`file-history.js`** — Both read a
  `questions` variable from `questionsForAssignment()` and never use it.
- **`compare-dom.js`** — `nonEmptyText()` has a typo (`legth` instead of
  `length`) making one code path dead.

---

## Consolidation Opportunities

### History scripts

`java-history.js`, `javascript-test-history.js`, and
`spike-javascript-speedrun.js` all solve the same problem: show how a student's
work evolved commit-by-commit. Unify into a single script that invokes either
the Java or JS runner as appropriate.

### Reflection grading

`grade-reflection.js` and `grade-all-reflections.js` share scoring logic.
Factor into a shared module before (or as part of) moving into app.js.
