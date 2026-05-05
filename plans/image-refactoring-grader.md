# Image-Refactoring Grader

A new kind of points-grader rubric item for assignments where students refactor
JavaScript code that draws an image. Pass criterion: the refactored code still
produces the same image as the student's first commit.

The points-grader becomes the home for these assignments because we also want
manually-graded code-quality items and (eventually) other auto-computed items
about the code itself, all summing into a single points score.

## How it fits into the points-grader

`rubric_items` already has a `kind` column with `'manual'` (default) and
`'word_count'` (used by the md-grader). Add a third:

- `'image_refactoring'` — `parameters` JSON is `{ "branch": "main",
  "file_path": "code.js" }`. Score is auto-computed from rendered PNGs:
  `1.0` if first-commit and latest-commit PNGs are byte-for-byte identical,
  `0.0` otherwise. The grader can override with any fraction (the
  points-grader already allows 0/0.5/1 cycling and free-form edits) — that's
  how partial credit gets awarded for "close but not identical."

A points-grader assignment for a refactoring unit is then a mix of items:

- One `image_refactoring` item (auto-scored, override-able).
- Manual code-quality items (named functions, no duplication, etc.).
- Future auto-computed code items (left out of this plan but the same
  `kind`/`parameters` mechanism extends to them).

## UI

The points-grader is currently a table (rows=students, cols=items) with
click-to-cycle cells. That's still right for manual items; image_refactoring
needs more room.

Two changes:

1. **Image_refactoring cell renderer.** In place of the percentage, show
   small thumbnails (e.g. 120×75) of first-commit and latest-commit images
   side-by-side, an "=" or "≠" badge, and the current fraction underneath.
   Clicking opens the detail view (below). Cell still supports the existing
   click-to-cycle / shift-click cycling for fast override.

2. **Per-student detail view.** New route
   `/points-grader/:assignmentId/student/:userId` opens a page (or a
   `<dialog>` modal) showing:
    - Full-size images (800×500) side-by-side, with shas + timestamps.
    - Match indicator: green "Identical" or red "Different".
    - Number input for the image_refactoring fraction.
    - List of all the assignment's items with scoring controls (so the
      grader can do everything for one student without going back to the
      table).
    - Prev / Next student navigation, like md-grader.

   The grader workflow is: scan the table, click a student to inspect,
   score everything in the detail view, next.

## Adding image_refactoring items

Mirror the md-grader's "Add word-count item" UI. On the points-grader
assignment page, an "Add image-refactoring item" button opens a small form
asking for branch + file path + points value. It calls `addRubricItem` with
`kind = 'image_refactoring'` and `parameters = JSON.stringify({ branch,
file_path })`.

Existing `addRubricItem` already takes `kind` and `parameters`. No SQL
changes needed for `rubric_items` itself.

## Database

One new table for the render cache:

```sql
-- Cached per-student renders for image_refactoring rubric items. Keyed by
-- seq because an assignment could in principle have multiple image items
-- for different files.
CREATE TABLE IF NOT EXISTS image_refactoring_renders (
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  first_sha TEXT,
  first_timestamp INTEGER,
  first_png BLOB,
  first_error TEXT,
  latest_sha TEXT,
  latest_timestamp INTEGER,
  latest_png BLOB,
  latest_error TEXT,
  identical INTEGER, -- 1 = byte-for-byte equal, 0 = different, NULL = not yet rendered
  PRIMARY KEY (user_id, assignment_id, seq)
);
```

PNGs at 800×500 are ~30–100 KB. ~100 students × a couple of refactor
assignments per term is a few MB total — fine to keep in `db.db`.

`points_rubric_marks` doesn't change. Image_refactoring items write to it
the same way manual items do; the rendering metadata lives separately in
`image_refactoring_renders`. This keeps `points_rubric_scores` working
unchanged.

Update `graded_work_metadata` so that for assignments with image_refactoring
items the latest sha + timestamp surface in the assignment-students view
(union from `image_refactoring_renders` using `latest_sha`).

After editing `schema.sql`, regenerate `modules/pugly.sql` and add
hand-written queries to `modules/queries.sql`:

- `imageRefactoringRenderForUser` (single row by user/assignment/seq)
- `imageRefactoringRendersForAssignment` (all rows for an assignment)
- `upsertImageRefactoringRender`
- `imageRefactoringStudentsNeedingFetch` (mirror `rubricStudentsNeedingFetch`)

## Render module

Extract the in-process rendering from `javascript-render-graphics.js` into
`modules/image-refactoring.js`:

```js
// Returns { png: Buffer } or { error: string }
export function render({ graphicsSource, codeSource })
```

It creates an 800×500 `node-canvas`, builds a `vm` context with `Math.random`
stubbed to `0.5` (deterministic comparison — same as the existing CLI),
runs `graphics.js`, then `clear()`, then the student code, then returns the
PNG buffer.

`graphics.js` is read once at startup; `codeSource` comes from
`repo.contents(sha, filePath)` per render.

`javascript-render-graphics.js` is rewritten to import this module so the CLI
and the server stay in sync.

## App.js wiring

Add a helper that, given an assignment's items + a student, ensures every
image_refactoring item has a current `image_refactoring_renders` row for
that student. "Current" means `latest_sha` matches `repo.sha(branch,
filePath)` today. If stale or missing, fetch the repo, find first + latest
shas, render both, store. Then auto-upsert the corresponding
`points_rubric_marks` fraction (`1.0` if identical, `0.0` otherwise) — but
**only if there's no existing mark for that (user, assignment, seq)** so
grader overrides aren't clobbered.

Edge case: a student pushes a fix that flips identical from 0→1 after the
grader already gave them a manual 0.5. The "don't overwrite existing mark"
rule keeps the 0.5 stuck. Add a small "Reset to auto" button on the cell /
detail view that deletes the manual mark, letting the next page-load
auto-fill it from the new render. Cheap to add and avoids a `manual` flag
on `points_rubric_marks`.

Routes:

- `GET /points-grader/:assignmentId/student/:userId` — detail view.
- `POST /points-grader/:assignmentId/image-refactoring-item` — add item
  (form: branch, file_path, points).
- `POST /points-grader/:assignmentId/refresh/:userId` — re-fetch repo,
  re-render any image items for that student.
- `POST /points-grader/:assignmentId/render-all` — bulk render (mirrors
  md-grader's "Fetch new").
- `GET /points-grader/:assignmentId/png/:userId/:seq/:which` — serve
  cached PNG (`which` = `first` | `latest`).
- `DELETE /points-grader/:assignmentId/mark/:userId/:seq` — reset to auto.

## Repo helper

Add `Repo.firstSha(branch, filePath)` — first commit on `branch` that
touched `filePath`:

```
git log --reverse --pretty=tformat:%H <branch> -- <filePath>
```

…take the first line. Existing `Repo.sha(branch, filePath)` already gives
the latest.

## Out of scope (but the door is open)

The user also wants automated point items based on the code itself
(linting-style checks, function-name presence, etc.). This plan doesn't spec
those, but the same `rubric_items.kind` + `parameters` extension point
handles them: each new auto-kind is a function `(codeSource, parameters) =>
fraction` plus a "Add X item" form. Image refactoring is the first concrete
case using it for points-grader.
