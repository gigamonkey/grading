-- :name add_graded_assignment :insert
INSERT INTO graded_assignments (assignment_id) VALUES (:assignment_id);

-- :name add_question :insert
INSERT INTO questions
  (assignment_id, question_number, label, kind, question)
VALUES
  (:assignment_id, :question_number, :label, :kind, :question)

-- :name add_normalized_answer :insert
INSERT OR IGNORE INTO normalized_answers
  (assignment_id, question_number, raw_answer, answer)
VALUES
  (:assignment_id, :question_number, :raw_answer, :answer);

-- :name add_answer :insert
INSERT OR IGNORE INTO answers
  (assignment_id, question_number, answer)
VALUES
  (:assignment_id, :question_number, :answer);

-- :name add_student_answer :insert
INSERT INTO student_answers
  (user_id, assignment_id, question_number, answer_number, raw_answer)
VALUES
  (:user_id, :assignment_id, :question_number, :answer_number, :raw_answer)

-- :name student_free_answers :many
WITH freeanswer AS (SELECT * FROM questions WHERE kind = 'freeanswer' AND assignment_id = :assignment_id)
SELECT distinct assignment_id, question_number, question, raw_answer
FROM student_answers
JOIN freeanswer USING (assignment_id, question_number);


-- :name question_numbers :many
SELECT question_number, question, kind from questions where assignment_id = :assignment_id;

-- :name unique_answers :many
SELECT distinct answer FROM normalized_answers WHERE assignment_id = :assignment_id and question_number = :question_number;

-- :name unscored_answers :many
SELECT distinct answer FROM normalized_answers
LEFT JOIN scored_answers sa using (assignment_id, question_number, answer)
WHERE
  assignment_id = :assignment_id AND
  question_number = :question_number AND
  sa.assignment_id is NULL
ORDER BY answer;

-- :name update_score :affected
UPDATE scored_answers
SET score = :score
WHERE
  assignment_id = :assignment_id AND
  question_number = :question_number AND
  answer = :answer;

-- :name add_scored_answer :insert
INSERT INTO scored_answers
  (assignment_id, question_number, answer, score)
VALUES
  (:assignment_id, :question_number, :answer, :score)


-- :name student_by_github :one
select * from roster where github = :github
