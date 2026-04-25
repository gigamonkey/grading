-- Generated with pugilify v0.0.23.

-- ad_hoc_mastery_points -----------------------------------

-- :name adHocMasteryPoints :all
select * from ad_hoc_mastery_points;

-- :name insertAdHocMasteryPoint :insert
insert into ad_hoc_mastery_points
  (user_id, date, standard, points, reason)
values
  ($userId, $date, $standard, $points, $reason);

-- :name makeAdHocMasteryPoint :insert
insert into ad_hoc_mastery_points
  (user_id, date, standard, points, reason)
values
  ($userId, $date, $standard, $points, $reason);

-- :name makeAdHocMasteryPointWithDefaultValues :insert
insert into ad_hoc_mastery_points
  (user_id, date, standard, points, reason)
values
  ($userId, $date, $standard, $points, $reason);


-- assignment_kinds ----------------------------------------

-- :name assignmentKinds :all
select * from assignment_kinds;

-- :name insertAssignmentKind :insert
insert into assignment_kinds (assignment_id, kind) values ($assignmentId, $kind);

-- :name assignmentKind :get
select * from assignment_kinds where assignment_id = $assignmentId;

-- :name updateAssignmentKind :run
update assignment_kinds set (kind) = ($kind) where assignment_id = $assignmentId

-- :name makeAssignmentKind :insert
insert into assignment_kinds (kind) values ($kind);

-- :name makeAssignmentKindWithDefaultValues :insert
insert into assignment_kinds (kind) values ($kind);


-- assignment_point_values ---------------------------------

-- :name assignmentPointValues :all
select * from assignment_point_values;

-- :name insertAssignmentPointValue :insert
insert into assignment_point_values
  (assignment_id, standard, ic_name, points)
values
  ($assignmentId, $standard, $icName, $points);

-- :name assignmentPointValue :get
select * from assignment_point_values where assignment_id = $assignmentId and standard = $standard;

-- :name updateAssignmentPointValue :run
update assignment_point_values set
  (ic_name, points) =
  ($icName, $points)
where
  assignment_id = $assignmentId and
  standard = $standard

-- :name makeAssignmentPointValue :insert
insert into assignment_point_values (ic_name, points) values ($icName, $points);

-- :name makeAssignmentPointValueWithDefaultValues :insert
insert into assignment_point_values (ic_name, points) values ($icName, $points);


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


-- checklist_criteria --------------------------------------

-- :name checklistCriteria :all
select * from checklist_criteria;

-- :name insertChecklistCriterion :insert
insert into checklist_criteria
  (assignment_id, seq, label, points)
values
  ($assignmentId, $seq, $label, $points);

-- :name checklistCriterion :get
select * from checklist_criteria where assignment_id = $assignmentId and seq = $seq;

-- :name updateChecklistCriterion :run
update checklist_criteria set
  (label, points) =
  ($label, $points)
where
  assignment_id = $assignmentId and
  seq = $seq

-- :name updateChecklistCriterionExceptDefaults :run
update checklist_criteria set (label) = ($label) where assignment_id = $assignmentId and seq = $seq

-- :name insertChecklistCriterionWithDefaultValues :insert
insert into checklist_criteria (assignment_id, seq, label) values ($assignmentId, $seq, $label);

-- :name updateChecklistCriterionPoints :run
update checklist_criteria set points = $points where assignment_id = $assignmentId and seq = $seq

-- :name makeChecklistCriterion :insert
insert into checklist_criteria (label, points) values ($label, $points);

-- :name makeChecklistCriterionWithDefaultValues :insert
insert into checklist_criteria (label) values ($label);


-- checklist_marks -----------------------------------------

-- :name checklistMarks :all
select * from checklist_marks;

-- :name insertChecklistMark :insert
insert into checklist_marks
  (user_id, assignment_id, seq, value)
values
  ($userId, $assignmentId, $seq, $value);

-- :name checklistMark :get
select * from checklist_marks
where
  user_id = $userId and
  assignment_id = $assignmentId and
  seq = $seq;

