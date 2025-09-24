-- Generated with pugilify v0.0.23.

-- assignment_scores ---------------------------------------

-- :name assignmentScores :all
select * from assignment_scores;

-- :name insertAssignmentScore :insert
insert into assignment_scores
  (user_id, assignment_id, score)
values
  ($userId, $assignmentId, $score);

-- :name makeAssignmentScore :insert
insert into assignment_scores
  (user_id, assignment_id, score)
values
  ($userId, $assignmentId, $score);

-- :name makeAssignmentScoreWithDefaultValues :insert
insert into assignment_scores
  (user_id, assignment_id, score)
values
  ($userId, $assignmentId, $score);


-- assignment_weights --------------------------------------

-- :name assignmentWeights :all
select * from assignment_weights;

-- :name insertAssignmentWeight :insert
insert into assignment_weights
  (assignment_id, standard, weight)
values
  ($assignmentId, $standard, $weight);

-- :name makeAssignmentWeight :insert
insert into assignment_weights
  (assignment_id, standard, weight)
values
  ($assignmentId, $standard, $weight);

-- :name makeAssignmentWeightWithDefaultValues :insert
insert into assignment_weights
  (assignment_id, standard, weight)
values
  ($assignmentId, $standard, $weight);


-- assignments ---------------------------------------------

-- :name assignments :all
select * from assignments;

-- :name insertAssignment :insert
insert into assignments (assignment_id, title) values ($assignmentId, $title);

-- :name assignment :get
select * from assignments where assignment_id = $assignmentId;

-- :name updateAssignment :run
update assignments set (title) = ($title) where assignment_id = $assignmentId

-- :name makeAssignment :insert
insert into assignments (title) values ($title);

-- :name makeAssignmentWithDefaultValues :insert
insert into assignments (title) values ($title);


-- expressions ---------------------------------------------

-- :name expressions :all
select * from expressions;

-- :name insertExpression :insert
insert into expressions
  (assignment_id, github, answered, average_accuracy, percent_first_try, percent_done, timestamp, sha)
values
  ($assignmentId, $github, $answered, $averageAccuracy, $percentFirstTry, $percentDone, $timestamp, $sha);

-- :name makeExpression :insert
insert into expressions
  (assignment_id, github, answered, average_accuracy, percent_first_try, percent_done, timestamp, sha)
values
  ($assignmentId, $github, $answered, $averageAccuracy, $percentFirstTry, $percentDone, $timestamp, $sha);

-- :name makeExpressionWithDefaultValues :insert
insert into expressions
  (assignment_id, github, answered, average_accuracy, percent_first_try, percent_done, timestamp, sha)
values
  ($assignmentId, $github, $answered, $averageAccuracy, $percentFirstTry, $percentDone, $timestamp, $sha);


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


-- hand_graded ---------------------------------------------

-- :name handGraded :all
select * from hand_graded;

-- :name insertHandGraded :insert
insert into hand_graded (assignment_id, github, grade) values ($assignmentId, $github, $grade);

-- :name makeHandGraded :insert
insert into hand_graded (assignment_id, github, grade) values ($assignmentId, $github, $grade);

-- :name makeHandGradedWithDefaultValues :insert
insert into hand_graded (assignment_id, github, grade) values ($assignmentId, $github, $grade);


-- hand_graded_questions -----------------------------------

-- :name handGradedQuestions :all
select * from hand_graded_questions;

-- :name insertHandGradedQuestion :insert
insert into hand_graded_questions
  (assignment_id, github, question, correct)
values
  ($assignmentId, $github, $question, $correct);

-- :name makeHandGradedQuestion :insert
insert into hand_graded_questions
  (assignment_id, github, question, correct)
values
  ($assignmentId, $github, $question, $correct);

-- :name makeHandGradedQuestionWithDefaultValues :insert
insert into hand_graded_questions
  (assignment_id, github, question, correct)
values
  ($assignmentId, $github, $question, $correct);


-- hand_scored ---------------------------------------------

-- :name handScored :all
select * from hand_scored;

-- :name insertHandScored :insert
insert into hand_scored (assignment_id, github, score) values ($assignmentId, $github, $score);

-- :name makeHandScored :insert
insert into hand_scored (assignment_id, github, score) values ($assignmentId, $github, $score);

-- :name makeHandScoredWithDefaultValues :insert
insert into hand_scored (assignment_id, github, score) values ($assignmentId, $github, $score);


