# Plan: CLI Script Cleanup

## Overview

There are 39 `.js` files in the root directory. This plan categorizes them,
identifies dead code, and describes opportunities to reduce duplication.

---

## Libraries and Server Entry Points (not CLI scripts)

These are not meant to be run directly:

- **`api.js`** — HTTP client class wrapping all BHS-CS server API calls. Used by
  most scripts.
- **`index.js`** — Express server for grading prompt responses and reviewing
  student code (takes a directory argument).
- **`app.js`** — New HTMX web app; the main gradebook UI.

---

## CLI Scripts by Group

### Data Fetching & Snapshotting

- **`get-file.js`** — Fetches student files from GitHub mirrors into local
  `csa/`, `itp/`, `eng/` directories. Core workflow script used before every
  grading step.
- **`get-assignment-json.js`** — Fetches assignment metadata from API and writes
  `assignment.json` into the assignment directory.
- **`count-questions.js`** — Counts `<div data-name>` elements in an
  assignment's HTML to determine question count. Overlaps heavily with
  `get-assignment-json.js`, which also counts questions. Candidate for deletion.

### Grading

- **`grade-expressions.js`** — Grades ITP expression problem sets from
  `answers.json` files. Writes to `expressions` table.
- **`grade-java-unit-tests.js`** — Grades Java unit tests from `results.json`
  files with optional partial credit via `scoring.json`. Writes to
  `java_unit_tests`.
- **`grade-java-from-sha.js`** — Grades a specific Java commit SHA using the
  `TestSha` Java utility. Writes to `java_unit_tests`.
- **`grade-javascript-unit-tests.js`** — Runs JS tests in an isolated VM via
  jsdom. Writes to `javascript_unit_tests`.
- **`grade-reflection.js`** — Grades a single reflection assignment based on
  word count, timeliness, and completeness. Writes to `direct_scores`.
- **`grade-all-reflections.js`** — Batch version of `grade-reflection.js`;
  grades all reflection assignments in one pass.
- **`grade-speedruns.js`** — Interactive speedrun grader (commit-by-commit,
  y/n input). Writes to `graded_speedruns`.
- **`recheck-speedrun.js`** — Re-examines an already-graded speedrun and
  optionally updates the verdict.

### Database / Data Management

- **`add-assignment.js`** — Interactive: adds an assignment to DB with standard
  and point values. Writes to `assignments`, `assignment_point_values`.
  **Superseded by `app.js` `/assignments/new`.**
- **`add-override.js`** — Interactive: adds a score override. Writes to
  `score_overrides`. **Superseded by `app.js` `/overrides/new`.**
- **`map-mastery-ic-names.js`** — Interactive: maps mastery standards to IC
  assignment names. Writes to `mastery_ic_names`. **Superseded by `app.js`
  `/mastery-ic-names`.**
- **`weight-assignment.js`** — Interactive: assigns weights to standards for an
  assignment. References `assignment_weights` table and
  `weighted_assignments_for_standard` view — both of which may no longer exist in
  the current schema (replaced by `assignment_point_values`). Likely dead.
- **`load-answers.js`** — Loads form assessment answers from `answers.json` into
  `student_answers`, `normalized_answers`, `form_assessments`.
- **`load-direct-scores.js`** — Loads scores from a TSV file into `direct_scores`.
- **`load-exported-gradebook.js`** — Loads IC grade exports (TSV) into
  `ic_grades` for comparison.
- **`make-key.js`** — Reads `scored_answers` and dumps a JSON answer key to
  stdout.

### Sync

- **`sync-speedruns.js`** — Pulls speedrun data from the server, populates
  `speedrunnables`, `completed_speedruns`, `started_speedruns`.
- **`sync-server-grades.js`** — Fetches current server grades and writes them to
  `server_grades` table (used by `compare-grades.js`).
- **`post-graded-speedruns.js`** — Posts graded speedrun verdicts from DB to
  server API.

### History & Commit Analysis

These scripts show the history of student work commit-by-commit:

- **`file-history.js`** — Shows git commit history for a single-file assignment
  with timestamps and diffs.
- **`java-history.js`** — Shows commit history for Java assignments using the
  Java `Speedrun` utility. Has an unused `questions` variable (line 26).
- **`javascript-test-history.js`** — Shows test-passing progress over commits
  for a JS assignment; optionally outputs a sparkline summary.
- **`spike-javascript-speedrun.js`** — Similar to `javascript-test-history.js`
  but shows a JS speedrun from a specific start SHA. Overlaps significantly.
- **`average-commits.js`** — Analyzes commit frequency from a TSV, shows
  per-date/per-student statistics and percentile rankings.

### Similarity / Plagiarism Detection

- **`similarity.js`** — Compares two files for similarity using LCS. Has a bug:
  both Commander arguments are named `<file1>` (line 25 should be `<file2>`).
- **`pairwise-similarity.js`** — Compares all pairs of files in a directory for
  similarity.
- **`similarity-timeline.js`** — Analyzes similarity between two students' code
  over time across commits.
- **`compare-dom.js`** — Compares static HTML to JS-generated HTML using jsdom
  and prettier. `nonEmptyText()` helper has a typo (`legth`) that renders one
  code path dead.

### Reporting & Comparison

- **`compare-grades.js`** — Compares local DB grades to server grades, identifies
  discrepancies. Uses `sync-server-grades.js` output.
- **`user.js`** — Finds roster entries by name or GitHub handle.

---

## Dead Code

These files should be deleted:

- **`foo.js`** — Empty placeholder. No content.
- **`testdb.js`** — Stub that initializes a DB connection but contains no logic.
- **`dump-grades.js`** — Explicitly marked `OBSOLETE` in its own comments.

---

## Candidates for Deletion or Consolidation

- **`count-questions.js`** — Duplicates functionality in `get-assignment-json.js`.
  Delete.
- **`weight-assignment.js`** — References `assignment_weights` table and
  `weighted_assignments_for_standard` view which appear to no longer exist in the
  schema (superseded by `assignment_point_values`). Verify and delete if so.
- **`spike-javascript-speedrun.js`** — Substantially overlaps with
  `javascript-test-history.js`. Consider merging.

---

## Duplicate Functionality to Factor Out

### History scripts

`java-history.js`, `javascript-test-history.js`, and `spike-javascript-speedrun.js`
all solve the same problem: show how a student's work evolved commit-by-commit.
The Large TODO already calls for unifying these into a single script that invokes
either the Java or JS runner as appropriate and renders output in a standard way.

### Interactive DB entry

`add-assignment.js`, `add-override.js`, `map-mastery-ic-names.js`, and
`weight-assignment.js` (if not dead) all follow the same pattern: prompt user,
validate input, write to DB. Now that `app.js` provides a web UI for this,
consider whether the CLI scripts are still needed or can be removed.

### Reflection grading

`grade-reflection.js` and `grade-all-reflections.js` share the same scoring
logic. Factor the scoring function into a shared module and have both scripts
call it.

---

## Bugs to Fix

- **`java-history.js` and `file-history.js`**: Both read a `questions` variable
  from `questionsForAssignment()` and never use it. Remove the unused reads.
