-- :name ensureAssignment :insert
insert or replace into assignments
  (assignment_id, date, course_id, title)
values
  ($assignmentId, $openDate, $courseId, $title);

-- :name ensureAssignmentPointValue :insert
insert or replace into assignment_point_values
  (assignment_id, standard, ic_name, points)
values
  ($assignmentId, $standard, $icName, $points);

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

-- :name clearDirectScores :run
delete from direct_scores where assignment_id = $assignmentId;

-- :name clearStudentAnswers :run
delete from student_answers where assignment_id = $assignmentId;

-- :name ensureIcGrade :insert
insert into ic_grades (student_number, ic_name, points) values ($studentNumber, $icName, $points)
on conflict(student_number, ic_name) do update set points = excluded.points;

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
SELECT DISTINCT standard FROM assignment_point_values
JOIN assignments USING (assignment_id)
WHERE course_id = (
  SELECT course_id FROM assignments WHERE assignment_id = $assignmentId
)
ORDER BY standard;

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

-- :name findAssignment :all
select * from assignments where assignment_id = cast($q as integer) or upper(title) like '%' || upper($q) || '%';

-- :name ensureScoreOverride :insert
insert or replace into score_overrides (user_id, assignment_id, score, reason)
values ($userId, $assignmentId, $score, $reason);

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

-- :name standardsWithoutMasteryIcNames :list
SELECT DISTINCT ma.standard
FROM mastery_assignments ma
JOIN assignments a USING (assignment_id)
LEFT JOIN mastery_ic_names min ON min.standard = ma.standard AND min.course_id = a.course_id
WHERE a.course_id = $courseId AND min.standard IS NULL
ORDER BY ma.standard;

-- :name availableMasteryIcNames :list
SELECT DISTINCT ic_name
FROM ic_grades
JOIN roster USING (student_number)
WHERE course_id = $courseId
AND ic_name NOT IN (SELECT ic_name FROM assignment_point_values)
AND ic_name NOT IN (SELECT ic_name FROM mastery_ic_names WHERE course_id = $courseId)
ORDER BY ic_name;

-- :name ensureMasteryIcName :insert
INSERT OR REPLACE INTO mastery_ic_names (course_id, standard, ic_name)
VALUES ($courseId, $standard, $icName);

-- :name questionsForAssignment :one
select questions from speedrunnables where assignment_id = $assignmentId;

-- :name ensureDirectScore :insert
insert or replace into direct_scores
  (assignment_id, user_id, score)
values
  ($assignmentId, $userId, $score);

-- :name allAssignments :all
SELECT a.assignment_id, a.date, a.course_id, a.title,
       apv.standard, apv.ic_name, apv.points
FROM assignments a
LEFT JOIN assignment_point_values apv USING (assignment_id)
WHERE ($search IS NULL OR upper(a.title) LIKE '%' || upper($search) || '%'
       OR upper(a.course_id) LIKE '%' || upper($search) || '%')
ORDER BY a.assignment_id DESC;

-- :name allStudents :all
SELECT user_id, github, sortable_name, period, course_id
FROM roster
WHERE ($search IS NULL OR upper(sortable_name) LIKE '%' || upper($search) || '%'
       OR upper(github) LIKE '%' || upper($search) || '%')
ORDER BY sortable_name;

-- :name allOverrides :all
SELECT so.user_id, r.sortable_name, r.github, r.period, r.course_id,
       so.assignment_id, a.title, so.score, so.reason
FROM score_overrides so
JOIN roster r USING (user_id)
JOIN assignments a USING (assignment_id)
ORDER BY r.sortable_name;

-- :name toUpdate :all
SELECT * FROM to_update
WHERE ($period IS NULL OR period = $period)
ORDER BY period, sortable_name;

-- :name masteryToUpdate :all
SELECT * FROM mastery_to_update
WHERE ($period IS NULL OR period = $period)
ORDER BY period, sortable_name;

-- :name zerosReport :all
SELECT * FROM zeros
WHERE ($course IS NULL OR course_id = $course)
  AND ($period IS NULL OR period = $period)
ORDER BY course_id, period, sortable_name, assignment_id;

-- :name dashboardStats :get
SELECT
  (SELECT count(*) FROM roster) as student_count,
  (SELECT count(*) FROM assignments) as assignment_count,
  (SELECT count(*) FROM ungraded_speedruns) as ungraded_speedrun_count,
  (SELECT count(*) FROM to_update) as to_update_count;

-- :name distinctCourses :list
SELECT DISTINCT course_id FROM roster ORDER BY course_id;

-- :name distinctPeriods :list
SELECT DISTINCT period FROM roster ORDER BY period;
