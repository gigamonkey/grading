PRAGMA foreign_keys = ON;

-- Only the assignments we are grading.
CREATE TABLE IF NOT EXISTS assignments (
  assignment_id INTEGER,
  date TEXT NOT NULL,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  PRIMARY KEY (assignment_id)
);

-- Weights for any standard an assignment affects
CREATE TABLE IF NOT EXISTS assignment_weights (
  assignment_id INTEGER,
  standard TEXT,
  weight REAL
);

-- Assignments that I don't expect every student in a class to have done.
CREATE TABLE IF NOT EXISTS optional_assignments (
  assignment_id INTEGER,
  PRIMARY KEY (assignment_id)
);

-- Assignments that individual students have been excused from doing
CREATE TABLE IF NOT EXISTS excused_assignments (
  assignment_id INTEGER,
  user_id TEXT,
  reason TEXT,
  PRIMARY KEY (assignment_id, user_id)
);

-- Assignments that are graded by scoring some number of individual questions.
-- Store the number of questions so we can compute the assignment score as the
-- average of the question scores.
CREATE TABLE IF NOT EXISTS scored_question_assignments (
  assignment_id INTEGER PRIMARY KEY,
  questions INTEGER NOT NULL
);

--------------------------------------------------------------------------------
-- Expression problem sets. Autograded from answers.json files in git.

CREATE TABLE IF NOT EXISTS expressions(
  assignment_id INTEGER,
  github TEXT,
  answered INTEGER,
  average_accuracy REAL,
  percent_first_try REAL,
  percent_done REAL,
  timestamp INTEGER,
  sha TEXT
);

DROP VIEW IF EXISTS expressions_scores;
CREATE VIEW expressions_scores AS
SELECT
  assignment_id,
  user_id,
  percent_done score
FROM expressions
JOIN roster using (github);

--------------------------------------------------------------------------------
-- Javascript unit tests. Autograded by running unit tests and recording how many
-- questions were correct (all test cases passed) and also a score that gives
-- partial credit for each question based on the fraction of test cases that
-- passed.

CREATE TABLE IF NOT EXISTS javascript_unit_tests(
  assignment_id INTEGER,
  github TEXT,
  question TEXT,
  answered INTEGER,
  correct INTEGER,
  timestamp INTEGER,
  sha TEXT
);

DROP VIEW IF EXISTS javascript_unit_tests_scores;
CREATE VIEW javascript_unit_tests_scores AS
SELECT
  assignment_id,
  user_id,
  sum(correct) / cast(questions as real) score
FROM javascript_unit_tests
JOIN scored_question_assignments USING (assignment_id)
JOIN roster USING (github)
GROUP BY assignment_id, github;

--------------------------------------------------------------------------------
-- Java unit tests. Autograded by running unit tests and recording how many
-- questions were correct (all test cases passed) and also a score that gives
-- partial credit for each question based on the fraction of test cases that
-- passed.

CREATE TABLE IF NOT EXISTS java_unit_tests(
  assignment_id INTEGER,
  github TEXT,
  correct INTEGER,
  score REAL,
  timestamp INTEGER,
  sha TEXT
);

DROP VIEW IF EXISTS java_unit_tests_scores;
CREATE VIEW java_unit_tests_scores AS
SELECT
  assignment_id,
  user_id,
  (score * questions + sum(coalesce(hg.correct, 0))) / questions score
FROM java_unit_tests
LEFT JOIN hand_graded_questions hg using (assignment_id, github)
JOIN scored_question_assignments USING (assignment_id)
JOIN roster USING (github)
GROUP BY assignment_id, github;


--------------------------------------------------------------------------------
-- Completely hand graded stuff. These are filled by importing data that is
-- produced in a Google sheet or some other system where we don't want to load
-- the details into the database.

-- Whole assignment graded 0-4
CREATE TABLE IF NOT EXISTS hand_graded(
  assignment_id INTEGER,
  github TEXT,
  grade INTEGER
);

