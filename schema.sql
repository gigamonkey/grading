-- Questions. Probably extracted from the test in some way.
CREATE TABLE IF NOT EXISTS questions (
  assignment_id INTEGER,
  num INTEGER,
  label TEXT,
  kind TEXT,
  question TEXT,
  PRIMARY KEY (assignment_id, num)
);

-- The canonical answers with attached scores.
CREATE TABLE IF NOT EXISTS scored_answers (
  assignment_id INTEGER,
  num INTEGER,
  answer TEXT,
  score REAL NOT NULL,
  PRIMARY KEY (assignment_id, num, answer)
);

-- Map from the raw answers to the normalized answers we store in the
-- scored_answers table.
CREATE TABLE IF NOT EXISTS normalized_answers (
  assignment_id INTEGER,
  num INTEGER,
  raw_answer TEXT,
  answer TEXT NOT NULL,
  PRIMARY KEY (assignment_id, num, raw_answer)
);

-- Raw student answers.
CREATE TABLE IF NOT EXISTS student_answers (
  user_id TEXT,
  assignment_id INTEGER,
  num INTEGER,
  raw_answer TEXT,
  PRIMARY KEY (user_id, assignment_id, num)
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

DROP TABLE IF EXISTS roster;
.import --csv '| cat ../roster.json | mlr --ijson --ocsv cat' roster

DROP VIEW IF EXISTS scored_student_answers;
CREATE VIEW scored_student_answers as
SELECT * from student_answers
JOIN normalized_answers using (assignment_id, num, raw_answer)
JOIN scored_answers using (assignment_id, num, answer);
