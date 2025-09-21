.read new-course-db.sql

-- Mapping from problem set names to assignment numbers.
CREATE TABLE expression_problem_sets (
  problem_set TEXT,
  assignment_id INTEGER
);

-- Autograded scores for expressions problems sets
CREATE TABLE expressions(
  problem_set TEXT,
  name TEXT,
  github TEXT,
  answered INTEGER,
  average_accuracy REAL,
  percent_first_try REAL,
  percent_done REAL,
  timestamp INTEGER,
  sha TEXT,
);

-- Hand graded assignments. No score since I just assign 0-4 grade.
CREATE TABLE hand_graded(
  assignment_id INTEGER,
  github TEXT,
  grade INTEGER
);