DROP VIEW IF EXISTS hand_graded_to_scores;
CREATE VIEW hand_graded_to_scores as
SELECT
  assignment_id,
  user_id,
  score
FROM hand_graded
JOIN fps USING (grade)
JOIN roster USING (github);

-- Whole assignment scored 0.0 to 1.0. Not sure I actually need this any more
-- since we can use hand_graded_questions for many such cases.
CREATE TABLE IF NOT EXISTS hand_scored(
  assignment_id INTEGER,
  github TEXT,
  score REAL
);

-- Individual questions hand graded. At the moment this is used to augment
-- autograded unit test questions when certain questions can't be autograded.
-- But could also be used to grade all the questions on something.
CREATE TABLE IF NOT EXISTS hand_graded_questions(
  assignment_id INTEGER,
  github TEXT,
  question TEXT,
  correct INTEGER
);

--------------------------------------------------------------------------------
-- Directly scored

-- For assignments where we compute the score outside the database, e.g.
-- reflections.
CREATE TABLE IF NOT EXISTS direct_scores(
  assignment_id INTEGER,
  user_id TEXT,
  score REAL NOT NULL,
  PRIMARY KEY (assignment_id, user_id)
);


--------------------------------------------------------------------------------
-- Form based questions. We grade these by collecting all the student answers
-- and then blind scoring the unique normalized answers. Then we can compute
-- each student's grade from the score their actual answer received. For MCQ
-- questions the correct answer and the distractors are loaded automatically.
-- For FRQs we have to manually (with some help from a script) grade all the
-- given answers.

-- This table mostly exists so we can delete an assignment and all its
-- associated data by deleting it from this table and letting the delete cascade
-- to everything that references it. (Assuming those are all set up properly.)
CREATE TABLE IF NOT EXISTS form_assessments (
  assignment_id INTEGER,
  PRIMARY KEY (assignment_id)
);

-- Questions. Probably extracted from the test in some way.
CREATE TABLE IF NOT EXISTS questions (
  assignment_id INTEGER,
  question_number INTEGER,
  label TEXT,
  kind TEXT,
  question TEXT,
  PRIMARY KEY (assignment_id, question_number),
  FOREIGN KEY (assignment_id) REFERENCES form_assessments(assignment_id) ON DELETE CASCADE
);

-- The canonical answers with attached scores.
CREATE TABLE IF NOT EXISTS scored_answers (
  assignment_id INTEGER,
  question_number INTEGER,
  answer TEXT,
  score REAL NOT NULL,
  PRIMARY KEY (assignment_id, question_number, answer),
  FOREIGN KEY (assignment_id) REFERENCES form_assessments(assignment_id) ON DELETE CASCADE
);

-- Map from the raw answers to the normalized answers we store in the
-- scored_answers table.
CREATE TABLE IF NOT EXISTS normalized_answers (
  assignment_id INTEGER,
  question_number INTEGER,
  raw_answer TEXT,
  answer TEXT NOT NULL,
  PRIMARY KEY (assignment_id, question_number, raw_answer),
  FOREIGN KEY (assignment_id) REFERENCES form_assessments(assignment_id) ON DELETE CASCADE
);

-- Raw student answers.
CREATE TABLE IF NOT EXISTS student_answers (
  github TEXT,
  assignment_id INT,
  question_number INT,
  answer_number,
  raw_answer TEXT,
  PRIMARY KEY (github, assignment_id, question_number, answer_number),
  FOREIGN KEY (assignment_id) REFERENCES form_assessments(assignment_id) ON DELETE CASCADE
);

-- Compute per question scores for each student. Question score is computed
-- differently depending on the kind of question. Currently handled are choices,
-- freeanswer, ad mchoices.
DROP VIEW IF EXISTS question_scores;
CREATE VIEW question_scores AS
WITH mchoices AS (
  SELECT
    assignment_id,
    question_number,
    SUM(CASE WHEN score > 0 THEN score ELSE 0 END) high,
    SUM(CASE WHEN score < 0 THEN score ELSE 0 END) low
  FROM questions
  JOIN scored_answers USING (assignment_id, question_number)
  WHERE kind = 'mchoices'
  GROUP BY assignment_id, question_number
)
SELECT
  assignment_id,
  question_number,
  github,
  kind,
  group_concat(raw_answer) answers,
  CASE
    WHEN kind = 'freeanswer' THEN score
    WHEN kind = 'choices' THEN score
    WHEN KIND = 'mchoices' THEN (sum(score) - low) / (high - low)
  END score
