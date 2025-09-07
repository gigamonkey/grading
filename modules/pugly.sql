-- Generated with pugilify v0.0.23.

-- fps -----------------------------------------------------

-- :name fps :all
select * from fps;

-- :name insertFp :insert
insert into fps (minimum, grade) values ($minimum, $grade);


-- graded_assignments --------------------------------------

-- :name gradedAssignments :all
select * from graded_assignments;

-- :name insertGradedAssignment :insert
insert into graded_assignments (assignment_id) values ($assignmentId);


-- normalized_answers --------------------------------------

-- :name normalizedAnswers :all
select * from normalized_answers;

-- :name insertNormalizedAnswer :insert
insert into normalized_answers
  (assignment_id, question_number, raw_answer, answer)
values
  ($assignmentId, $questionNumber, $rawAnswer, $answer);

-- :name normalizedAnswer :get
select * from normalized_answers
where
  assignment_id = $assignmentId and
  question_number = $questionNumber and
  raw_answer = $rawAnswer;

-- :name updateNormalizedAnswer :run
update normalized_answers set
  (answer) =
  ($answer)
where
  assignment_id = $assignmentId and
  question_number = $questionNumber and
  raw_answer = $rawAnswer

-- :name normalizedAnswerForGradedAssignment :get
select * from normalized_answers where assignment_id = $assignmentId;

-- :name normalizedAnswersForGradedAssignment :all
select * from normalized_answers where assignment_id = $assignmentId;

-- :name makeNormalizedAnswer :insert
insert into normalized_answers (answer) values ($answer);

-- :name makeNormalizedAnswerWithDefaultValues :insert
insert into normalized_answers (answer) values ($answer);


-- prompt_response_grades ----------------------------------

-- :name promptResponseGrades :all
select * from prompt_response_grades;

-- :name insertPromptResponseGrade :insert
insert into prompt_response_grades (user_id, posted, grade) values ($userId, $posted, $grade);

-- :name promptResponseGrade :get
select * from prompt_response_grades where user_id = $userId and posted = $posted;

-- :name updatePromptResponseGrade :run
update prompt_response_grades set (grade) = ($grade) where user_id = $userId and posted = $posted

-- :name makePromptResponseGrade :insert
insert into prompt_response_grades (grade) values ($grade);

-- :name makePromptResponseGradeWithDefaultValues :insert
insert into prompt_response_grades (grade) values ($grade);


-- questions -----------------------------------------------

-- :name questions :all
select * from questions;

-- :name insertQuestion :insert
insert into questions
  (assignment_id, question_number, label, kind, question)
values
  ($assignmentId, $questionNumber, $label, $kind, $question);

-- :name question :get
select * from questions where assignment_id = $assignmentId and question_number = $questionNumber;

-- :name updateQuestion :run
update questions set
  (label, kind, question) =
  ($label, $kind, $question)
where
  assignment_id = $assignmentId and
  question_number = $questionNumber

-- :name questionForGradedAssignment :get
select * from questions where assignment_id = $assignmentId;

-- :name questionsForGradedAssignment :all
select * from questions where assignment_id = $assignmentId;

-- :name makeQuestion :insert
insert into questions (label, kind, question) values ($label, $kind, $question);

-- :name makeQuestionWithDefaultValues :insert
insert into questions (label, kind, question) values ($label, $kind, $question);


-- scored_answers ------------------------------------------

-- :name scoredAnswers :all
select * from scored_answers;

-- :name insertScoredAnswer :insert
insert into scored_answers
  (assignment_id, question_number, answer, score)
values
  ($assignmentId, $questionNumber, $answer, $score);

-- :name scoredAnswer :get
select * from scored_answers
where
  assignment_id = $assignmentId and
  question_number = $questionNumber and
  answer = $answer;

-- :name updateScoredAnswer :run
update scored_answers set
  (score) =
  ($score)
where
  assignment_id = $assignmentId and
  question_number = $questionNumber and
  answer = $answer

-- :name scoredAnswerForGradedAssignment :get
select * from scored_answers where assignment_id = $assignmentId;

-- :name scoredAnswersForGradedAssignment :all
select * from scored_answers where assignment_id = $assignmentId;

-- :name makeScoredAnswer :insert
insert into scored_answers (score) values ($score);

-- :name makeScoredAnswerWithDefaultValues :insert
insert into scored_answers (score) values ($score);


-- student_answers -----------------------------------------

-- :name studentAnswers :all
select * from student_answers;

-- :name insertStudentAnswer :insert
insert into student_answers
  (user_id, assignment_id, question_number, answer_number, raw_answer)
values
  ($userId, $assignmentId, $questionNumber, $answerNumber, $rawAnswer);

-- :name studentAnswer :get
select * from student_answers
where
  user_id = $userId and
  assignment_id = $assignmentId and
  question_number = $questionNumber and
  answer_number = $answerNumber;

-- :name updateStudentAnswer :run
update student_answers set
  (raw_answer) =
  ($rawAnswer)
where
  user_id = $userId and
  assignment_id = $assignmentId and
  question_number = $questionNumber and
  answer_number = $answerNumber

-- :name studentAnswerForGradedAssignment :get
select * from student_answers where assignment_id = $assignmentId;

-- :name studentAnswersForGradedAssignment :all
select * from student_answers where assignment_id = $assignmentId;

-- :name makeStudentAnswer :insert
insert into student_answers (raw_answer) values ($rawAnswer);

-- :name makeStudentAnswerWithDefaultValues :insert
insert into student_answers (raw_answer) values ($rawAnswer);


