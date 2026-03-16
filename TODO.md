# TODO

## Small

- [ ] Add a VIEW to schema.sql `mastery_to_update` which compares the grades in
      IC for the mastery point assignments to the mastery points each students
      has earned for each standard available from the `mastery_points` view.
      This will probably require adding a table to store the mapping between IC
      assignments and standards; you should add that definition to.

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
