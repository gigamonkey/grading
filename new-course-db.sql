.read new-db.sql

-- Raw scores per user per assignment distilled from auto-graded per-question
-- scores.
CREATE TABLE assignment_scores (
  user_id TEXT,
  assignment_id INTEGER,
  score REAL
);

-- Scores turned into per-standard grades for the assignment.
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
