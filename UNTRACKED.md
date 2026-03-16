# Untracked Files Report

## Should Be Added

These files contain code that other tracked files depend on, or are core scripts for the grading workflow.

| File | Notes |
|------|-------|
| `add-assignment.js` | Core script; used in README workflows and likely called directly |
| `load-direct-scores.js` | Loads scores into `direct_scores` table; part of grading workflow |
| `javascript-test-history.js` | Uses `api.js`, `modules/repo.js`, `modules/grading.js`, `modules/speedruns.js`, `modules/test-javascript.js` — full integration |
| `compare-dom.js` | Uses `modules/lcs.js`; similarity analysis tool |
| `bhs-data-root.sh` | Sets `BHS_DATA_ROOT` env var needed by Java test infrastructure |
| `test-java-stdin.sh` | Variant of `test-java-files.sh` for stdin-based Java tests |
| `api.py` | Python API client; imported by `get-expressions.py`, `get-student-answers.py`, `grade-prompt-responses.py` |
| `get-expressions.py` | Fetches ITP expression data; `import api` |
| `get-student-answers.py` | Fetches form quiz answers; `import api` |
| `free-answers.py` | Loads form quiz answers from local repos |
| `grade-prompt-responses.py` | Grades prompt responses; `import api` |
| `speedrun-standards.sql` | INSERT statements for `speedrunnable_standards`; likely the canonical source of that data |
| `grade` | Shell script; invokes the grading pipeline (references `csa-repos.txt`) |
| `tag-db-backup` | Shell script for managing db backup symlinks |

---

## Seems Useful

These aren't directly depended on but are relevant to ongoing work with the current schema/data.

| File | Notes |
|------|-------|
| `semester.sql` | Defines `semester_numbers` view; looks like a useful reporting query |
| `show-grades.sql` | Ad-hoc grade report query for a specific assignment |
| `best-worst.sql` | Grade scenario analysis (best/worst case per student) |
| `bonus-weights.sql` | Draft `total_weights` view with recursive CTE |
| `expression-standards.sql` | Standards summary query for ITP expressions |
| `new-sql.sql` | Draft `new_users_standards_summary` view — candidate for merging into schema |
| `newuss.sql` / `olduss.sql` | New and old versions of `users_standards_summary` view — migration artifacts |
| `new-assignment-grades.sql` | Draft `new_assignment_grades` view |
| `load-mastery-speedruns-for-assignments.sql` | Useful query for populating `mastery_speedruns` from completed speedrun data |
| `unpointed-mastery-speedruns.sql` | Finds speedruns not yet in `mastery_speedruns` |
| `new-mastery-speedruns.sql` | Similar — finds assignments needing mastery speedrun entries |
| `running.sql` | Ad-hoc reporting query |
| `dump-expressions-grades.sql` | Exports ITP expression grades to JSON |
| `dump-javascript-unittest-grades.sql` | Exports JS unit test grades; defines a local `grades` view |
| `dump-itp-exam-timelines.sh` | Dumps exam timeline data |
| `question_scores.sql` | Draft/alternate `question_scores` view |
| `question-scores-to-assignment-scores.sql` | Draft alternate `assignment_scores` view |
| `speedruns.sql` | Draft `good_speedruns` view |
| `fix-answers.sql` | One-time answer normalization fixes (commented out) — worth keeping as history |
| `update-hand-graded.sql` | Migration: renames `hand_graded` table |
| `dump-47-67-80.sql` | DB dump of form assessment data for assignments 47, 67, 80 |
| `old_student_answers.sql` | Dump of old student answers for assignment 80 |
| `old_student_answers.sql` / `olduss.sql` | Old schema migration artifacts |
| `mastery.csv` / `all-assignments.csv` / `assignments.csv` | Exported grade/assignment data |
| `graded-assignments.csv` / `graded-in-grading.csv` / `graded-on-site.csv` / `graded-speedruns.csv` | Grading status snapshots |
| `assignment-courses.csv` / `assignment-titles.csv` / `assignment-weights.csv` / `new-assignment-weights.csv` | Assignment metadata exports |
| `card-sort-scores.tsv` | Scored card sort data |
| `string-list-mastery.tsv` / `new-ad-hoc.tsv` / `new-reflections.tsv` / `old-reflections.tsv` | Mastery/reflection score data |
| `p3-name-to-github.tsv` / `p3-names.tsv` / `p3-sortable-to-github.tsv` / `p4-ic-grades.tsv` | Roster/grade mapping data for specific periods |
| `pairs.tsv` | Possibly similarity/pair data |
| `open-speedruns.json` / `reflections.json` / `new-all.json` | Snapshots of server data |
| `leo-mackoy.json` / `ryan-vihaan.json` | Per-student data snapshots |
| `fake-speedruns.csv` / `new-speedruns.csv` | Speedrun data exports |
| `grades-in-json.csv` | Grades export |
| `itp-final-sparklines.txt` / `itp-final-sparklines2.txt` / `itp-final-timelines.txt` | ITP final exam timeline/sparkline output |
| `first-web.txt` | Commit history output for a specific assignment |
| `recheck.txt` | Notes on speedruns needing manual recheck |
| `csa-repos.txt` | List of CSA student repos; referenced by `grade` and `equals-not-equals-equals-equals` scripts |
| `equals-not-equals-equals-equals` | Shell script that iterates over `csa-repos.txt` |
| `google-java-format-1.30.0-all-deps.jar` | Java formatter jar; used for code formatting |
| `grade-changes.diff` | Diff of grade changes between two snapshots |
| `speedrun` | Shell script with a specific speedrun grading invocation (looks like a saved command) |

---

## Probably Trash

These appear to be scratch/test files with no lasting value.

| File | Notes |
|------|-------|
| `foo.js` | Scratch JS file |
| `foo.pl` | Scratch Perl file |
| `foo.sh` | Scratch shell file |
| `foo.sql` | Scratch SQL (IC names comparison query — now covered by `ic_names` view in schema) |
| `foo.txt` | Scratch text |
| `bar.pl` | Scratch Perl file |
| `bar.txt` | Scratch text |
| `baz.txt` | Scratch text |
| `empty.txt` | Empty file |
| `190-scores.tsv` / `261-scores.tsv` / `282-scores.tsv` / `291-scores.tsv` / `306-scores.tsv` / `312-scores.tsv` | Per-assignment score TSVs (one-off exports, likely stale) |
| `340.tsv` / `365.tsv` | Similar one-off assignment score exports |
| `347-combo.tsv` / `347-db.tsv` / `347-files.tsv` / `347-in-db.tsv` / `347-in-fs.tsv` | Assignment 347 investigation files |
| `olduss.sql` | Superseded by `newuss.sql` / schema |
| `dump-47-67-80.sql` | One-time data migration dump |
| `old_student_answers.sql` | Old student answers dump |
