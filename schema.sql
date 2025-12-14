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
  weight REAL,
  PRIMARY KEY (assignment_id, standard)
);

-- Weights for any standard that will be increased by an assignment if a student
-- did better on the assignment than their current grade for that standard. So a
-- student who has, say, a 2 on some standard and takes a test that touches on
-- that standard and gets a 4 will have their grade raised as if the assignment
-- had been weighted for that standard but a student who already has a 4 and
-- does worse won't have their grade lowered. This allows students to
-- demonstrate improved mastery of old standards without penalizing them on old
-- standards due to poor performance on new material.
CREATE TABLE IF NOT EXISTS secondary_weights (
  assignment_id INTEGER,
  standard TEXT,
  weight REAL,
  PRIMARY KEY (assignment_id, standard)
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

-- FIXME: combine this table with speedrunnables

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
  sha TEXT,
  PRIMARY KEY (assignment_id, github)
) WITHOUT ROWID;

DROP VIEW IF EXISTS java_unit_tests_scores;
CREATE VIEW java_unit_tests_scores AS
SELECT
  assignment_id,
  user_id,
  (round(score * questions) + sum(coalesce(hg.correct, 0))) / questions score
FROM java_unit_tests
LEFT JOIN hand_graded_questions hg using (assignment_id, github)
JOIN scored_question_assignments USING (assignment_id)
JOIN roster USING (github)
GROUP BY assignment_id, github;


--------------------------------------------------------------------------------
-- Completely hand graded stuff. These are filled by importing data that is
-- produced in a Google sheet or some other system where we don't want to load
-- the details into the database.

-- Whole assignment graded 0-4. Useful for assignments graded just on vibes in a
-- spreadsheet. Translated to a score is the hand_graded_to_scores view.
CREATE TABLE IF NOT EXISTS hand_graded(
  assignment_id INTEGER,
  github TEXT,
  grade INTEGER,
  PRIMARY KEY (assignment_id, github)
) WITHOUT ROWID;

-- Whole assignment scored 0.0 to 1.0. Useful for assignments scored by hand in
-- a spreadsheet.
CREATE TABLE IF NOT EXISTS hand_scored(
  assignment_id INTEGER,
  github TEXT,
  score REAL,
  PRIMARY KEY (assignment_id, github)
);

DROP VIEW IF EXISTS hand_graded_to_scores;
CREATE VIEW hand_graded_to_scores as
SELECT
  assignment_id,
  user_id,
  score
FROM hand_graded
JOIN fps USING (grade)
JOIN roster USING (github)

UNION

SELECT
  assignment_id,
  user_id,
  score
FROM hand_scored
JOIN roster using (github);

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
WITH num_questions as (
  select assignment_id, count(*) questions from questions group by assignment_id
)
SELECT
  assignment_id,
  user_id,
  sum(score) / questions score
FROM question_scores
JOIN num_questions using (assignment_id)
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

-- Information needed to grade speedruns
CREATE TABLE IF NOT EXISTS speedrunnables (
  assignment_id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  questions INTEGER
);

CREATE TABLE IF NOT EXISTS speedrunnable_standards (
  assignment_id INTEGER,
  standard TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  decay REAL NOT NULL DEFAULT 0.8,
  PRIMARY KEY (assignment_id, standard)
);

-- Loaded from non-abandoned speedruns from the server but only those that have
-- been recorded as finished.
CREATE TABLE IF NOT EXISTS completed_speedruns (
  speedrun_id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  started_at INTEGER NULL,
  first_sha TEXT NULL,
  finished_at INTEGER NULL,
  last_sha TEXT NULL
);

-- Loaded from non-abandoned speedruns from the server including ones still in
-- progress. This was needed at the beginning when the Javascript speedruns
-- didn't mark themselves done. Now it is mainly useful for tracking down
-- speedruns without having to touch the production database.
CREATE TABLE IF NOT EXISTS started_speedruns (
  speedrun_id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  started_at INTEGER NULL,
  first_sha TEXT NULL,
  finished_at INTEGER NULL,
  last_sha TEXT NULL
);

-- Record whether speedrun was acceptable or not.
CREATE TABLE IF NOT EXISTS graded_speedruns (
  speedrun_id INTEGER PRIMARY KEY,
  ok INTEGER NOT NULL,
  FOREIGN KEY (speedrun_id) REFERENCES completed_speedruns(speedrun_id) ON DELETE CASCADE
) WITHOUT ROWID;

DROP VIEW IF EXISTS hydrated_speedruns;
CREATE VIEW hydrated_speedruns AS
SELECT
  s.*,
  a.date,
  a.course_id,
  a.title,
  r.github,
  kind,
  questions
FROM completed_speedruns s
JOIN roster r USING (user_id)
JOIN speedrunnables USING (assignment_id)
JOIN assignments a using (assignment_id);

DROP VIEW IF EXISTS ungraded_speedruns;
CREATE VIEW ungraded_speedruns AS
SELECT * from hydrated_speedruns
LEFT JOIN graded_speedruns USING (speedrun_id)
WHERE graded_speedruns.speedrun_id IS NULL;

DROP VIEW IF EXISTS open_speedruns;
CREATE VIEW open_speedruns AS
SELECT
  s.*,
  r.github,
  kind,
  questions
FROM started_speedruns s
JOIN roster r USING (user_id)
JOIN speedrunnables USING (assignment_id)
WHERE last_sha IS NULL;

-- Count of number of successful speedruns per user and assignment
DROP VIEW IF EXISTS speedrun_points;
CREATE VIEW speedrun_points AS
SELECT user_id, assignment_id, COUNT(*) runs
FROM completed_speedruns
JOIN graded_speedruns USING (speedrun_id)
WHERE ok
GROUP BY user_id, assignment_id;