-- java_unit_tests -----------------------------------------

-- :name javaUnitTests :all
select * from java_unit_tests;

-- :name insertJavaUnitTest :insert
insert into java_unit_tests
  (assignment_id, github, correct, score, timestamp, sha)
values
  ($assignmentId, $github, $correct, $score, $timestamp, $sha);

-- :name makeJavaUnitTest :insert
insert into java_unit_tests
  (assignment_id, github, correct, score, timestamp, sha)
values
  ($assignmentId, $github, $correct, $score, $timestamp, $sha);

-- :name makeJavaUnitTestWithDefaultValues :insert
insert into java_unit_tests
  (assignment_id, github, correct, score, timestamp, sha)
values
  ($assignmentId, $github, $correct, $score, $timestamp, $sha);


-- javascript_unit_tests -----------------------------------

-- :name javascriptUnitTests :all
select * from javascript_unit_tests;

-- :name insertJavascriptUnitTest :insert
insert into javascript_unit_tests
  (assignment_id, github, question, answered, correct, timestamp, sha)
values
  ($assignmentId, $github, $question, $answered, $correct, $timestamp, $sha);

-- :name makeJavascriptUnitTest :insert
insert into javascript_unit_tests
  (assignment_id, github, question, answered, correct, timestamp, sha)
values
  ($assignmentId, $github, $question, $answered, $correct, $timestamp, $sha);

-- :name makeJavascriptUnitTestWithDefaultValues :insert
insert into javascript_unit_tests
  (assignment_id, github, question, answered, correct, timestamp, sha)
values
  ($assignmentId, $github, $question, $answered, $correct, $timestamp, $sha);


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


-- roster --------------------------------------------------

-- :name roster :all
select * from roster;

-- :name insertRoster :insert
insert into roster
  (period, user_id, email, github, name, pronouns, google_name, sortable_name, last_name, first_name, birthdate, course_id)
values
  ($period, $userId, $email, $github, $name, $pronouns, $googleName, $sortableName, $lastName, $firstName, $birthdate, $courseId);

-- :name makeRoster :insert
insert into roster
  (period, user_id, email, github, name, pronouns, google_name, sortable_name, last_name, first_name, birthdate, course_id)
values
  ($period, $userId, $email, $github, $name, $pronouns, $googleName, $sortableName, $lastName, $firstName, $birthdate, $courseId);

-- :name makeRosterWithDefaultValues :insert
insert into roster
  (period, user_id, email, github, name, pronouns, google_name, sortable_name, last_name, first_name, birthdate, course_id)
values
  ($period, $userId, $email, $github, $name, $pronouns, $googleName, $sortableName, $lastName, $firstName, $birthdate, $courseId);


-- rubric_grades -------------------------------------------

-- :name rubricGrades :all
select * from rubric_grades;

-- :name insertRubricGrade :insert
insert into rubric_grades
  (user_id, assignment_id, rubric_item, score)
values
  ($userId, $assignmentId, $rubricItem, $score);

-- :name rubricGrade :get
select * from rubric_grades
where
  user_id = $userId and
  assignment_id = $assignmentId and
  rubric_item = $rubricItem;

-- :name updateRubricGrade :run
update rubric_grades set
  (score) =
  ($score)
where
  user_id = $userId and
  assignment_id = $assignmentId and
  rubric_item = $rubricItem

-- :name makeRubricGrade :insert
insert into rubric_grades (score) values ($score);

-- :name makeRubricGradeWithDefaultValues :insert
insert into rubric_grades (score) values ($score);


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


-- scored_question_assignments -----------------------------

-- :name scoredQuestionAssignments :all
select * from scored_question_assignments;

-- :name insertScoredQuestionAssignment :insert
insert into scored_question_assignments
  (assignment_id, questions)
values
  ($assignmentId, $questions);

-- :name scoredQuestionAssignment :get
select * from scored_question_assignments where assignment_id = $assignmentId;

-- :name updateScoredQuestionAssignment :run
update scored_question_assignments set
  (questions) =
  ($questions)
where
  assignment_id = $assignmentId

-- :name makeScoredQuestionAssignment :insert
insert into scored_question_assignments (questions) values ($questions);

-- :name makeScoredQuestionAssignmentWithDefaultValues :insert
insert into scored_question_assignments (questions) values ($questions);


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


