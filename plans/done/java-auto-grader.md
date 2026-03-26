# Java auto grader

Please write a plan for build into the `app.js` grading server the capability of
grading Java unit test assignments. Note that we need to invoke an external Java
program to the grading. You can see its help by running:

```
java -cp ~/hacks/bhs-cs/java/target/bhs-cs.jar com.gigamonkeys.bhs.grading.Grade --help
```

Here's an example of using it to test the latest version of some code from the
repo for the student with the github handle `nicootto-droid`.

```
java -cp ~/hacks/bhs-cs/java/target/bhs-cs.jar com.gigamonkeys.bhs.grading.Grade \
  --repo ~/teaching/current/github/nicootto-droid.git/ \
  --file c/csa/coding/number-list/NumberList.java \
  --tester NumberListTester \
  --branch c/csa/coding/number-list \
  --latest \
  --output json
```

The JSON output should be the same as the JSON produced by the Javascript unit
testing code and therefore can be analyzed the same way. The code that is
currently used to do the scoring is `grade-java-unit-tests.js` which parses
`result.json` files that are produced by `test-java-files.sh` which tests files
under a directory fetched via `get-file.js`. The java `Grade` program handles
getting the source from the given repo and running the tests and spitting out
the JSON results; we just need to read those results and update the database.