-- :name updateChecklistMark :run
update checklist_marks set
  (value) =
  ($value)
where
  user_id = $userId and
  assignment_id = $assignmentId and
  seq = $seq

-- :name makeChecklistMark :insert
insert into checklist_marks (value) values ($value);

-- :name makeChecklistMarkWithDefaultValues :insert
insert into checklist_marks (value) values ($value);


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


-- dropped -------------------------------------------------

-- :name dropped :all
select * from dropped;

-- :name insertDropped :insert
insert into dropped
  (period, user_id, student_number, email, github, name, pronouns, google_name, sortable_name, last_name, first_name, birthdate, course_id)
values
  ($period, $userId, $studentNumber, $email, $github, $name, $pronouns, $googleName, $sortableName, $lastName, $firstName, $birthdate, $courseId);

-- :name makeDropped :insert
insert into dropped
  (period, user_id, student_number, email, github, name, pronouns, google_name, sortable_name, last_name, first_name, birthdate, course_id)
values
  ($period, $userId, $studentNumber, $email, $github, $name, $pronouns, $googleName, $sortableName, $lastName, $firstName, $birthdate, $courseId);

-- :name makeDroppedWithDefaultValues :insert
insert into dropped
  (period, user_id, student_number, email, github, name, pronouns, google_name, sortable_name, last_name, first_name, birthdate, course_id)
values
  ($period, $userId, $studentNumber, $email, $github, $name, $pronouns, $googleName, $sortableName, $lastName, $firstName, $birthdate, $courseId);


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


-- ic_grades -----------------------------------------------

-- :name icGrades :all
select * from ic_grades;

-- :name insertIcGrade :insert
insert into ic_grades (student_number, ic_name, points) values ($studentNumber, $icName, $points);

-- :name icGrade :get
select * from ic_grades where student_number = $studentNumber and ic_name = $icName;

-- :name updateIcGrade :run
update ic_grades set
  (points) =
  ($points)
where
  student_number = $studentNumber and
  ic_name = $icName

-- :name makeIcGrade :insert
insert into ic_grades (points) values ($points);

-- :name makeIcGradeWithDefaultValues :insert
insert into ic_grades (points) values ($points);


-- ic_point_values -----------------------------------------

-- :name icPointValues :all
select * from ic_point_values;

-- :name insertIcPointValue :insert
insert into ic_point_values (course_id, ic_name, points) values ($courseId, $icName, $points);

-- :name icPointValue :get
select * from ic_point_values where course_id = $courseId and ic_name = $icName;

-- :name updateIcPointValue :run
update ic_point_values set (points) = ($points) where course_id = $courseId and ic_name = $icName

-- :name makeIcPointValue :insert
insert into ic_point_values (points) values ($points);

-- :name makeIcPointValueWithDefaultValues :insert
insert into ic_point_values (points) values ($points);


-- java_unit_tests -----------------------------------------

-- :name javaUnitTests :all
select * from java_unit_tests;

-- :name insertJavaUnitTest :insert
insert into java_unit_tests
  (assignment_id, github, correct, score, timestamp, sha)
values
  ($assignmentId, $github, $correct, $score, $timestamp, $sha);

-- :name javaUnitTest :get
select * from java_unit_tests where assignment_id = $assignmentId and github = $github;

-- :name updateJavaUnitTest :run
update java_unit_tests set
  (correct, score, timestamp, sha) =
  ($correct, $score, $timestamp, $sha)
where
  assignment_id = $assignmentId and
  github = $github


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


-- mastery_assignments -------------------------------------

-- :name masteryAssignments :all
select * from mastery_assignments;

-- :name insertMasteryAssignment :insert
insert into mastery_assignments
  (assignment_id, standard, points)
values
  ($assignmentId, $standard, $points);

-- :name masteryAssignment :get
select * from mastery_assignments where assignment_id = $assignmentId and standard = $standard;

-- :name updateMasteryAssignment :run
update mastery_assignments set
  (points) =
  ($points)
where
  assignment_id = $assignmentId and
  standard = $standard

