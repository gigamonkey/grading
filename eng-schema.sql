.read new-course-db.sql

-- Hand graded assignments. No score since I just assign 0-4 grade.
CREATE TABLE hand_graded(
  assignment_id INTEGER,
  github TEXT,
  grade INTEGER
);
