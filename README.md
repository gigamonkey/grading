# Grading scripts

General approach for things stored in Github is to copy the file from the repo
into a directory under csa/, itp/, or eng/ to take a snapshot. Then grading
scripts should process those files. Then if a particular student finishes late
or whatever, we should have a script that grabs just their work from their
github mirror and puts it into the directory. We should also save the timestamp
and the SHA of the commit it came from.

Grading scripts will also need the `assignent.json` file we can fetch from the
server with the `get-assignment-json.js` script which takes the assignment id
and the directory where to save `assignment.json`. Some grading scripts may need
other information about the assignment such as the number of questions which can
be added to the `assignments.json` file after it is fetched. (May want to move
it out to another file or, better yet, embed all the information necessary to
grade an assignment in the assignment output itself.)

## Form based quizzes and tests

Step 1. Load the questions for a given assignment with `markup-to-questions.py`
which takes the assignment id and the path to the Markup file. Also loads the
choices and mchoices answers into `normalized_answers` all with scores of 0.0.

Step 2. Load student answers with `get-answers.py` which takes the assignment id
and course id and then gets the information it needs about the assignment and
the github repos of the students it was assigned to from the server. Loads all
the answers into `student_answers` and the normalized versions into
`normalized_answers`.

Step 3. Score all the answers with `score-answers.py` which for each question
finds unique normalized answers that haven't been assigned a score and prompts
for a score. Handles choices (pick the one correct choice), mchoices (pick all
the correct choices), and freeanswer (ask for the score for each unique answer).

We could short cicuit step 3 by preloading scores for the answers to MCQ
questions if we stored those with the questions or in a separate key.

## ItP expressions problem sets

Graded with `grade-expressions.js` to insert into the expression table from
which the assignment scores/grades are derived. The script requires an
assignment.json in the directory containing the snapshots of student work.

## Javascript unit test assignments

Step 1. Export student code to directory named for the assignment. With `repo
one-file`.

Step 2. Get the `assignment.json` file via the API
https://bhs-cs.gigamonkeys.com/api/assignment/$assignentId and save it in the
directory. (Should automate this in `javascript-unit-tests-questions.js`.)

Step 3. Load scores with `./grade-javascript-unittest.sh` run from grading e.g.
`./grade-javascript-unittest.sh itp/geometric-functions/`. That fills a `db.db`
in the assignment directory with scores that are then loaded into the main
course db.

## Java unit test assignments

Step 1. Export student code to directory named for the assignment. With `repo
one-file`.

Step 2. Get the `assignment.json` file via the API
https://bhs-cs.gigamonkeys.com/api/assignment/$assignentId and save it in the
directory. (Should automate this in `javascript-unit-tests-questions.js`.)

Step 3. Run the unit tests with `./test-java-files.sh` specifying the tester
class and a list of files. Something like:

  ./test-java-files.sh LoopIdiomsTester csa/loop-idioms/*/LoopIdioms.java

Step 4. (Optional) find any directories with `broken.txt` in them and make
minimal fixes necessary to get the code to compile. Then rerun
`test-java-files.sh`.

Step 5. Load scores with `./grade-java-unittest.sh` run from grading e.g.
`./grade-javascript-unittest.sh itp/geometric-functions/`. That fills a `db.db`
in the assignment directory with scores that are then loaded into the main
course db.

# Adding weights

Use `weight-assignment.js` to assign a weight to one or more standards for an
assignment by assignment id after the assignment has been created in the db.
Scores for an assignment are only computed
