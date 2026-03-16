# TODO

## Small

Items here can be done directly in the current branch. The user will tell you
when to commit.

- [ ] Make assignment sorting on `/checklist` page in `app.js` only show
      assignments that haven't already been graded. And show them all in a table
      and use the searchbox to limit what rows are shown.

## Needs plan

Items in here should result in a new plan file in `plans/`. Feel free to ask
questions about requirements if the item is not clear enough about what is
wanted.

## Large

- [ ] Unify Java and Javascript speedrun and history testing scripts. Make
      Speedrun.java and modules/speedrun.js both spit out JSON data in the same
      format containing the history of the speedrun and then write a single
      Javascript script that can invoke either of them as appropriate and then
      is responsible for rendering the history in a standard way (e.g. showing
      the elapsed time, number of tests passed at each change, etc.)

## Plans

This is where you put new items to actually implement a plan, after you have
written the plan.

## Done

Move newly done items to the **bottom** of this list so is is kept in
chronological order from oldest to newest.


- [x] On the `/checklists` page, deleting a criterion column should update the
      points and scores for the whole table.
