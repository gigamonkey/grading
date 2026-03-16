# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A grading system for Berkeley High School CS courses (CSA, ITP, ENG). It fetches student work from GitHub mirrors, runs autograded tests, stores results in SQLite, and syncs grades to the BHS-CS server API.

## Commands

```bash
# Build Java classes (requires bhs-cs.jar in CLASSPATH)
make

# Initialize database from schema
sqlite3 db.db < schema.sql

# Lint/format JavaScript
make check   # runs: npx @biomejs/biome check --write

# Install Node dependencies
npm install

# Transpile PugSQL queries
npx puglify schema.sql > modules/pugly.sql
```

## Grading Workflows

### Java Unit Tests
1. `./get-file.js <assignmentId>` — snapshot student .java files into `csa/<assignment>/`
2. `./test-java-files.sh <TesterClass> csa/<assignment>/*/File.java` — runs tests, writes `results.json` (or `broken.txt` for compile failures)
3. `./grade-java-unit-tests.js <dir>` — loads results into `java_unit_tests` table

### ITP Expression Problem Sets
1. `./get-file.js <assignmentId>` — snapshot `answers.json` into `itp/<assignment>/`
2. `./grade-expressions.js <dir>` — computes accuracy/completion, inserts into `expressions` table

### JavaScript Unit Tests
1. `./get-file.js <assignmentId>` — snapshot student JS files
2. `./grade-javascript-unit-tests.js <dir>` — runs tests via jsdom, loads results

### Form-Based Quizzes
1. `markup-to-questions.py` — loads questions from Markup file by assignment ID
2. `./get-file.js <assignmentId>` — fetch student answers
3. `./load-answers.js` — load answers into database
4. `score-answers.py` — interactive scoring of unique answers

### Speedruns
1. `./sync-speedruns.js` — pull speedrun data from server into DB
2. `./grade-speedruns.js` — interactive grading (commit-by-commit, y/n per speedrun)
3. `./post-graded-speedruns.js` — push verdicts to server

### Reflections
1. `./grade-reflection.js <assignmentId>` — fetch from API, compute score from word count/timeliness/completeness
2. `./sync-server-grades.js` — push all pending grades to server

## Architecture

**Data flow:** GitHub repos → local snapshots (`csa/`, `itp/`, `eng/`) → test runners → `db.db` (SQLite) → BHS-CS server API

**Database (`schema.sql`):** Score inputs live in separate tables per assignment type (`java_unit_tests`, `javascript_unit_tests`, `expressions`, `direct_scores`, `form_assessments`, `rubric_grades`). The `assignment_scores` view unions all these with override support. Grade computation happens in views (`assignment_points`, `mastery_points`, `speedrun_points`).

**Standards-based grading:** Each assignment maps to one or more standards via `assignment_weights`. Speedrun mastery points use a decay formula: `base_points / 10 * Σ(attempt^-1.5)`. Secondary weights allow score increases only.

**`api.js`:** The API client class wraps all BHS-CS server communication. Used by most scripts via `new API()`.

**`modules/`:** Shared utilities — `util.js` (array/stats ops, TSV/JSON loading), `grading.js` (score computation, file timestamp/SHA extraction), `speedruns.js` (commit analysis), `repo.js` (git operations).

**`assignment.json`:** Each assignment directory contains this file (fetched via `get-assignment-json.js`) with `assignment_id`, `course_id`, `title`, `open_date`, `kind`, `url`, and optionally `questions` count and `scoring.json` for partial credit weights.

**Student file layout:** `<course>/<assignmentId>-<title>/<github-username>/` with `timestamp.txt` and `sha.txt` alongside code files.

## Environment

`.env` requires:
- `BHS_CS_API_KEY` — API auth token
- `BHS_CS_SERVER` — server URL (https://bhs-cs.gigamonkeys.com)

Java CLASSPATH must include `/Users/peter/hacks/bhs-cs/java/target/bhs-cs.jar`. Student repo mirrors are expected at `../github/`.

## pugsql.js

This codebase uses pugsql.js to access the SQLite database. pugsql.js is a wrapper around `better-sqlite3` but exposes its own API which we use. In particular in `pugsql` the `db.transaction` method takes a function to run in the transactions and any args that need to be passed to the function. This is different than the `better-sqlite3` transaction method which takes a function and returns a function which is then called whith whatever args the passed in function needs.
