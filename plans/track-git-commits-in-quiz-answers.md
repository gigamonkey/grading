# Track Git Commits and Support Multiple Grading Versions

## Context

When quiz answers or JavaScript code are loaded for grading, the git SHA of the
commit they came from is available but not always stored. More importantly, there
is currently no way to store multiple graded versions of a student's work for the
same assignment. This is needed for cases like giving a student extra time: grade
once at the deadline, then re-grade their newer work and keep both in the
database, choosing which version counts as the official grade.

## Design

### New table: `grading_versions`

A central table that tracks each version of graded work per student per
assignment, with a flag indicating which version is active (contributes to
scores).

```sql
CREATE TABLE IF NOT EXISTS grading_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  sha TEXT NOT NULL,
  timestamp INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  reason TEXT,                    -- e.g. "extra time", "original deadline"
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (github, assignment_id, sha)
);
```

When a new version is inserted, the loading code sets `active = 1` on the new
version and `active = 0` on all prior versions for that (github, assignment_id).
This makes the latest load the default active version, but the active flag can be
manually toggled to select an earlier version instead.

### Add `version_id` to answer/result tables

Add a `version_id` column (FK to `grading_versions.id`) to:

- `student_answers` — quiz answers
- `javascript_unit_tests` — JS unit test results

The `version_id` replaces the current `timestamp`/`sha` columns on these tables
(that info now lives in `grading_versions`). It also becomes part of the primary
key so multiple versions can coexist.

#### `student_answers` schema change

```sql
CREATE TABLE IF NOT EXISTS student_answers (
  version_id INTEGER NOT NULL,
  github TEXT,
  assignment_id INT,
  question_number INT,
  answer_number,
  raw_answer TEXT,
  PRIMARY KEY (version_id, github, assignment_id, question_number, answer_number),
  FOREIGN KEY (version_id) REFERENCES grading_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (assignment_id) REFERENCES form_assessments(assignment_id) ON DELETE CASCADE
);
```

#### `javascript_unit_tests` schema change

```sql
CREATE TABLE IF NOT EXISTS javascript_unit_tests (
  version_id INTEGER NOT NULL,
  assignment_id INTEGER,
  github TEXT,
  question TEXT,
  answered INTEGER,
  correct INTEGER,
  FOREIGN KEY (version_id) REFERENCES grading_versions(id) ON DELETE CASCADE
);
```

### Update views to filter on active version

The views that compute scores from these tables need to join through
`grading_versions` and filter on `active = 1`:

- `question_scores` (drives `form_assessment_scores`) — join `student_answers`
  to `grading_versions` on `version_id` and add `WHERE gv.active = 1`
- `wrong_answers` — same join/filter
- `javascript_unit_tests_scores` — join `javascript_unit_tests` to
  `grading_versions` on `version_id` and add `WHERE gv.active = 1`

### Loading code changes

#### `load-answers.js`
- Create or find a `grading_versions` row for (github, assignment_id, sha)
- Deactivate prior versions for that (github, assignment_id)
- Pass `version_id` to `ensureStudentAnswer` instead of timestamp/sha

#### `app.js` (server)
- Same pattern in both the bulk-load and single-student-reload paths
- The single-student reload should only deactivate+replace that student's
  versions, not all students'

#### `grade-javascript-unit-tests.js`
- Same pattern: create `grading_versions` row, pass `version_id`

### UI for version management

Add a way to view and toggle active versions per student. This could be:
- A column on the quiz-scoring student view showing the SHA/timestamp
- A toggle button to switch which version is active
- Display of all versions with their scores so the teacher can compare

### Migration

```sql
-- Add the new table
CREATE TABLE grading_versions (...);

-- Migrate existing student_answers data
-- (existing rows get a generated version, all marked active)

-- Migrate existing javascript_unit_tests data
-- (same approach)

-- Drop old timestamp/sha columns after migration
```

## Files to modify

- `schema.sql` — new table, modified tables, updated views
- `modules/queries.sql` — new queries for grading_versions CRUD, updated
  ensureStudentAnswer
- `modules/pugly.sql` (regenerated)
- `load-answers.js` — version creation and version_id threading
- `app.js` — version creation in both quiz-loading paths
- `grade-javascript-unit-tests.js` — version creation and version_id threading
- Templates/routes for version management UI (TBD)
