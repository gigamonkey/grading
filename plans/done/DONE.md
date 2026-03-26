# DONE

- [x] Add a VIEW to schema.sql `mastery_to_update` which compares the grades in
      IC for the mastery point assignments to the mastery points each students
      has earned for each standard available from the `mastery_points` view.
      This will probably require adding a table to store the mapping between IC
      assignments and standards; you should add that definition to.

- [x] Please write an add-overide.js script that prompts the user for the name
      of a student, an assignment identifier which can be either an
      `assignment_id` or part of the assignment title, the score, and the reason
      and adds an entry in the `scor_overrides` table. It should make sure
      student and assignment are uniquely identified. If multiple students match
      the name given, present the user with a choice, listing the sortable name,
      period, and course_id of each. And if the assignment is ambiguous show the
      possible choices and let them pick.

- [x] Write a plan for creating a HTMX based web app for managing the gradebook
      database. Some initial functionality would be simple things like providing
      a web interface for the functionality provided by scripts like
      `add-assignment.js` and `add-override.js` and also web based view of
      grades to be updated in IC. Basically various kinds of queries and
      reports. (plan: [gradebook-web-app.md](plans/gradebook-web-app.md))

- [x] Compare `schema.sql` (the file that we use to define the schema of db.db)
      with `actual-schema.sql` (the output of running `sqlite3 db.db .schema`)
      and identify any dead code in `schema.sql`. Be a bit careful; it's
      possible that there are things created in `schema.sql` and then dropped
      after being used for something, i.e. just because something isn't present
      in `actual-schema.sql` doesn't mean it can be removed. On the other hand,
      there are `DROP IF EXISTS` statements in `schema.sql` of things that no
      longer exist; those should be marked as dead. Don't delete anything from
      `schema.sql` but add comments that start with `-- DEAD?` to mark anything
      you think we can remove.

- [x] Report on untracked files. Please use the command `git ls-files ':(glob)*'
      -o --exclude-standard` to get a list of currently untracked files in root
      of this repo and write a report in the file UNTRACKED.md that categorizes
      them as "Should be added" if they seem to contain code that something else
      in the repo depends on, "Seems useful", if they aren't obviously depended
      on by anything but seem useful given the current state of things (e.g. the
      work with the current database schema, etc.) or "Probably trash" for
      everything else. Do not delete any files; just write the report.

- [x] Implement the plan in [plans/gradebook-web-app.md](plans/gradebook-web-app.md)

- [x] Analyze all the .js scripts in this directory that are meant to be run
      from the command line and write a plan for cleaning them up in
      `plans/scipt-cleanup.md`. Descibe each script briefly and try to group
      them by related functionality. Then write a section about how to factor
      out duplicate functionality and delete dead code. There may be scripts
      aren't useful any longer, for instance if they are be designed to work
      with tables or view in the db that no lonnger exist.
      (plan: [script-cleanup.md](plans/script-cleanup.md))

- [x] Implement [checklist-grader](plans/checklist-grader.md).

- [x] Add the ability to edit individual Standard, IC name, and Points values on
      the `/assignments` page in `app.js`.

- [x] Add a `checklist_scores` view to `schema.sql` providing `(assignment_id,
      user_id, score)` triples computed from `checklist_criteria` and
      `checklist_marks`.

- [x] Show existing mappings on `/mastery-ic-names` page in `app.js` and make
      them editable.

- [x] Add a students summary page (can be at `/students/:user_id` that shows all
      their grades on assignments sorted from most to least recent.

- [x] Write a plan as requested in `plans/java-auto-grader.md`.