FROM questions
JOIN student_answers USING (assignment_id, question_number)
JOIN normalized_answers USING (assignment_id, question_number, raw_answer)
JOIN scored_answers USING (assignment_id, question_number, answer)
LEFT JOIN mchoices USING (assignment_id, question_number)
GROUP BY github, assignment_id, question_number
ORDER BY assignment_id, question_number, github;

DROP VIEW IF EXISTS form_assessment_scores;
CREATE VIEW form_assessment_scores AS
SELECT
  assignment_id,
  user_id,
  sum(score) / count(*) score
FROM question_scores
JOIN roster using (github)
GROUP BY assignment_id, github;

--------------------------------------------------------------------------------
-- Responses to prompts. Just graded on a 0-4 scale.

-- FIXME: seems like this should have the assignment_id?
CREATE TABLE IF NOT EXISTS prompt_response_grades (
  user_id TEXT,
  posted INTEGER,
  grade INTEGER,
  PRIMARY KEY (user_id, posted)
);

--------------------------------------------------------------------------------
-- Graded by rubric. For each student we compare their work against a rubric and
-- record for each element of the rubric whether they met it or not. We can then
-- compute a total score for the assignment from the individual grades.

CREATE TABLE IF NOT EXISTS rubric_grades (
  user_id TEXT,
  assignment_id INTEGER,
  rubric_item TEXT,
  score INTEGER, -- 0 or 1
  PRIMARY KEY (user_id, assignment_id, rubric_item)
);

--------------------------------------------------------------------------------
-- Raw scores per user per assignment distilled from other tables. This could
-- possibly be a view created as a union of a the computed scores from all the
-- different specific ways of grading an assignment. For assignments that are
-- just graded on 0-4 we fill this table with the maximum score that would
-- achieve that grade, e.g. 1.0 for a 4, 0.84 for a 3, etc.

-- Mapping from percentages to four point scale grade
CREATE TABLE IF NOT EXISTS fps (
  grade INTEGER,
  minimum REAL, -- threshold for this grade
  score REAL,   -- score we use if mapping from a grade
  PRIMARY KEY (grade)
)
WITHOUT ROWID;

INSERT OR IGNORE INTO fps
  (grade, minimum, score)
VALUES
  (4, 0.85, 1.0),
  (3, 0.70, 0.84),
  (2, 0.45, 0.69),
  (1, 0.20, 0.44),
  (0, 0.0, 0.0);

-- Filled in from ../roster.json
CREATE TABLE IF NOT EXISTS roster (
  period INTEGER,
  user_id TEXT,
  student_number TEXT,
  email TEXT,
  github TEXT,
  name TEXT,
  pronouns TEXT,
  google_name TEXT,
  sortable_name TEXT,
  last_name TEXT,
  first_name TEXT,
  birthdate TEXT,
  course_id TEXT
);

CREATE TABLE IF NOT EXISTS ic_grades (
  student_number TEXT,
  standard TEXT,
  grade INTEGER,
  PRIMARY KEY (student_number, standard)
);


drop view if exists grades;
-- create view grades as
-- with
--    num_questions as (select assignment_id, count(*) num_questions from questions group by assignment_id),
--    scores as (
--      select assignment_id, user_id, sum(score == 0) wrong, sum(coalesce(score, 0)) / num_questions score
--      from roster
--      join question_scores using (user_id)
--      join num_questions using (assignment_id)
--      group by assignment_id, user_id
--    )
-- select assignment_id, user_id, period, sortable_name, wrong, score, max(coalesce(fps.grade, 0)) grade
--      from roster
--      left join scores using (user_id)
--      left join fps on score >= minimum
--      where period in (1, 2)
--      group by assignment_id, user_id
--      order by period, sortable_name;

