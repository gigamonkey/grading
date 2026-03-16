CREATE TABLE scored_question_assignments (
  assignment_id INTEGER PRIMARY KEY,
  questions INTEGER NOT NULL
);
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
CREATE TABLE javascript_unit_tests(
  assignment_id INTEGER,
  github TEXT,
  question TEXT,
  answered INTEGER,
  correct INTEGER,
  timestamp INTEGER,
  sha TEXT
);
CREATE TABLE hand_graded_questions(
  assignment_id INTEGER,
  github TEXT,
  question TEXT,
  correct INTEGER
);
CREATE TABLE rubric_grades (
  user_id TEXT,
  assignment_id INTEGER,
  rubric_item TEXT,
  score INTEGER, -- 0 or 1
  PRIMARY KEY (user_id, assignment_id, rubric_item)
);
CREATE TABLE direct_scores(
  assignment_id INTEGER,
  user_id TEXT,
  score REAL NOT NULL,
  PRIMARY KEY (assignment_id, user_id)
);
CREATE TABLE roster (
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
CREATE TABLE form_assignments (
  assignment_id INTEGER,
  PRIMARY KEY (assignment_id)
);
CREATE TABLE form_assessments (
  assignment_id INTEGER,
  PRIMARY KEY (assignment_id)
);
CREATE TABLE questions (
  assignment_id INTEGER,
  question_number INTEGER,
  label TEXT,
  kind TEXT,
  question TEXT,
  PRIMARY KEY (assignment_id, question_number),
  FOREIGN KEY (assignment_id) REFERENCES form_assessments(assignment_id) ON DELETE CASCADE
);
CREATE TABLE scored_answers (
  assignment_id INTEGER,
  question_number INTEGER,
  answer TEXT,
  score REAL NOT NULL,
  PRIMARY KEY (assignment_id, question_number, answer),
  FOREIGN KEY (assignment_id) REFERENCES form_assessments(assignment_id) ON DELETE CASCADE
);
CREATE TABLE normalized_answers (
  assignment_id INTEGER,
  question_number INTEGER,
  raw_answer TEXT,
  answer TEXT NOT NULL,
  PRIMARY KEY (assignment_id, question_number, raw_answer),
  FOREIGN KEY (assignment_id) REFERENCES form_assessments(assignment_id) ON DELETE CASCADE
);
CREATE TABLE student_answers (
  github TEXT,
  assignment_id INT,
  question_number INT,
  answer_number,
  raw_answer TEXT,
  PRIMARY KEY (github, assignment_id, question_number, answer_number),
  FOREIGN KEY (assignment_id) REFERENCES form_assessments(assignment_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "assignment_courses"(
"assignment_id" TEXT, "course_id" TEXT);
CREATE TABLE IF NOT EXISTS "all_asssignments"(
"assignment_id" TEXT, "course_id" TEXT, "title" TEXT);
CREATE TABLE IF NOT EXISTS "all_assignments"(
"assignment_id" TEXT, "date" TEXT, "course_id" TEXT, "title" TEXT);
CREATE TABLE assignments (
  assignment_id INTEGER,
  date TEXT NOT NULL,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  PRIMARY KEY (assignment_id)
);
CREATE TABLE optional_assignments (
  assignment_id INTEGER,
  PRIMARY KEY (assignment_id)
);
CREATE TABLE excused_assignments (
  assignment_id INTEGER,
  user_id TEXT,
  reason TEXT,
  PRIMARY KEY (assignment_id, user_id)
);
CREATE TABLE temp_aw(
  assignment_id INT,
  standard TEXT,
  weight REAL
);
CREATE TABLE old_excused(
  assignment_id INT,
  user_id TEXT,
  reason TEXT
);
CREATE TABLE completed_speedruns (
  speedrun_id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  started_at INTEGER NULL,
  first_sha TEXT NULL,
  finished_at INTEGER NULL,
  last_sha TEXT NULL
);
CREATE TABLE speedrunnables (
  assignment_id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  questions INTEGER
);
CREATE TABLE started_speedruns (
  speedrun_id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  started_at INTEGER NULL,
  first_sha TEXT NULL,
  finished_at INTEGER NULL,
  last_sha TEXT NULL
);
CREATE TABLE graded_speedruns (
  speedrun_id INTEGER PRIMARY KEY,
  ok INTEGER NOT NULL,
  FOREIGN KEY (speedrun_id) REFERENCES completed_speedruns(speedrun_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE TABLE server_grades (
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  standard TEXT NOT NULL,
  score REAL NOT NULL,
  grade INTEGER NOT NULL
);
CREATE TABLE java_unit_tests(
  assignment_id INTEGER,
  github TEXT,
  correct INTEGER,
  score REAL,
  timestamp INTEGER,
  sha TEXT,
  PRIMARY KEY (assignment_id, github)
) WITHOUT ROWID;
CREATE TABLE speedrunnable_standards (
  assignment_id INTEGER,
  standard TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  decay REAL NOT NULL DEFAULT 0.8,
  PRIMARY KEY (assignment_id, standard)
);
CREATE TABLE score_overrides (
  user_id TEXT NOT NULL,
  assignment_id INTEGER NOT NULL,
  score REAL NOT NULL,
  reason TEXT,
  PRIMARY KEY (user_id, assignment_id)
);
CREATE VIEW ag2 as
SELECT
  user_id,
  assignment_id,
  standard,
  coalesce(s.score, 0) score,
  max(coalesce(grade, 0)) grade
FROM assignments
JOIN assignment_weights using (assignment_id)
JOIN roster using (course_id)
LEFT JOIN excused_assignments ex using (assignment_id, user_id)
LEFT JOIN optional_assignments opt using (assignment_id)
LEFT JOIN assignment_scores s using (assignment_id, user_id)
LEFT JOIN fps on s.score >= minimum
WHERE
  ex.assignment_id is null and
  (grade is not null or opt.assignment_id is null)
GROUP BY user_id, assignment_id, standard;
CREATE VIEW new_users_standards_summary AS
SELECT
  user_id,
  standard,
  group_concat(assignment_id order by assignment_id) assignments,
  group_concat(printf("%.2f", score), ', ' order by assignment_id) scores,
  sum(score * weight) / sum(weight) score,
  cast(round(sum(grade * weight) / sum(weight)) as integer) grade
FROM assignment_grades g
JOIN assignment_weights USING (assignment_id)
GROUP BY user_id, standard;
CREATE VIEW new_standard_grades AS
SELECT
  period,
  user_id,
  student_number,
  sortable_name,
  standard,
  grade
FROM standards
JOIN roster using (period)
LEFT JOIN new_users_standards_summary uss USING (user_id, standard)
ORDER BY sortable_name;
CREATE VIEW new_assignment_grades as
SELECT
  user_id,
  assignment_id,
  coalesce(s.score, 0) raw_score,
  max(fps.grade) raw_grade,
  coalesce(speedrun_points.runs, 0) speedruns,
  case when speedrun_points.runs > 0 then max(next_fps.minimum) else coalesce(s.score, 0) end score,
  max(next_fps.grade) grade
FROM assignments
JOIN roster using (course_id)
LEFT JOIN excused_assignments ex using (assignment_id, user_id)
LEFT JOIN optional_assignments opt using (assignment_id)
LEFT JOIN assignment_scores s using (assignment_id, user_id)
LEFT JOIN speedrun_points using (user_id, assignment_id)
JOIN fps on coalesce(s.score, 0) >= fps.minimum
JOIN fps next_fps on next_fps.grade = min(fps.grade + coalesce(speedrun_points.runs, 0), 4)
WHERE
  ex.assignment_id is null and
  (opt.assignment_id is null or coalesce(s.score, 0) > 0)
GROUP BY user_id, assignment_id;
CREATE VIEW semester_numbers as
select
  s.user_id,
  sortable_name,
  avg(s.score) standards,
  g.score final,
  avg(s.score) * 0.75 + g.score * 0.25 semester
from users_standards_summary s
join assignment_scores g on s.user_id = g.user_id and assignment_id in (255, 256)
join roster using (user_id) group by s.user_id;
CREATE VIEW semester_grades as
select
  n.*,
  period,
  cast(round(100 * standards) as integer)  standards_r,
  cast(round(100 * final) as integer) final_r,
  cast(round(100 * semester) as integer) semester_r,
  max(grade) grade
from semester_numbers n
join roster using (user_id)
join fps on round(100 * semester) / 100 >= minimum
group by user_id
order by semester desc;
CREATE VIEW semester_by_fps as
with
  standard_averages as (
    select
      user_id,
      avg(grade) current
    from standard_grades group by user_id
),
  final_fps as (
    select
      user_id,
      max(grade) final
    from assignment_scores a
    join fps on a.score >= minimum
    where assignment_id = 255
    group by user_id
)
select
  user_id,
  sortable_name,
  current,
  final,
  current * 0.75 + final * 0.25 avg,
  cast(round(current * 0.75 + final * 0.25) as integer) grade
from standard_averages
join final_fps using (user_id)
join roster using (user_id)
order by avg desc;
CREATE VIEW speedruns AS
SELECT
  user_id,
  sortable_name,
  period,
  title,
  date(started_at, 'unixepoch') "date"
FROM good_speedruns
JOIN roster using (user_id)
JOIN assignments using (assignment_id)
/* speedruns(user_id,sortable_name,period,title,date) */;
CREATE TABLE mastery_assignments (
  assignment_id INTEGER NOT NULL,
  standard TEXT NOT NULL,
  points INTEGER NOT NULL,
  PRIMARY KEY (assignment_id, standard)
);
CREATE TABLE ad_hoc_mastery_points (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  standard TEXT NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL
);
CREATE TABLE mastery_speedruns (
  assignment_id INTEGER NOT NULL,
  standard TEXT NOT NULL,
  base_points INTEGER NOT NULL
);
CREATE TABLE ic_grades (
  student_number TEXT,
  ic_name TEXT,
  points INTEGER,
  PRIMARY KEY (student_number, ic_name)
);
CREATE TABLE assignment_point_values (
  assignment_id INTEGER NOT NULL,
  standard TEXT NOT NULL,
  ic_name TEXT NOT NULL,
  points INTEGER NOT NULL,
  PRIMARY KEY (assignment_id, standard)
);
CREATE VIEW expressions_scores AS
SELECT
  assignment_id,
  user_id,
  percent_done score
FROM expressions
JOIN roster using (github)
/* expressions_scores(assignment_id,user_id,score) */;
CREATE VIEW javascript_unit_tests_scores AS
SELECT
  assignment_id,
  user_id,
  sum(correct) / cast(questions as real) score
FROM javascript_unit_tests
JOIN scored_question_assignments USING (assignment_id)
JOIN roster USING (github)
GROUP BY assignment_id, github
/* javascript_unit_tests_scores(assignment_id,user_id,score) */;
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
GROUP BY assignment_id, github
/* java_unit_tests_scores(assignment_id,user_id,score) */;
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
GROUP BY assignment_id, question_number, answer
/* wrong_answers(assignment_id,n,question,answer,num,who) */;
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
ORDER BY assignment_id, question_number, github
/* question_scores(assignment_id,question_number,github,kind,answers,score) */;
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
GROUP BY assignment_id, github
/* form_assessment_scores(assignment_id,user_id,score) */;
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
JOIN assignments a using (assignment_id)
/* hydrated_speedruns(speedrun_id,user_id,assignment_id,started_at,first_sha,finished_at,last_sha,date,course_id,title,github,kind,questions) */;
CREATE VIEW ungraded_speedruns AS
SELECT * from hydrated_speedruns
LEFT JOIN graded_speedruns USING (speedrun_id)
WHERE graded_speedruns.speedrun_id IS NULL
/* ungraded_speedruns(speedrun_id,user_id,assignment_id,started_at,first_sha,finished_at,last_sha,date,course_id,title,github,kind,questions,ok) */;
CREATE VIEW open_speedruns AS
SELECT
  s.*,
  r.github,
  kind,
  questions
FROM started_speedruns s
JOIN roster r USING (user_id)
JOIN speedrunnables USING (assignment_id)
WHERE last_sha IS NULL
/* open_speedruns(speedrun_id,user_id,assignment_id,started_at,first_sha,finished_at,last_sha,github,kind,questions) */;
CREATE VIEW speedrun_points AS
SELECT user_id, assignment_id, COUNT(*) runs
FROM completed_speedruns
JOIN graded_speedruns USING (speedrun_id)
WHERE ok
GROUP BY user_id, assignment_id
/* speedrun_points(user_id,assignment_id,runs) */;
CREATE VIEW good_speedruns AS
SELECT *
FROM completed_speedruns
JOIN graded_speedruns USING (speedrun_id)
WHERE ok
/* good_speedruns(speedrun_id,user_id,assignment_id,started_at,first_sha,finished_at,last_sha,ok) */;
CREATE VIEW assignment_scores AS
WITH recorded_scores AS (
  SELECT *, 'expressions_scores' provenance FROM expressions_scores
    UNION
  SELECT *, 'javascript_unit_tests_scores' FROM javascript_unit_tests_scores
    UNION
  SELECT *, 'java_unit_tests_scores' FROM java_unit_tests_scores
    UNION
  SELECT *, 'direct_scores' FROM direct_scores
    UNION
  SELECT *, 'form_assessment_scores' FROM form_assessment_scores
)
SELECT
  assignment_id,
  user_id,
  coalesce(o.score, rs.score) score,
  o.score is not null override
FROM recorded_scores rs
LEFT JOIN score_overrides o using (user_id, assignment_id)
/* assignment_scores(assignment_id,user_id,score,override) */;
CREATE VIEW standards AS
SELECT
  course_id,
  standard,
  sum(points) assignment_points,
  cast(ceiling(sum(points) * (1 / 0.85 - 1)) AS INTEGER) mastery_points
FROM assignment_point_values
JOIN assignments USING (assignment_id)
GROUP BY course_id, standard
/* standards(course_id,standard,assignment_points,mastery_points) */;
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
  scores.user_id IS NULL
/* missing_assignments(user_id,assignment_id,sortable_name,title) */;
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
ORDER by sortable_name, date
/* zeros(sortable_name,period,course_id,date,assignment_id,title) */;
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
ORDER BY period, sortable_name
/* to_update(user_id,period,sortable_name,ic_name,ic,db) */;
CREATE TABLE mastery_ic_names (
  course_id TEXT NOT NULL,
  standard TEXT NOT NULL,
  ic_name TEXT NOT NULL,
  PRIMARY KEY (course_id, standard)
);
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
ORDER BY mp.period, mp.sortable_name
/* mastery_to_update(user_id,period,sortable_name,ic_name,ic,db) */;
CREATE VIEW assigned AS
SELECT * FROM roster JOIN assignments USING (course_id)
/* assigned(period,user_id,student_number,email,github,name,pronouns,google_name,sortable_name,last_name,first_name,birthdate,course_id,assignment_id,date,title) */;
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
LEFT JOIN assignment_scores USING (user_id, assignment_id)
/* assignment_points(user_id,student_number,assignment_id,sortable_name,period,title,ic_name,max_points,score,points) */;
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
LEFT JOIN assignment_scores USING (user_id, assignment_id)
/* mastery_assignment_points(user_id,assignment_id,standard,sortable_name,title,max_points,score,points) */;
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
GROUP BY user_id, assignment_id
/* speedrun_mastery_points(user_id,standard,assignment_id,raw_points,points) */;
CREATE VIEW all_mastery_points AS
  SELECT user_id, standard, points, 'assignment' reason FROM mastery_assignment_points
  UNION ALL
  SELECT user_id, standard, points, reason FROM ad_hoc_mastery_points
  UNION ALL
  SELECT user_id, standard, points, 'speedrun' FROM speedrun_mastery_points
/* all_mastery_points(user_id,standard,points,reason) */;
CREATE VIEW mastery_points AS
SELECT
  user_id,
  sortable_name,
  period,
  standard,
  sum(points) points
FROM roster
JOIN all_mastery_points USING (user_id)
GROUP BY user_id, standard
/* mastery_points(user_id,sortable_name,period,standard,points) */;
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
WHERE in_ic.ic_name IS NULL
/* ic_names(ic_name,only_in) */;
CREATE VIEW grades AS
SELECT
  assignment_id,
  sortable_name,
  period,
  points
FROM assignment_points
JOIN roster using (user_id);
CREATE VIEW ic_assignments AS
SELECT ic_name, course_id, max(points) points FROM ic_grades
JOIN roster USING (student_number)
GROUP BY ic_name, course_id
/* ic_assignments(ic_name,course_id,points) */;
CREATE VIEW needs_assignment_point_values AS
SELECT * FROM ic_assignments
LEFT JOIN assignment_point_values USING (ic_name)
WHERE assignment_point_values.ic_name IS NULL
/* needs_assignment_point_values(ic_name,course_id,points,assignment_id,standard,"points:1") */;
