PRAGMA foreign_keys = ON;

-- Only the assignments we are grading.
CREATE TABLE IF NOT EXISTS assignments (
  assignment_id INTEGER,
  date TEXT NOT NULL,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  PRIMARY KEY (assignment_id)
);

-- The kind of assignment as reported by the server API (e.g. "coding",
-- "questions"). Not all assignments will have a kind recorded.
CREATE TABLE IF NOT EXISTS assignment_kinds (
  assignment_id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL
);

-- Assignments that I don't expect every student in a class to have done.
CREATE TABLE IF NOT EXISTS optional_assignments (
  assignment_id INTEGER,
  PRIMARY KEY (assignment_id)
);

-- Server assignments explicitly marked as not for grading so they don't
-- show up in the "browse server assignments" view.
CREATE TABLE IF NOT EXISTS not_for_grade (
  assignment_id INTEGER PRIMARY KEY
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
  case
    when hg.correct is not null then (round(score * questions) + sum(coalesce(hg.correct, 0))) / questions
    else score
  end score
FROM java_unit_tests
LEFT JOIN hand_graded_questions hg using (assignment_id, github)
JOIN scored_question_assignments USING (assignment_id)
JOIN roster USING (github)
GROUP BY assignment_id, github;

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
  timestamp INTEGER,
  sha TEXT,
  PRIMARY KEY (github, assignment_id, question_number, answer_number),
  FOREIGN KEY (assignment_id) REFERENCES form_assessments(assignment_id) ON DELETE CASCADE
);

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

-- Compute per question scores for each student. Question score is computed
-- differently depending on the kind of question. Currently handled are choices,
-- freeanswer, and mchoices.
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
-- Rubric grading. Each assignment can have rubric items with point values. For
-- each student we record the fraction (0.0–1.0) of each item's points earned.
-- No row in rubric_marks = ungraded; fraction=0.0 = graded zero.
-- The 'kind' column on rubric_items determines how the fraction is computed:
--   'manual' (default): set by the grader via the UI
--   'word_count': auto-computed from student's word count vs parameters.minWords

DROP TABLE IF EXISTS rubric_grades;

CREATE TABLE IF NOT EXISTS rubric_items (
  assignment_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  label TEXT NOT NULL,
  points REAL NOT NULL DEFAULT 1,
  kind TEXT NOT NULL DEFAULT 'manual',
  parameters TEXT, -- JSON, shape depends on kind. E.g. {"minWords": 500}
  PRIMARY KEY (assignment_id, seq)
);

-- Per-assignment config for the md-grader (branch and file path).
CREATE TABLE IF NOT EXISTS rubric_configs (
  assignment_id INTEGER NOT NULL PRIMARY KEY,
  branch TEXT NOT NULL,
  file_path TEXT NOT NULL
);

-- Tracks which git commit was graded for each student/assignment.
CREATE TABLE IF NOT EXISTS rubric_submissions (
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  sha TEXT NOT NULL,
  timestamp INTEGER,
  PRIMARY KEY (user_id, assignment_id, sha)
);

DROP TABLE IF EXISTS rubric_marks;
CREATE TABLE IF NOT EXISTS rubric_marks (
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  sha TEXT NOT NULL,
  seq INTEGER NOT NULL,
  fraction REAL NOT NULL DEFAULT 0, -- 0.0 to 1.0
  PRIMARY KEY (user_id, assignment_id, sha, seq),
  FOREIGN KEY (user_id, assignment_id, sha)
    REFERENCES rubric_submissions(user_id, assignment_id, sha)
);

--------------------------------------------------------------------------------
-- Per-user, per-assignment score overrides. Can be used to zero out scores in
-- cases of cheating.

CREATE TABLE IF NOT EXISTS score_overrides (
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  score REAL NOT NULL,
  reason TEXT,
  PRIMARY KEY (user_id, assignment_id)
);

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