-- Assignment scores turned into per-standard grades for the assignment.
-- FIXME: should this table have the weight too? Probably.

DROP VIEW IF EXISTS assignment_scores;
CREATE VIEW assignment_scores AS
SELECT * FROM expressions_scores
  UNION
SELECT * FROM javascript_unit_tests_scores
  UNION
SELECT * FROM java_unit_tests_scores
  UNION
SELECT * FROM direct_scores
  UNION
SELECT * FROM form_assessment_scores
  UNION
SELECT * FROM hand_graded_to_scores;

DROP VIEW IF EXISTS assignment_grades;
CREATE VIEW assignment_grades as
SELECT
  user_id,
  assignment_id,
  standard,
  s.score,
  max(grade) grade
FROM assignment_scores s
JOIN assignment_weights using (assignment_id)
JOIN fps on s.score >= minimum
GROUP BY user_id, assignment_id, standard;

DROP VIEW IF EXISTS users_standards_summary;
CREATE VIEW users_standards_summary AS
SELECT
  user_id,
  standard,
  group_concat(assignment_id order by assignment_id) assignments,
  group_concat(printf("%.2f", score), ', ' order by assignment_id) scores,
  sum(score * weight) / sum(weight) score
FROM assignment_grades g
JOIN assignment_weights USING (assignment_id, standard)
GROUP BY user_id, standard;

DROP VIEW IF EXISTS standards;
CREATE VIEW standards AS
SELECT DISTINCT PERIOD, STANDARD
FROM assignment_scores
JOIN assignment_weights w USING (assignment_id)
JOIN roster USING (user_id)
ORDER BY period, standard;

-- Standard grades derived from assignment grades and assignment weights
DROP VIEW IF EXISTS standard_grades;
CREATE VIEW standard_grades AS
SELECT
  period,
  student_number,
  sortable_name,
  standard,
  max(grade) grade
FROM standards
JOIN roster using (period)
LEFT JOIN users_standards_summary uss USING (user_id, standard)
JOIN fps ON coalesce(uss.score, 0) >= minimum
GROUP BY user_id, standard
ORDER BY sortable_name;

DROP VIEW IF EXISTS missing_assignments;
CREATE VIEW missing_assignments AS
SELECT
  user_id,
  assignment_id
FROM roster
JOIN assignments USING (course_id)
LEFT JOIN optional_assignments opt USING (assignment_id)
LEFT JOIN excused_assignments ex USING (assignment_id, user_id)
LEFT JOIN assignment_scores scores USING (user_id, assignment_id)
WHERE
  opt.assignment_id IS NULL AND
  ex.assignment_id IS NULL AND
  scores.user_id IS NULL;


DROP VIEW IF EXISTS to_update;
CREATE VIEW to_update AS
SELECT
  period,
  sortable_name,
  standard,
  ic.grade old,
  s.grade new
FROM standard_grades s
LEFT JOIN ic_grades ic USING (student_number, standard)
WHERE ic.grade is null or ic.grade <> s.grade
ORDER BY period, sortable_name;

DROP VIEW IF EXISTS unweighted;
CREATE VIEW unweighted AS
SELECT distinct assignment_id
FROM assignment_scores
LEFT JOIN assignment_weights w using (assignment_id)
WHERE w.assignment_id IS NULL;

DROP VIEW IF EXISTS wrong_answers;
CREATE VIEW wrong_answers as
select
  assignment_id,
  question_number + 1 n,
  question,
  answer,
  count(*) num,
  group_concat(github, ', ') who
FROM questions
JOIN student_answers USING (assignment_id, question_number)
JOIN normalized_answers USING (assignment_id, question_number, raw_answer)
JOIN scored_answers USING (assignment_id, question_number, answer)
WHERE score = 0
GROUP BY assignment_id, question_number, answer;