-- This view only contains scores that actually exist. If a student hasn't done
-- an assignment they will have no entry in this table.
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

-- This view adds the 0-4 grade but also fills in any missing assignments with a
-- score of 0 and grade of 0 unless the assignment was optional for everyone or
-- excused for an individual.
DROP VIEW IF EXISTS assignment_grades;
CREATE VIEW assignment_grades as
SELECT
  user_id,
  assignment_id,
  coalesce(s.score, 0) raw_score,
  max(fps.grade) raw_grade,
  coalesce(speedrun_points.runs, 0) speedruns,
  case
    when speedrun_points.runs > 0 and max(fps.grade) < 4 then max(next_fps.minimum)
    else coalesce(s.score, 0)
  end score,
  max(next_fps.grade) grade
FROM assignments
JOIN roster using (course_id)
LEFT JOIN excused_assignments ex using (assignment_id, user_id)
LEFT JOIN optional_assignments opt using (assignment_id)
LEFT JOIN assignment_scores s using (assignment_id, user_id)
LEFT JOIN speedrun_points using (user_id, assignment_id)
LEFT JOIN assignment_weights using (assignment_id)
JOIN fps on coalesce(s.score, 0) >= fps.minimum
JOIN fps next_fps on next_fps.grade = min(fps.grade + coalesce(speedrun_points.runs, 0), 4)
WHERE
  ex.assignment_id is null and
  (opt.assignment_id is null or coalesce(s.score, 0) > 0) and
   assignment_weights.assignment_id not null
GROUP BY user_id, assignment_id;


-- Speedruns that have been accepted
DROP VIEW IF EXISTS good_speedruns;
CREATE VIEW good_speedruns AS
SELECT *
FROM completed_speedruns
JOIN graded_speedruns USING (speedrun_id)
WHERE ok;

-- Dynamic assignment weighting for speedruns of assignments that aren't otherwise graded.
DROP VIEW IF EXISTS dynamic_weights;
CREATE VIEW dynamic_weights AS
SELECT
  assignment_id,
  user_id,
  standard,
  ss.weight * (1 - power(decay, count(*))) / (1 - decay) weight
FROM good_speedruns
JOIN speedrunnable_standards ss using (assignment_id)
GROUP BY assignment_id, user_id, standard;

DROP VIEW IF EXISTS all_weights;
CREATE VIEW all_weights AS
SELECT
  assignment_id,
  user_id,
  standard,
  weight
FROM assignment_weights
JOIN roster

UNION

SELECT assignment_id, user_id, standard, weight
FROM dynamic_weights;

DROP VIEW IF EXISTS users_standards_summary;
CREATE VIEW users_standards_summary AS
WITH
  with_speedruns AS (
    -- normal grades
    SELECT * FROM assignment_grades

    UNION

    -- freestanding speedruns as grades
    SELECT
      user_id,
      assignment_id,
      1.0 raw_score,
      4 raw_grade,
      0 speedruns,
      1.0 score,
      4 grade
    FROM good_speedruns
  )
SELECT
  user_id,
  standard,
  group_concat(assignment_id order by assignment_id) assignments,
  group_concat(weight order by assignment_id) weights,
  group_concat(printf("%.2f", score), ', ' order by assignment_id) scores,
  sum(score * weight) / sum(weight) score
FROM with_speedruns g
JOIN all_weights USING (assignment_id, user_id)
GROUP BY user_id, standard;

-- The standards that exist.
DROP VIEW IF EXISTS standards;
CREATE VIEW standards AS
SELECT DISTINCT period, standard
FROM assignment_scores
JOIN assignment_weights w USING (assignment_id)
JOIN roster USING (user_id)
ORDER BY period, standard;

-- Standard grades derived from assignment grades and assignment weights
DROP VIEW IF EXISTS standard_grades;
CREATE VIEW standard_grades AS
SELECT
  period,
  user_id,
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
  assignment_id,
  sortable_name,
  title
FROM roster
JOIN assignments USING (course_id)
LEFT JOIN optional_assignments opt USING (assignment_id)
LEFT JOIN excused_assignments ex USING (assignment_id, user_id)
LEFT JOIN assignment_scores scores USING (user_id, assignment_id)
WHERE
  opt.assignment_id IS NULL AND
  ex.assignment_id IS NULL AND
  scores.user_id IS NULL;

DROP VIEW IF EXISTS zeros;
CREATE VIEW zeros AS
SELECT
  sortable_name,
  period,
  course_id,
  date,
  assignment_id,
  title
FROM roster
JOIN assignments USING (course_id)
LEFT JOIN optional_assignments opt USING (assignment_id)
LEFT JOIN excused_assignments ex USING (assignment_id, user_id)
LEFT JOIN assignment_scores scores USING (user_id, assignment_id)
WHERE
  opt.assignment_id IS NULL AND
  ex.assignment_id IS NULL AND
  (scores.user_id is null OR scores.score = 0)
ORDER by sortable_name, date;

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


DROP VIEW IF EXISTS db_grades;
CREATE VIEW db_grades AS
SELECT
  user_id,
  assignment_id,
  standard,
  score,
  grade
FROM assignment_grades
JOIN assignment_weights using (assignment_id)
ORDER BY user_id, assignment_id, standard;

CREATE TABLE IF NOT EXISTS server_grades (
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  standard TEXT NOT NULL,
  score REAL NOT NULL,
  grade INTEGER NOT NULL
);
