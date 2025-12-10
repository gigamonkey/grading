-- Generated with pugilify v0.0.23.

-- assignment_weights --------------------------------------

-- :name assignmentWeights :all
select * from assignment_weights;

-- :name insertAssignmentWeight :insert
insert into assignment_weights
  (assignment_id, standard, weight)
values
  ($assignmentId, $standard, $weight);

-- :name assignmentWeight :get
select * from assignment_weights where assignment_id = $assignmentId and standard = $standard;

-- :name updateAssignmentWeight :run
update assignment_weights set
  (weight) =
  ($weight)
where
  assignment_id = $assignmentId and
  standard = $standard

-- :name makeAssignmentWeight :insert
insert into assignment_weights (weight) values ($weight);

-- :name makeAssignmentWeightWithDefaultValues :insert
insert into assignment_weights (weight) values ($weight);


-- assignments ---------------------------------------------

-- :name assignments :all
select * from assignments;

-- :name insertAssignment :insert
insert into assignments
  (assignment_id, date, course_id, title)
values
  ($assignmentId, $date, $courseId, $title);

-- :name assignment :get
select * from assignments where assignment_id = $assignmentId;

-- :name updateAssignment :run
update assignments set
  (date, course_id, title) =
  ($date, $courseId, $title)
where
  assignment_id = $assignmentId

-- :name makeAssignment :insert
insert into assignments (date, course_id, title) values ($date, $courseId, $title);

-- :name makeAssignmentWithDefaultValues :insert
insert into assignments (date, course_id, title) values ($date, $courseId, $title);


-- completed_speedruns -------------------------------------

-- :name completedSpeedruns :all
select * from completed_speedruns;

-- :name insertCompletedSpeedrun :insert
insert into completed_speedruns
  (speedrun_id, user_id, assignment_id, started_at, first_sha, finished_at, last_sha)
values
  ($speedrunId, $userId, $assignmentId, $startedAt, $firstSha, $finishedAt, $lastSha);

-- :name completedSpeedrun :get
select * from completed_speedruns where speedrun_id = $speedrunId;

-- :name updateCompletedSpeedrun :run
update completed_speedruns set
  (user_id, assignment_id, started_at, first_sha, finished_at, last_sha) =
  ($userId, $assignmentId, $startedAt, $firstSha, $finishedAt, $lastSha)
where
  speedrun_id = $speedrunId

-- :name makeCompletedSpeedrun :insert
insert into completed_speedruns
  (user_id, assignment_id, started_at, first_sha, finished_at, last_sha)
values
  ($userId, $assignmentId, $startedAt, $firstSha, $finishedAt, $lastSha);

-- :name makeCompletedSpeedrunWithDefaultValues :insert
insert into completed_speedruns
  (user_id, assignment_id, started_at, first_sha, finished_at, last_sha)
values
  ($userId, $assignmentId, $startedAt, $firstSha, $finishedAt, $lastSha);


-- direct_scores -------------------------------------------

-- :name directScores :all
select * from direct_scores;

-- :name insertDirectScore :insert
insert into direct_scores (assignment_id, user_id, score) values ($assignmentId, $userId, $score);

-- :name directScore :get
select * from direct_scores where assignment_id = $assignmentId and user_id = $userId;

-- :name updateDirectScore :run
update direct_scores set
  (score) =
  ($score)
where
  assignment_id = $assignmentId and
  user_id = $userId

-- :name makeDirectScore :insert
insert into direct_scores (score) values ($score);

-- :name makeDirectScoreWithDefaultValues :insert
insert into direct_scores (score) values ($score);


-- excused_assignments -------------------------------------

-- :name excusedAssignments :all
select * from excused_assignments;

-- :name insertExcusedAssignment :insert
insert into excused_assignments
  (assignment_id, user_id, reason)
values
  ($assignmentId, $userId, $reason);

-- :name excusedAssignment :get
select * from excused_assignments where assignment_id = $assignmentId and user_id = $userId;

-- :name updateExcusedAssignment :run
update excused_assignments set
  (reason) =
  ($reason)
where
  assignment_id = $assignmentId and
  user_id = $userId

-- :name makeExcusedAssignment :insert
insert into excused_assignments (reason) values ($reason);

-- :name makeExcusedAssignmentWithDefaultValues :insert
insert into excused_assignments (reason) values ($reason);


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


