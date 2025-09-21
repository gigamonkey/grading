.read new-course-db.sql

-- Auto-scored or hand scored.
CREATE TABLE scored_by_github (
  assignment_id INTEGER,
  github TEXT,
  score REAL
);


-- Hand graded assignments. No score since I just assign 0-4 grade.
CREATE TABLE hand_graded(
  assignment_id INTEGER,
  github TEXT,
  grade INTEGER
);