-- Students dropped from the roster. Same schema as roster so we can move
-- students back and forth.
CREATE TABLE IF NOT EXISTS dropped (
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

-- Max point values per IC assignment, from row 2 of the gradebook CSV export.
CREATE TABLE IF NOT EXISTS ic_point_values (
  ic_name TEXT PRIMARY KEY,
  points INTEGER NOT NULL
);

-- Grades loaded from IC grade export so we can compare what's in IC to what we
-- think it should be.
CREATE TABLE IF NOT EXISTS ic_grades (
  student_number TEXT,
  ic_name TEXT,
  points INTEGER,
  PRIMARY KEY (student_number, ic_name)
);

--------------------------------------------------------------------------------
--- Speedruns: we need to pull speedrun info from the class webserver and then
--- record here if they were accepted.

-- Information needed to grade speedruns
CREATE TABLE IF NOT EXISTS speedrunnables (
  assignment_id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  questions INTEGER
);

-- What standards is a given assignment speedrunnable for.
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

-- Cached per-commit test results for speedruns so we don't re-run tests on every view.
CREATE TABLE IF NOT EXISTS speedrun_commits (
  speedrun_id INTEGER NOT NULL,
  sha TEXT NOT NULL,
  timestamp TEXT,
  delta_seconds INTEGER,
  elapsed_seconds INTEGER,
  passed INTEGER,
  attempted INTEGER,
  error TEXT,
  PRIMARY KEY (speedrun_id, sha),
  FOREIGN KEY (speedrun_id) REFERENCES completed_speedruns(speedrun_id) ON DELETE CASCADE
);

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

-- Speedruns that have been accepted
DROP VIEW IF EXISTS good_speedruns;
CREATE VIEW good_speedruns AS
SELECT *
FROM completed_speedruns
JOIN graded_speedruns USING (speedrun_id)
WHERE ok;


-- SHA and timestamp of the work that was graded, per (assignment_id, user_id).
-- Not all score sources have this metadata (e.g. direct_scores, checklist_marks).
DROP VIEW IF EXISTS graded_work_metadata;
CREATE VIEW graded_work_metadata AS
SELECT assignment_id, user_id, timestamp, sha
FROM expressions JOIN roster USING (github)
UNION ALL
SELECT assignment_id, user_id, min(timestamp), sha
FROM javascript_unit_tests JOIN roster USING (github)
GROUP BY assignment_id, github
UNION ALL
SELECT assignment_id, user_id, timestamp, sha
FROM java_unit_tests JOIN roster USING (github)
UNION ALL
SELECT assignment_id, user_id, min(timestamp), sha
FROM student_answers JOIN roster USING (github)
GROUP BY assignment_id, github
UNION ALL
SELECT assignment_id, user_id, timestamp, sha
FROM rubric_submissions;

-- Union of all scores with their provenance
DROP VIEW IF EXISTS recorded_scores;
CREATE VIEW recorded_scores AS
SELECT *, 'expressions_scores' provenance FROM expressions_scores
  UNION
SELECT *, 'javascript_unit_tests_scores' FROM javascript_unit_tests_scores
  UNION
SELECT *, 'java_unit_tests_scores' FROM java_unit_tests_scores
  UNION
SELECT *, 'direct_scores' FROM direct_scores
  UNION
SELECT *, 'form_assessment_scores' FROM form_assessment_scores
  UNION
SELECT *, 'checklist_scores' FROM checklist_scores
  UNION
SELECT *, 'rubric_scores' FROM rubric_scores;

-- This view only contains scores that actually exist. If a student hasn't done
-- an assignment they will have no entry in this table.
DROP VIEW IF EXISTS assignment_scores;
CREATE VIEW assignment_scores AS
SELECT
  assignment_id,
  user_id,
  coalesce(o.score, rs.score) score,
  o.score is not null override
FROM recorded_scores rs
LEFT JOIN score_overrides o using (user_id, assignment_id);

-- The standards that exist.
DROP VIEW IF EXISTS standards;
CREATE VIEW standards AS
SELECT
  course_id,
  standard,
  sum(points) assignment_points,
  cast(ceiling(sum(points) * (1 / 0.85 - 1)) AS INTEGER) mastery_points
FROM assignment_point_values
JOIN assignments USING (assignment_id)
GROUP BY course_id, standard;

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
WITH scored as (select distinct assignment_id from assignment_scores)
SELECT
  user_id,
  sortable_name,
  period,
  course_id,
  date,
  assignment_id,
  title
FROM roster
JOIN assignments USING (course_id)
JOIN scored using (assignment_id)
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
  user_id,
  period,
  sortable_name,
  ic_name,
  ic.points ic,
  ap.points db
FROM assignment_points ap
LEFT JOIN ic_grades ic USING (student_number, ic_name)
WHERE ic.points is null and ap.points is not null or ic.points <> ap.points
ORDER BY period, sortable_name;

-- Mapping from (course_id, standard) to IC assignment names for mastery point grades.
CREATE TABLE IF NOT EXISTS mastery_ic_names (
  course_id TEXT NOT NULL,
  standard TEXT NOT NULL,
  ic_name TEXT NOT NULL,
  PRIMARY KEY (course_id, standard)
);

DROP VIEW IF EXISTS mastery_to_update;
CREATE VIEW mastery_to_update AS
SELECT
  mp.user_id,
  mp.period,
  mp.sortable_name,
  min.ic_name,
  ic.points ic,
  mp.points db
FROM mastery_points mp
JOIN roster r USING (user_id)
JOIN mastery_ic_names min ON min.standard = mp.standard AND min.course_id = r.course_id
LEFT JOIN ic_grades ic USING (student_number, ic_name)
WHERE ic.points IS NULL AND mp.points IS NOT NULL OR ic.points <> mp.points
ORDER BY mp.period, mp.sortable_name;

CREATE TABLE IF NOT EXISTS server_grades (
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  standard TEXT NOT NULL,
  score REAL NOT NULL,
  grade INTEGER NOT NULL
);

-- Information about required assignments that give assignment points. Each of
-- these should have an entry in IC.
CREATE TABLE IF NOT EXISTS assignment_point_values (
  assignment_id INTEGER NOT NULL,
  standard TEXT NOT NULL,
  ic_name TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL,
  PRIMARY KEY (assignment_id, standard)
);

CREATE TABLE IF NOT EXISTS mastery_assignments (
  assignment_id INTEGER NOT NULL,
  standard TEXT NOT NULL,
  points INTEGER NOT NULL,
  PRIMARY KEY (assignment_id, standard)
);

CREATE TABLE IF NOT EXISTS ad_hoc_mastery_points (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  standard TEXT NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL
);

-- Base points per standard for doing speedruns of various assignments. For
-- points with assigned values this will be the same as the assignment's point
-- value (for now we're just populating this table with the duplicate info) and
-- for assignments that weren't graded for points (e.g. boot ups) we put in some
-- base value, usually 5.
CREATE TABLE IF NOT EXISTS mastery_speedruns (
  assignment_id INTEGER NOT NULL,
  standard TEXT NOT NULL,
  base_points INTEGER NOT NULL
);

DROP VIEW IF EXISTS assigned;
CREATE VIEW assigned AS
SELECT * FROM roster JOIN assignments USING (course_id);

DROP VIEW IF EXISTS assignment_points;
CREATE VIEW assignment_points AS
SELECT
  user_id,
  student_number,
  assignment_id,
  sortable_name,
  period,
  title,
  ic_name,
  apv.points max_points,
  score,
  cast(round(score * apv.points) as integer) points
FROM assigned
JOIN assignment_point_values apv using (assignment_id)
LEFT JOIN assignment_scores USING (user_id, assignment_id);

DROP VIEW IF EXISTS mastery_assignment_points;
CREATE VIEW mastery_assignment_points AS
SELECT
  user_id,
  assignment_id,
  standard,
  sortable_name,
  title,
  ma.points max_points,
  score,
  cast(round(score * ma.points) as integer) points
FROM assigned
JOIN mastery_assignments ma using (assignment_id)
LEFT JOIN assignment_scores USING (user_id, assignment_id);

-- Speedrun mastery points decay according to a power law.
DROP VIEW IF EXISTS speedrun_mastery_points;
CREATE VIEW speedrun_mastery_points AS
WITH runs AS (
  SELECT
    user_id,
    assignment_id,
    row_number() over (partition by user_id, assignment_id order by finished_at) attempt
  FROM completed_speedruns
  JOIN graded_speedruns USING (speedrun_id)
  WHERE ok = 1
)
SELECT
  user_id,
  standard,
  assignment_id,
  base_points / 10.0 * sum(pow(attempt, -1.5)) raw_points,
  cast(round(base_points / 10.0 * sum(pow(attempt, -1.5))) as integer) points
FROM runs
JOIN mastery_speedruns USING (assignment_id)
GROUP BY user_id, assignment_id;

DROP VIEW IF EXISTS all_mastery_points;
CREATE VIEW all_mastery_points AS
  SELECT user_id, standard, points, 'assignment' reason FROM mastery_assignment_points
  UNION ALL
  SELECT user_id, standard, points, reason FROM ad_hoc_mastery_points
  UNION ALL
  SELECT user_id, standard, points, 'speedrun' FROM speedrun_mastery_points;

DROP VIEW IF EXISTS mastery_points;
CREATE VIEW mastery_points AS
SELECT
  user_id,
  sortable_name,
  period,
  standard,
  sum(points) points
FROM roster
JOIN all_mastery_points USING (user_id)
GROUP BY user_id, standard;


DROP VIEW IF EXISTS ic_names;
CREATE VIEW ic_names AS
WITH
  in_ic as (select distinct ic_name from ic_grades),
  in_db as (select distinct ic_name from assignment_point_values)

SELECT ic_name, 'ic' only_in
FROM in_ic
LEFT JOIN in_db USING (ic_name)
WHERE in_db.ic_name IS NULL

UNION

SELECT ic_name, 'db' only_in
FROM in_db
LEFT JOIN in_ic USING (ic_name)
WHERE in_ic.ic_name IS NULL;

DROP VIEW IF EXISTS grades;
CREATE VIEW grades AS
SELECT
  assignment_id,
  sortable_name,
  period,
  points
FROM assignment_points
JOIN roster using (user_id);

DROP VIEW IF EXISTS ic_assignments;
CREATE VIEW ic_assignments AS
SELECT ic_name, course_id, max(points) points FROM ic_grades
JOIN roster USING (student_number)
GROUP BY ic_name, course_id;

DROP VIEW IF EXISTS needs_assignment_point_values;
CREATE VIEW needs_assignment_point_values AS
SELECT * FROM ic_assignments
LEFT JOIN assignment_point_values USING (ic_name)
WHERE assignment_point_values.ic_name IS NULL;

CREATE TABLE IF NOT EXISTS checklist_criteria (
  assignment_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  label TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (assignment_id, seq)
);

CREATE TABLE IF NOT EXISTS checklist_marks (
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, assignment_id, seq)
);

DROP VIEW IF EXISTS checklist_scores;
CREATE VIEW checklist_scores AS
WITH total AS (
  SELECT assignment_id, sum(points) total_points
  FROM checklist_criteria
  GROUP BY assignment_id
)
SELECT
  m.assignment_id,
  m.user_id,
  sum(CASE WHEN m.value = 'check' THEN c.points ELSE 0 END) /
    cast(t.total_points AS REAL) score
FROM checklist_marks m
JOIN checklist_criteria c USING (assignment_id, seq)
JOIN total t USING (assignment_id)
GROUP BY m.assignment_id, m.user_id;

DROP VIEW IF EXISTS rubric_scores;
CREATE VIEW rubric_scores AS
WITH total AS (
  SELECT assignment_id, sum(points) total_points
  FROM rubric_items
  GROUP BY assignment_id
),
latest AS (
  SELECT user_id, assignment_id, sha
  FROM rubric_submissions
  GROUP BY user_id, assignment_id
  HAVING timestamp IS max(timestamp)
)
SELECT
  m.assignment_id,
  m.user_id,
  sum(m.fraction * i.points) / cast(t.total_points AS REAL) score
FROM rubric_marks m
JOIN latest l USING (user_id, assignment_id, sha)
JOIN rubric_items i USING (assignment_id, seq)
JOIN total t USING (assignment_id)
GROUP BY m.assignment_id, m.user_id;