-- form_assessments ----------------------------------------

-- :name formAssessments :all
select * from form_assessments;

-- :name insertFormAssessment :insert
insert into form_assessments (assignment_id) values ($assignmentId);


-- fps -----------------------------------------------------

-- :name fps :all
select * from fps;

-- :name insertFp :insert
insert into fps (grade, minimum, score) values ($grade, $minimum, $score);

-- :name fp :get
select * from fps where grade = $grade;

-- :name updateFp :run
update fps set (minimum, score) = ($minimum, $score) where grade = $grade


-- graded_speedruns ----------------------------------------

-- :name gradedSpeedruns :all
select * from graded_speedruns;

-- :name insertGradedSpeedrun :insert
insert into graded_speedruns (speedrun_id, ok) values ($speedrunId, $ok);

-- :name gradedSpeedrun :get
select * from graded_speedruns where speedrun_id = $speedrunId;

-- :name updateGradedSpeedrun :run
update graded_speedruns set (ok) = ($ok) where speedrun_id = $speedrunId

-- :name gradedSpeedrunForCompletedSpeedrun :get
select * from graded_speedruns where speedrun_id = $speedrunId;

-- :name gradedSpeedrunsForCompletedSpeedrun :all
select * from graded_speedruns where speedrun_id = $speedrunId;


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


-- ic_grades -----------------------------------------------

-- :name icGrades :all
select * from ic_grades;

-- :name insertIcGrade :insert
insert into ic_grades (student_number, standard, grade) values ($studentNumber, $standard, $grade);

-- :name icGrade :get
select * from ic_grades where student_number = $studentNumber and standard = $standard;

-- :name updateIcGrade :run
update ic_grades set
  (grade) =
  ($grade)
where
  student_number = $studentNumber and
  standard = $standard

-- :name makeIcGrade :insert
insert into ic_grades (grade) values ($grade);

-- :name makeIcGradeWithDefaultValues :insert
insert into ic_grades (grade) values ($grade);


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

-- :name normalizedAnswerForFormAssessment :get
select * from normalized_answers where assignment_id = $assignmentId;

-- :name normalizedAnswersForFormAssessment :all
select * from normalized_answers where assignment_id = $assignmentId;

-- :name makeNormalizedAnswer :insert
insert into normalized_answers (answer) values ($answer);

-- :name makeNormalizedAnswerWithDefaultValues :insert
insert into normalized_answers (answer) values ($answer);


-- optional_assignments ------------------------------------

-- :name optionalAssignments :all
select * from optional_assignments;

-- :name insertOptionalAssignment :insert
insert into optional_assignments (assignment_id) values ($assignmentId);


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

-- :name questionForFormAssessment :get
select * from questions where assignment_id = $assignmentId;

-- :name questionsForFormAssessment :all
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
  (period, user_id, student_number, email, github, name, pronouns, google_name, sortable_name, last_name, first_name, birthdate, course_id)
values
  ($period, $userId, $studentNumber, $email, $github, $name, $pronouns, $googleName, $sortableName, $lastName, $firstName, $birthdate, $courseId);

-- :name makeRoster :insert
insert into roster
  (period, user_id, student_number, email, github, name, pronouns, google_name, sortable_name, last_name, first_name, birthdate, course_id)
values
  ($period, $userId, $studentNumber, $email, $github, $name, $pronouns, $googleName, $sortableName, $lastName, $firstName, $birthdate, $courseId);

-- :name makeRosterWithDefaultValues :insert
insert into roster
  (period, user_id, student_number, email, github, name, pronouns, google_name, sortable_name, last_name, first_name, birthdate, course_id)
values
  ($period, $userId, $studentNumber, $email, $github, $name, $pronouns, $googleName, $sortableName, $lastName, $firstName, $birthdate, $courseId);


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

-- :name scoredAnswerForFormAssessment :get
select * from scored_answers where assignment_id = $assignmentId;

-- :name scoredAnswersForFormAssessment :all
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


-- secondary_weights ---------------------------------------

-- :name secondaryWeights :all
select * from secondary_weights;

-- :name insertSecondaryWeight :insert
insert into secondary_weights
  (assignment_id, standard, weight)
values
  ($assignmentId, $standard, $weight);

-- :name secondaryWeight :get
select * from secondary_weights where assignment_id = $assignmentId and standard = $standard;

