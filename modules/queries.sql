-- :name ensureAssignment :insert
insert or replace into assignments
  (assignment_id, date, course_id, title)
values
  ($assignmentId, $openDate, $courseId, $title);

-- :name ensureAssignmentWeight :insert
insert or replace into assignment_weights
  (assignment_id, standard, weight)
values
  ($assignmentId, $standard, $weight);

-- :name postPromptResponseGrade :insert
insert into prompt_response_grades (user_id, posted, grade) values ($userId, $posted, $grade)
on conflict(user_id, posted) do update set grade=excluded.grade;

-- :name orderedPromptResponseGrades :all
select * from prompt_response_grades order by grade asc;

-- :name studentsForPeriod :all
select * from roster where period = $period;

-- :name clearScoredQuestionAssignment :run
delete from scored_question_assignments where assignment_id = $assignmentId;

-- :name clearExpression :run
delete from expressions where assignment_id = $assignmentId;

-- :name clearJavascriptUnitTest :run
delete from javascript_unit_tests where assignment_id = $assignmentId;

-- :name clearJavaUnitTest :run
delete from java_unit_tests where assignment_id = $assignmentId;

-- :name ensureFormAssessment :insert
insert into form_assessments (assignment_id) values ($assignmentId)
on conflict(assignment_id) do nothing;

-- :name clearFormAssessment :run
delete from form_assessments where assignment_id = $assignmentId;

-- :name gradesForAssignment :all
select
  user_id userId,
  assignment_id assignmentId,
  standard,
  score,
  grade
from assignment_grades
join assignment_weights using (assignment_id)
where assignment_id = $assignmentId
order by user_id, standard;

-- :name gradesForUser :all
select
  user_id userId,
  assignment_id assignmentId,
  standard,
  score,
  grade
from assignment_grades
join assignment_weights using (assignment_id)
where user_id = $userId
order by assignment_id, standard;

-- :name gradesForUserAndAssignment :all
select
  user_id userId,
  assignment_id assignmentId,
  standard,
  score,
  grade
from assignment_grades
join assignment_weights using (assignment_id)
where user_id = $userId and assignment_id = $assignmentId
order by standard;

-- :name allGrades :all
select
  user_id userId,
  assignment_id assignmentId,
  standard,
  score,
  grade
from assignment_grades
join assignment_weights using (assignment_id)
order by user_id, assignment_id, standard;

-- :name gradeUpdates :all
select
  db_grades.user_id userId,
  db_grades.assignment_id assignmentId,
  db_grades.standard,
  db_grades.score,
  db_grades.grade
from db_grades
join server_grades using (assignment_id, user_id, standard)
where db_grades.score <> server_grades.score;

-- :name clearDirectScores :run
delete from direct_scores where assignment_id = $assignmentId;

-- :name clearStudentAnswers :run
delete from student_answers where assignment_id = $assignmentId;

-- :name ensureIcGrade :insert
insert into ic_grades (student_number, standard, grade) values ($studentNumber, $standard, $grade)
on conflict(student_number, standard) do update set grade = excluded.grade;

-- :name ensureStudentAnswer :insert
insert into student_answers
  (github, assignment_id, question_number, answer_number, raw_answer)
values
  ($github, $assignmentId, $questionNumber, $answerNumber, $rawAnswer)
on conflict (github, assignment_id, question_number, answer_number) do
update set raw_answer = excluded.raw_answer;

-- :name ensureNormalizedAnswer :insert
insert into normalized_answers
  (assignment_id, question_number, raw_answer, answer)
values
  ($assignmentId, $questionNumber, $rawAnswer, $answer)
on conflict(assignment_id, question_number, raw_answer) do update set answer = excluded.answer;


-- :name correctAnswers :all
SELECT question_number, answer FROM scored_answers WHERE score = 1.0 and assignment_id = $assignmentId ORDER BY cast(question_number as integer) asc;


-- :name courseStandards :list
SELECT DISTINCT standard FROM assignment_weights
JOIN assignments USING (assignment_id)
WHERE course_id = (
  SELECT course_id FROM assignments WHERE assignment_id = $assignmentId
)
ORDER BY standard;

-- :name weightedAssignmentsForStandard :all
SELECT date, title, weight
FROM assignment_weights
JOIN assignments USING (assignment_id)
WHERE
  course_id = $courseId AND
  standard = $standard
ORDER BY date;

-- :name ungradedSpeedruns :all
select * from ungraded_speedruns;

-- :name openSpeedruns :all
select * from open_speedruns;

-- :name specificSpeedrun :get
select * from hydrated_speedruns where speedrun_id = $speedrunId;

-- :name githubForPeriod :list
select github from roster where period = $period;

-- :name githubForCourse :list
select github from roster where course_id = $course;

-- :name githubForUser :list
select github from roster where github = $user;

-- :name findUser :all
select * from roster where upper(github) like '%' || upper($q) || '%' or upper(sortable_name) like '%' || upper($q) || '%' or user_id = $q;

-- :name github :one
select github from roster where user_id = $userId;

-- :name clearServerGrades :run
delete from server_grades;

-- :name ensureGradedSpeedrun :insert
insert or replace into graded_speedruns (speedrun_id, ok) values ($speedrunId, $ok);

-- :name ensureJavaUnitTest :insert
insert or replace into java_unit_tests
  (assignment_id, github, correct, score, timestamp, sha)
values
  ($assignmentId, $github, $correct, $score, $timestamp, $sha);

-- :name questionsForAssignment :one
select questions from speedrunnables where assignment_id = $assignmentId;
