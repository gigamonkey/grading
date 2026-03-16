# Checklist grader

Add a page to `app.js` for doing checklist grading. The basic idea is that we're
grading student work on a particular assignment by looking at it to determine if
it meets certain criteria but we may want to add criteria as we go and then keep
track of whether we've checked each student submission against all the criteria.

## UI

The basic UI is a table table with a row for each student and columns listing
the student name and github handle and as many other columns as criteria we've
defined.

Initially the only criteria is "Turned in" but there should be a + mark to add a
column which will then be added to the table with an editable text box to enter
the column header.

When a column is added, the cell for each student in that column starts empty.
Clicking it changes it to a green check mark. Clicking it again changes it to a
red X. And clicking it again clears it. That way we can both quickly change
things but also tell which ones we've evaluated at all.

## In the database

In the database we need to store all the criteria information. So probably we
need to a table `checklist_criteria` to store the (`assignment_id`,
`criteria_label`) pairs and then another table, `checklist_marks` to store
(`user_id`, `assignment_id`, `criteria_label`, `value`) quads.

When a column is added in the UI add a row to `checklist_critera`. And when the
user clicks the cells on the page, upsert a value into `checklist_marks`.