-- :name updateSecondaryWeight :run
update secondary_weights set
  (weight) =
  ($weight)
where
  assignment_id = $assignmentId and
  standard = $standard

-- :name makeSecondaryWeight :insert
insert into secondary_weights (weight) values ($weight);

-- :name makeSecondaryWeightWithDefaultValues :insert
insert into secondary_weights (weight) values ($weight);


-- server_grades -------------------------------------------

-- :name serverGrades :all
select * from server_grades;

-- :name insertServerGrade :insert
insert into server_grades
  (user_id, assignment_id, standard, score, grade)
values
  ($userId, $assignmentId, $standard, $score, $grade);

-- :name makeServerGrade :insert
insert into server_grades
  (user_id, assignment_id, standard, score, grade)
values
  ($userId, $assignmentId, $standard, $score, $grade);

-- :name makeServerGradeWithDefaultValues :insert
insert into server_grades
  (user_id, assignment_id, standard, score, grade)
values
  ($userId, $assignmentId, $standard, $score, $grade);


-- speedrunnables ------------------------------------------

-- :name speedrunnables :all
select * from speedrunnables;

-- :name insertSpeedrunnable :insert
insert into speedrunnables
  (assignment_id, kind, questions)
values
  ($assignmentId, $kind, $questions);

-- :name speedrunnable :get
select * from speedrunnables where assignment_id = $assignmentId;

-- :name updateSpeedrunnable :run
update speedrunnables set
  (kind, questions) =
  ($kind, $questions)
where
  assignment_id = $assignmentId

-- :name makeSpeedrunnable :insert
insert into speedrunnables (kind, questions) values ($kind, $questions);

-- :name makeSpeedrunnableWithDefaultValues :insert
insert into speedrunnables (kind, questions) values ($kind, $questions);


-- started_speedruns ---------------------------------------

-- :name startedSpeedruns :all
select * from started_speedruns;

-- :name insertStartedSpeedrun :insert
insert into started_speedruns
  (speedrun_id, user_id, assignment_id, started_at, first_sha, finished_at, last_sha)
values
  ($speedrunId, $userId, $assignmentId, $startedAt, $firstSha, $finishedAt, $lastSha);

-- :name startedSpeedrun :get
select * from started_speedruns where speedrun_id = $speedrunId;

-- :name updateStartedSpeedrun :run
update started_speedruns set
  (user_id, assignment_id, started_at, first_sha, finished_at, last_sha) =
  ($userId, $assignmentId, $startedAt, $firstSha, $finishedAt, $lastSha)
where
  speedrun_id = $speedrunId

-- :name makeStartedSpeedrun :insert
insert into started_speedruns
  (user_id, assignment_id, started_at, first_sha, finished_at, last_sha)
values
  ($userId, $assignmentId, $startedAt, $firstSha, $finishedAt, $lastSha);

-- :name makeStartedSpeedrunWithDefaultValues :insert
insert into started_speedruns
  (user_id, assignment_id, started_at, first_sha, finished_at, last_sha)
values
  ($userId, $assignmentId, $startedAt, $firstSha, $finishedAt, $lastSha);


-- student_answers -----------------------------------------

-- :name studentAnswers :all
select * from student_answers;

-- :name insertStudentAnswer :insert
insert into student_answers
  (github, assignment_id, question_number, answer_number, raw_answer)
values
  ($github, $assignmentId, $questionNumber, $answerNumber, $rawAnswer);

-- :name studentAnswer :get
select * from student_answers
where
  github = $github and
  assignment_id = $assignmentId and
  question_number = $questionNumber and
  answer_number = $answerNumber;

-- :name updateStudentAnswer :run
update student_answers set
  (raw_answer) =
  ($rawAnswer)
where
  github = $github and
  assignment_id = $assignmentId and
  question_number = $questionNumber and
  answer_number = $answerNumber

-- :name studentAnswerForFormAssessment :get
select * from student_answers where assignment_id = $assignmentId;

-- :name studentAnswersForFormAssessment :all
select * from student_answers where assignment_id = $assignmentId;

-- :name makeStudentAnswer :insert
insert into student_answers (raw_answer) values ($rawAnswer);

-- :name makeStudentAnswerWithDefaultValues :insert
insert into student_answers (raw_answer) values ($rawAnswer);