-- :name makeMasteryAssignment :insert
insert into mastery_assignments (points) values ($points);

-- :name makeMasteryAssignmentWithDefaultValues :insert
insert into mastery_assignments (points) values ($points);


-- mastery_ic_names ----------------------------------------

-- :name masteryIcNames :all
select * from mastery_ic_names;

-- :name insertMasteryIcName :insert
insert into mastery_ic_names (course_id, standard, ic_name) values ($courseId, $standard, $icName);

-- :name masteryIcName :get
select * from mastery_ic_names where course_id = $courseId and standard = $standard;

-- :name updateMasteryIcName :run
update mastery_ic_names set
  (ic_name) =
  ($icName)
where
  course_id = $courseId and
  standard = $standard

-- :name makeMasteryIcName :insert
insert into mastery_ic_names (ic_name) values ($icName);

-- :name makeMasteryIcNameWithDefaultValues :insert
insert into mastery_ic_names (ic_name) values ($icName);


-- mastery_speedruns ---------------------------------------

-- :name masterySpeedruns :all
select * from mastery_speedruns;

-- :name insertMasterySpeedrun :insert
insert into mastery_speedruns
  (assignment_id, standard, base_points)
values
  ($assignmentId, $standard, $basePoints);

-- :name makeMasterySpeedrun :insert
insert into mastery_speedruns
  (assignment_id, standard, base_points)
values
  ($assignmentId, $standard, $basePoints);

-- :name makeMasterySpeedrunWithDefaultValues :insert
insert into mastery_speedruns
  (assignment_id, standard, base_points)
values
  ($assignmentId, $standard, $basePoints);


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


-- not_for_grade -------------------------------------------

-- :name notForGrade :all
select * from not_for_grade;

-- :name insertNotForGrade :insert
insert into not_for_grade (assignment_id) values ($assignmentId);


-- optional_assignments ------------------------------------

-- :name optionalAssignments :all
select * from optional_assignments;

-- :name insertOptionalAssignment :insert
insert into optional_assignments (assignment_id) values ($assignmentId);


-- points_rubric_marks -------------------------------------

-- :name pointsRubricMarks :all
select * from points_rubric_marks;

-- :name insertPointsRubricMark :insert
insert into points_rubric_marks
  (user_id, assignment_id, seq, fraction)
values
  ($userId, $assignmentId, $seq, $fraction);

-- :name pointsRubricMark :get
select * from points_rubric_marks
where
  user_id = $userId and
  assignment_id = $assignmentId and
  seq = $seq;

-- :name updatePointsRubricMark :run
update points_rubric_marks set
  (fraction) =
  ($fraction)
where
  user_id = $userId and
  assignment_id = $assignmentId and
  seq = $seq

-- :name makePointsRubricMark :insert
insert into points_rubric_marks (fraction) values ($fraction);

-- :name makePointsRubricMarkWithDefaultValues :insert
insert into points_rubric_marks (fraction) values ($fraction);


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


-- rubric_configs ------------------------------------------

-- :name rubricConfigs :all
select * from rubric_configs;

-- :name insertRubricConfig :insert
insert into rubric_configs
  (assignment_id, branch, file_path)
values
  ($assignmentId, $branch, $filePath);

-- :name rubricConfig :get
select * from rubric_configs where assignment_id = $assignmentId;

-- :name updateRubricConfig :run
update rubric_configs set
  (branch, file_path) =
  ($branch, $filePath)
where
  assignment_id = $assignmentId

-- :name makeRubricConfig :insert
insert into rubric_configs (branch, file_path) values ($branch, $filePath);

-- :name makeRubricConfigWithDefaultValues :insert
insert into rubric_configs (branch, file_path) values ($branch, $filePath);


-- rubric_items --------------------------------------------

-- :name rubricItems :all
select * from rubric_items;

-- :name insertRubricItem :insert
insert into rubric_items
  (assignment_id, seq, label, points, kind, parameters)
values
  ($assignmentId, $seq, $label, $points, $kind, $parameters);

-- :name rubricItem :get
select * from rubric_items where assignment_id = $assignmentId and seq = $seq;

