PRAGMA foreign_keys = ON;

-- Assignments that should be graded. This table mostly exists so we can delete
-- an assignment and all its associated data by deleting it from this table and
-- letting the delete cascade to everything that references it. (Assuming those
-- are all set up properly.). FIXME: may want to add some more columns here such
-- as title and maybe the opens and due dates.
CREATE TABLE IF NOT EXISTS graded_assignments (
  assignment_id INTEGER,
  PRIMARY KEY (assignment_id)
);

-- Weights for any standard an assignment affects
CREATE TABLE IF NOT EXISTS assignment_weights (
  assignment_id INTEGER,
  standard TEXT,
  weight REAL,
  FOREIGN KEY (assignment_id) REFERENCES graded_assignments(assignment_id) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
-- Expression problem sets. Autograded from answers.json files in git.

CREATE TABLE expressions(
  assignment_id INTEGER,
  github TEXT,
  answered INTEGER,
  average_accuracy REAL,
  percent_first_try REAL,
  percent_done REAL,
  timestamp INTEGER,
  sha TEXT
);

--------------------------------------------------------------------------------
-- Javascript unit tests. Autograded by running unit tests and recording how many
-- questions were correct (all test cases passed) and also a score that gives
-- partial credit for each question based on the fraction of test cases that
-- passed.

CREATE TABLE javascript_unit_tests(
  assignment_id INTEGER,
  github TEXT,
  question TEXT,
  answered INTEGER,
  correct INTEGER,
  timestamp INTEGER,
  sha TEXT
);

--------------------------------------------------------------------------------
-- Java unit tests. Autograded by running unit tests and recording how many
-- questions were correct (all test cases passed) and also a score that gives
-- partial credit for each question based on the fraction of test cases that
-- passed.

CREATE TABLE java_unit_tests(
  assignment_id INTEGER,
  github TEXT,
  correct INTEGER,
  score REAL,
  timestamp INTEGER,
  sha TEXT
);

--------------------------------------------------------------------------------
-- Hand graded assignments. No score since I just assign 0-4 grade to each
-- student.

CREATE TABLE hand_graded(
  assignment_id INTEGER,
  github TEXT,
  grade INTEGER
);

--------------------------------------------------------------------------------
-- Hand scored assignments. Somehow I assigned a 0.0 to 1.0 score to each
-- student. Sometimes this is a way to deal with a mostly auto-graded assignment
-- that needs a few questions hand graded.

CREATE TABLE hand_scored(
  assignment_id INTEGER,
  github TEXT,
  score REAL
);

--------------------------------------------------------------------------------
-- Form based questions. We grade these by collecting all the student answers
-- and then blind scoring the unique normalized answers. Then we can compute
-- each student's grade from the score their actual answer received. For MCQ
-- questions the correct answer and the distractors are loaded automatically.
-- For FRQs we have to manually (with some help from a script) grade all the
-- given answers.

-- Questions. Probably extracted from the test in some way.
CREATE TABLE IF NOT EXISTS questions (
  assignment_id INTEGER,
  question_number INTEGER,
  label TEXT,
  kind TEXT,
  question TEXT,
  PRIMARY KEY (assignment_id, question_number),
  FOREIGN KEY (assignment_id) REFERENCES graded_assignments(assignment_id) ON DELETE CASCADE
);

-- The canonical answers with attached scores.
CREATE TABLE IF NOT EXISTS scored_answers (
  assignment_id INTEGER,
  question_number INTEGER,
  answer TEXT,
  score REAL NOT NULL,
  PRIMARY KEY (assignment_id, question_number, answer),
  FOREIGN KEY (assignment_id) REFERENCES graded_assignments(assignment_id) ON DELETE CASCADE
);

-- Map from the raw answers to the normalized answers we store in the
-- scored_answers table.
CREATE TABLE IF NOT EXISTS normalized_answers (
  assignment_id INTEGER,
  question_number INTEGER,
  raw_answer TEXT,
  answer TEXT NOT NULL,
  PRIMARY KEY (assignment_id, question_number, raw_answer),
  FOREIGN KEY (assignment_id) REFERENCES graded_assignments(assignment_id) ON DELETE CASCADE
);

-- Raw student answers.
CREATE TABLE IF NOT EXISTS student_answers (
  user_id TEXT,
  assignment_id INT,
  question_number INT,
  answer_number,
  raw_answer TEXT,
  PRIMARY KEY (user_id, assignment_id, question_number, answer_number),
  FOREIGN KEY (assignment_id) REFERENCES graded_assignments(assignment_id) ON DELETE CASCADE
);


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
-- different specific ways of grading an assignment.

CREATE TABLE assignment_scores (
  user_id TEXT,
  assignment_id INTEGER,
  score REAL
);

-- Mapping from percentages to four point scale grade
CREATE TABLE IF NOT EXISTS fps (
  minimum REAL, grade INTEGER,
  PRIMARY KEY (minimum, grade)
)
WITHOUT ROWID;

INSERT OR IGNORE INTO fps
  (minimum, grade)
VALUES
  (0.85, 4),
  (0.70, 3),
  (0.45, 2),
  (0.20, 1),
  (0.0, 0);

-- Filled in from ../roster.json
CREATE TABLE IF NOT EXISTS roster (
  period INTEGER,
  user_id TEXT,
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

-- Compute per question scores for each student. Question score is computed
-- differently depending on the kind of question. Currently handled are choices,
-- freeanswer, ad mchoices.
drop view if exists question_scores;
create view question_scores as
with mchoices as (
  select
    assignment_id,
    question_number,
    sum(case when score > 0 then score else 0 end) high,
    sum(case when score < 0 then score else 0 end) low
  from questions
  join scored_answers using (assignment_id, question_number)
  where kind = 'mchoices'
  group by assignment_id, question_number
)
select
  assignment_id,
  question_number,
  user_id,
  kind,
  group_concat(raw_answer) answers,
  case
    when kind = 'freeanswer' then score
    when kind = 'choices' then score
    when kind = 'mchoices' then (sum(score) - low) / (high - low)
  end score
from questions
join student_answers using (assignment_id, question_number)
join normalized_answers using (assignment_id, question_number, raw_answer)
join scored_answers using (assignment_id, question_number, answer)
left join mchoices using (assignment_id, question_number)
group by user_id, assignment_id, question_number
order by assignment_id, question_number, user_id;

drop view if exists grades;
create view grades as
with
   num_questions as (select assignment_id, count(*) num_questions from questions group by assignment_id),
   scores as (
     select assignment_id, user_id, sum(score == 0) wrong, sum(coalesce(score, 0)) / num_questions score
     from roster
     join question_scores using (user_id)
     join num_questions using (assignment_id)
     group by assignment_id, user_id
   )
select assignment_id, user_id, period, sortable_name, wrong, score, max(coalesce(fps.grade, 0)) grade
     from roster
     left join scores using (user_id)
     left join fps on score >= minimum
     where period in (1, 2)
     group by assignment_id, user_id
     order by period, sortable_name;

-- Assignment scores turned into per-standard grades for the assignment.
-- FIXME: should this table have the weight too? Probably.
CREATE VIEW assignment_grades as
SELECT
  user_id,
  assignment_id,
  standard,
  score,
  max(grade) grade
FROM assignment_scores
JOIN assignment_weights using (assignment_id)
JOIN fps on score >= minimum
GROUP BY user_id, assignment_id, standard;

-- Standard grades derived from assignment grades and assignment weights
CREATE VIEW standards as
WITH combined AS (
  SELECT
    user_id,
    standard,
    group_concat(assignment_id order by assignment_id) assignments,
    group_concat(score order by assignment_id) scores,
    sum(score * weight) / sum(weight) score
  FROM assignment_grades g
  JOIN assignment_weights USING (assignment_id, standard)
  GROUP BY user_id, standard
)
SELECT
  user_id,
  period,
  assignments,
  scores,
  sortable_name,
  standard,
  score,
  max(grade) grade
FROM combined
JOIN roster USING (user_id)
JOIN fps ON score >= minimum
GROUP BY user_id, standard
ORDER BY sortable_name;
