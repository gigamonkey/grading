# Eliminate Direct Access to ~/hacks/bhs-cs

## Overview

The grading system currently depends on two local filesystem resources that
bypass the server API: the **bhs-cs server codebase** (`~/hacks/bhs-cs`) and
**GitHub repo mirrors** (`../github/`). This plan catalogs every access point
and proposes API additions to replace them.

---

## 1. Nunjucks Template Parsing (Question Counting)

### Files

- `get-file.js:23`
- `get-assignment-json.js:12`
- `count-questions.js:11`
- `sync-speedruns.js:45`
- `app.js:928`

### What It Does

All five files contain an identical `countQuestions(url)` function that opens
`~/hacks/bhs-cs/views/pages/${url}/index.njk` and counts `<div data-name`
elements to determine how many questions a coding assignment has. This is the
denominator for scoring.

### Proposed API Change

Include a `questions` field in the assignment data returned by the existing
assignment endpoint. The server already has these templates and can count the
questions itself. No new endpoint needed — just enrich the existing response.

### Difficulty: Easy

---

## 2. Java JAR / CLASSPATH

### Files

- `Makefile:1,10`
- `test-java-files.sh:5-6`

### What It Does

The Makefile sets `CLASSPATH` to `/Users/peter/hacks/bhs-cs/java/target/bhs-cs.jar`
for compiling Java test classes. `test-java-files.sh` uses the same JAR to run
Java test graders (`com.gigamonkeys.bhs.assignments.*`) against student code.

### Proposed API Change

Two options:

**Option A — Server-side grading endpoint:**
`POST /api/grade/java` accepting student code and returning test results. The
server already has the JAR; it could run the tests. This fully eliminates the
local JVM dependency but is a significant architectural change.

**Option B — JAR download endpoint:**
`GET /api/java/bhs-cs.jar` so the grading tool can fetch the latest JAR without
needing the server repo checked out locally. Lighter-touch but still requires a
local JVM.

### Difficulty: Hard

---

## 3. BHS_DATA_ROOT Environment Variable

### Files

- `test-java-files.sh:8`
- `bhs-data-root.sh:2`
- `foo.sh:4`

### What It Does

`BHS_DATA_ROOT` is set to `~/hacks/bhs-cs/java/` and consumed by the Java test
harness at runtime. It points to test data files (expected outputs, test inputs)
that the Java grader needs.

### Proposed API Change

Bundled with the JAR solution above. If server-side grading is adopted, this
goes away entirely. If the JAR-download approach is used, a companion endpoint
like `GET /api/java/test-data.tar.gz` would be needed, or the test data could
be bundled into the JAR itself.

### Difficulty: Tied to #2

---

## 4. Local Git Repo Mirrors (`../github/`)

### Files

- `grade-expressions.js:41` — `git show` to read student answers
- `sync-speedruns.js:114` — `git fetch` on student repos
- `grade-speedruns.js:37` — walk commit history for speedrun review
- `recheck-speedrun.js:34` — same commit-walking for rechecks
- `spike-javascript-speedrun.js:30` — commit-walking for JS speedruns
- `modules/repo.js` — `Repo` class wrapping all git operations

### What It Does

These scripts access bare git repos at `../github/<username>.git/` to:

- Read student file contents at specific commits (`git show`)
- Fetch latest commits from GitHub (`git fetch`)
- Walk commit history to evaluate speedrun attempts (`git log`)
- View diffs for individual commits (`git show --format=''`)

The `Repo` class in `modules/repo.js` wraps these operations: `fetch`, `sha`,
`contents`, `diff`, `changes`, `branchChanges`, `branchPathChanges`,
`nextChange`.

### Proposed API Additions

Individual endpoints mapping to `Repo` methods:

- `GET /api/repos/:github/file?branch=...&path=...` — file contents at branch tip
- `GET /api/repos/:github/file/:sha?path=...` — file contents at a specific commit
- `GET /api/repos/:github/commits?branch=...&path=...&since=...&until=...` — commit list (sha + timestamp)
- `GET /api/repos/:github/diff/:sha` — diff for a single commit
- `POST /api/repos/:github/fetch` — trigger server-side fetch from GitHub

Alternatively, a single bundled endpoint could reduce round-trips for the
speedrun use case:

`GET /api/repos/:github/speedrun-history?assignment=...&first_sha=...&last_sha=...`
— returns all commit data needed for speedrun grading in one response.

### Difficulty: Medium

---

## Priority Order

| # | Dependency | Difficulty | Value |
|---|-----------|------------|-------|
| 1 | Question count from templates | Easy | Removes 5 duplicate functions |
| 2 | Git repo mirrors | Medium | Eliminates local mirror maintenance |
| 3 | Java JAR + test data | Hard | Removes heaviest local dependency |