-- :name updateRubricItem :run
update rubric_items set
  (label, points, kind, parameters) =
  ($label, $points, $kind, $parameters)
where
  assignment_id = $assignmentId and
  seq = $seq

-- :name updateRubricItemExceptDefaults :run
update rubric_items set
  (label, parameters) =
  ($label, $parameters)
where
  assignment_id = $assignmentId and
  seq = $seq

-- :name insertRubricItemWithDefaultValues :insert
insert into rubric_items
  (assignment_id, seq, label, parameters)
values
  ($assignmentId, $seq, $label, $parameters);

-- :name updateRubricItemPoints :run
update rubric_items set points = $points where assignment_id = $assignmentId and seq = $seq

-- :name updateRubricItemKind :run
update rubric_items set kind = $kind where assignment_id = $assignmentId and seq = $seq

-- :name makeRubricItem :insert
insert into rubric_items
  (label, points, kind, parameters)
values
  ($label, $points, $kind, $parameters);

-- :name makeRubricItemWithDefaultValues :insert
insert into rubric_items (label, parameters) values ($label, $parameters);


-- rubric_marks --------------------------------------------

-- :name rubricMarks :all
select * from rubric_marks;

-- :name insertRubricMark :insert
insert into rubric_marks
  (user_id, assignment_id, sha, seq, fraction)
values
  ($userId, $assignmentId, $sha, $seq, $fraction);

-- :name rubricMark :get
select * from rubric_marks
where
  user_id = $userId and
  assignment_id = $assignmentId and
  sha = $sha and
  seq = $seq;

-- :name updateRubricMark :run
update rubric_marks set
  (fraction) =
  ($fraction)
where
  user_id = $userId and
  assignment_id = $assignmentId and
  sha = $sha and
  seq = $seq

-- :name rubricMarkForRubricSubmissionAndRubricSubmissionAndRubricSubmission :get
select * from rubric_marks where user_id = $userId and assignment_id = $assignmentId and sha = $sha;

-- :name rubricMarksForRubricSubmissionAndRubricSubmissionAndRubricSubmission :all
select * from rubric_marks where user_id = $userId and assignment_id = $assignmentId and sha = $sha;

-- :name insertRubricMarkWithDefaultValues :insert
insert into rubric_marks
  (user_id, assignment_id, sha, seq)
values
  ($userId, $assignmentId, $sha, $seq);

-- :name updateRubricMarkFraction :run
update rubric_marks set fraction = $fraction
where
  user_id = $userId and
  assignment_id = $assignmentId and
  sha = $sha and
  seq = $seq

-- :name makeRubricMark :insert
insert into rubric_marks (fraction) values ($fraction);


-- rubric_submissions --------------------------------------

-- :name rubricSubmissions :all
select * from rubric_submissions;

-- :name insertRubricSubmission :insert
insert into rubric_submissions
  (user_id, assignment_id, sha, timestamp)
values
  ($userId, $assignmentId, $sha, $timestamp);

-- :name rubricSubmission :get
select * from rubric_submissions
where
  user_id = $userId and
  assignment_id = $assignmentId and
  sha = $sha;

-- :name updateRubricSubmission :run
update rubric_submissions set
  (timestamp) =
  ($timestamp)
where
  user_id = $userId and
  assignment_id = $assignmentId and
  sha = $sha

-- :name makeRubricSubmission :insert
insert into rubric_submissions (timestamp) values ($timestamp);

-- :name makeRubricSubmissionWithDefaultValues :insert
insert into rubric_submissions (timestamp) values ($timestamp);


-- score_overrides -----------------------------------------

-- :name scoreOverrides :all
select * from score_overrides;

-- :name insertScoreOverride :insert
insert into score_overrides
  (user_id, assignment_id, score, reason)
values
  ($userId, $assignmentId, $score, $reason);

-- :name scoreOverride :get
select * from score_overrides where user_id = $userId and assignment_id = $assignmentId;

-- :name updateScoreOverride :run
update score_overrides set
  (score, reason) =
  ($score, $reason)
