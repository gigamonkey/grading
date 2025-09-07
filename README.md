# Grading scripts

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
