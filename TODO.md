# TODO

## Small

## Medium

## Large

- [ ] Unify Java and Javascript speedrun and history testing scripts. Make
      Speedrun.java and modules/speedrun.js both spit out JSON data in the same
      format containing the history of the speedrun and then write a single
      Javascript script that can invoke either of them as appropriate and then
      is responsible for rendering the history in a standard way (e.g. showing
      the elapsed time, number of tests passed at each change, etc.)

## Plans

## Done

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