where
  user_id = $userId and
  assignment_id = $assignmentId

-- :name makeScoreOverride :insert
insert into score_overrides (score, reason) values ($score, $reason);

-- :name makeScoreOverrideWithDefaultValues :insert
insert into score_overrides (score, reason) values ($score, $reason);


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


-- speedrun_commits ----------------------------------------

-- :name speedrunCommits :all
select * from speedrun_commits;

-- :name insertSpeedrunCommit :insert
insert into speedrun_commits
  (speedrun_id, sha, timestamp, delta_seconds, elapsed_seconds, passed, attempted, error)
values
  ($speedrunId, $sha, $timestamp, $deltaSeconds, $elapsedSeconds, $passed, $attempted, $error);

-- :name speedrunCommit :get
select * from speedrun_commits where speedrun_id = $speedrunId and sha = $sha;

-- :name updateSpeedrunCommit :run
update speedrun_commits set
  (timestamp, delta_seconds, elapsed_seconds, passed, attempted, error) =
  ($timestamp, $deltaSeconds, $elapsedSeconds, $passed, $attempted, $error)
where
  speedrun_id = $speedrunId and
  sha = $sha

-- :name speedrunCommitForCompletedSpeedrun :get
select * from speedrun_commits where speedrun_id = $speedrunId;

-- :name speedrunCommitsForCompletedSpeedrun :all
select * from speedrun_commits where speedrun_id = $speedrunId;

-- :name makeSpeedrunCommit :insert
insert into speedrun_commits
  (timestamp, delta_seconds, elapsed_seconds, passed, attempted, error)
values
  ($timestamp, $deltaSeconds, $elapsedSeconds, $passed, $attempted, $error);

-- :name makeSpeedrunCommitWithDefaultValues :insert
insert into speedrun_commits
  (timestamp, delta_seconds, elapsed_seconds, passed, attempted, error)
values
  ($timestamp, $deltaSeconds, $elapsedSeconds, $passed, $attempted, $error);


-- speedrunnable_standards ---------------------------------

-- :name speedrunnableStandards :all
select * from speedrunnable_standards;

-- :name insertSpeedrunnableStandard :insert
insert into speedrunnable_standards
  (assignment_id, standard, weight, decay)
values
  ($assignmentId, $standard, $weight, $decay);

-- :name speedrunnableStandard :get
select * from speedrunnable_standards where assignment_id = $assignmentId and standard = $standard;

-- :name updateSpeedrunnableStandard :run
update speedrunnable_standards set
  (weight, decay) =
  ($weight, $decay)
where
  assignment_id = $assignmentId and
  standard = $standard

-- :name insertSpeedrunnableStandardWithDefaultValues :insert
insert into speedrunnable_standards (assignment_id, standard) values ($assignmentId, $standard);

-- :name updateSpeedrunnableStandardWeight :run
update speedrunnable_standards set weight = $weight
where
  assignment_id = $assignmentId and
  standard = $standard

-- :name updateSpeedrunnableStandardDecay :run
update speedrunnable_standards set decay = $decay
where
  assignment_id = $assignmentId and
  standard = $standard

-- :name makeSpeedrunnableStandard :insert
insert into speedrunnable_standards (weight, decay) values ($weight, $decay);


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
  (github, assignment_id, question_number, answer_number, raw_answer, timestamp, sha)
values
  ($github, $assignmentId, $questionNumber, $answerNumber, $rawAnswer, $timestamp, $sha);

-- :name studentAnswer :get
select * from student_answers
where
  github = $github and
  assignment_id = $assignmentId and
  question_number = $questionNumber and
  answer_number = $answerNumber;

-- :name updateStudentAnswer :run
update student_answers set
  (raw_answer, timestamp, sha) =
  ($rawAnswer, $timestamp, $sha)
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
insert into student_answers (raw_answer, timestamp, sha) values ($rawAnswer, $timestamp, $sha);

-- :name makeStudentAnswerWithDefaultValues :insert
insert into student_answers (raw_answer, timestamp, sha) values ($rawAnswer, $timestamp, $sha);


