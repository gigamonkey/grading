PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS graded_assignments (
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

-- Roster of students
DROP TABLE IF EXISTS roster;
.import --csv '| cat ../roster.json | mlr --ijson --ocsv cat' roster

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
     order by period, sortable_name
