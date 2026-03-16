# Schema Cleanup Analysis

Done 2026-03-15

Things defined in `schema.sql` that may no longer be needed, plus orphaned tables
found in `actual-schema.sql` that are not defined in `schema.sql` at all.

---

## Probably Safe to Remove

### `rubric_grades` table

Defined in `schema.sql` with pugly-generated CRUD queries, but:
- Not used in any view in `schema.sql`
- Not referenced by any script in the repo

If rubric-based grading was a planned feature that never got built out, this can go.

### `speedrunnable_standards` table

Defined in `schema.sql`, has data loaded via `speedrun-standards.sql`, and pugly
generates CRUD queries for it. But:
- Not referenced in any view in `schema.sql`
- Not called from any JS script

It appears to be a remnant of the old `fps`/`assignment_weights` grade computation
(which is now gone). The current speedrun mastery point system uses `mastery_speedruns`
instead. The `speedrun-standards.sql` data file would also become orphaned.

---

## Worth Reviewing

### `started_speedruns` table

The comment in `schema.sql` already flags this: *"This was needed at the beginning
when the Javascript speedruns didn't mark themselves done. Now it is mainly useful
for tracking down speedruns without having to touch the production database."*

`sync-speedruns.js` and `api.js` still actively use it, so it can't be dropped
without updating those scripts. But if the workaround is no longer needed, it could
be retired.

### `scored_question_assignments` + `speedrunnables` FIXME

`schema.sql` itself has `-- FIXME: combine this table with speedrunnables`.
Both tables store `questions INTEGER` for an `assignment_id`. They could be merged
into `speedrunnables`, with non-speedrunnable assignments simply having no entry
there (or a `NULL` for the speedrun-specific fields).

### `server_grades` table

Used as a staging/snapshot table by `sync-server-grades.js` (clears and reloads
from the API) and `compare-grades.js`. It holds no canonical data — it's purely
a cache for comparison. Worth noting that if `compare-grades.js` were rewritten
to compare against the live API directly, this table would be unnecessary.

### `wrong_answers` view

Not referenced by any other view or any script. It's an ad-hoc diagnostic view
(shows incorrect answers grouped by question). Fine to keep, but it's not part of
any automated pipeline.

---

## Diagnostic Views Not Called by Any Script

These views exist for direct interactive querying (e.g. via `sqlite3` CLI) rather
than being called programmatically. They're useful but worth knowing they're not
wired into any scripts:

- `standards` — total assignment/mastery points per course+standard
- `missing_assignments` — students missing required assignments
- `zeros` — zero or missing scores
- `to_update` — assignment point discrepancies between DB and IC
- `mastery_to_update` — mastery point discrepancies between DB and IC
- `ic_names` — IC names present in one source but not the other
- `ic_assignments` — IC assignment names with max points per course
- `needs_assignment_point_values` — IC assignments not yet mapped to `assignment_point_values`
- `grades` — assignment points per student (used by `dump-grades.js` queries)

---

## Orphaned Tables in `actual-schema.sql` Not in `schema.sql`

These exist in the live database but were created outside `schema.sql`. They appear
to be migration artifacts or scratch tables and are not referenced by any script:

| Table | Notes |
|-------|-------|
| `form_assignments` | Separate from `form_assessments` — looks like an earlier name for the same concept |
| `assignment_courses` | Scratch import table (`assignment_id TEXT, course_id TEXT`) |
| `all_asssignments` | Typo in name; scratch import table |
| `all_assignments` | Cleaner version of same scratch table |
| `temp_aw` | Temporary assignment weights table (`assignment_id, standard, weight`) |
| `old_excused` | Old copy of `excused_assignments` data |

These could all be dropped directly (no `schema.sql` changes needed); `cleanup.sql`
could be extended to include them.
