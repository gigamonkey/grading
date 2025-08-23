CREATE TABLE questions (
  assignment_id INTEGER,
  num INTEGER,
  label TEXT,
  kind TEXT,
  question TEXT,
  PRIMARY KEY (assignment_id, num)
);

CREATE TABLE answers (
  assignment_id INTEGER,
  num INTEGER,
  answer TEXT,
  score REAL DEFAULT 0
);

CREATE TABLE student_answers (
  user_id TEXT,
  assignment_id INTEGER,
  num INTEGER,
  answer TEXT
);
