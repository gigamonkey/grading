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

-- :name standardsByCourse :list
SELECT standard FROM standards WHERE course_id = $courseId ORDER BY standard;

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

-- :name masteryIcNamesByCourse :all
SELECT standard, ic_name
FROM mastery_ic_names
WHERE course_id = $courseId
ORDER BY standard;

-- :name deleteMasteryIcName :run
DELETE FROM mastery_ic_names WHERE course_id = $courseId AND standard = $standard;

-- :name standardsWithoutMasteryIcNames :list
SELECT s.standard
FROM standards s
LEFT JOIN mastery_ic_names min USING (course_id, standard)
WHERE s.course_id = $courseId AND min.standard IS NULL
ORDER BY s.standard;

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

-- :name masteryIcNameForStandard :get
SELECT min.ic_name
FROM mastery_ic_names min
JOIN assignments a ON a.course_id = min.course_id
WHERE a.assignment_id = $assignmentId AND min.standard = $standard;

-- :name clearAssignmentPointValue :run
DELETE FROM assignment_point_values WHERE assignment_id = $assignmentId;

-- :name ensureMasteryAssignment :insert
INSERT OR REPLACE INTO mastery_assignments (assignment_id, standard, points)
VALUES ($assignmentId, $standard, $points);

-- :name deleteMasteryAssignmentStandard :run
DELETE FROM mastery_assignments WHERE assignment_id = $assignmentId AND standard = $standard;

-- :name masteryDefaults :get
SELECT ma.standard, ma.points, min.ic_name
FROM mastery_assignments ma
JOIN assignments a USING (assignment_id)
LEFT JOIN mastery_ic_names min ON min.standard = ma.standard AND min.course_id = a.course_id
WHERE ma.assignment_id = $assignmentId;

-- Note: the assignment type column below is named assignment_type rather than
-- type. When it was named type, the value was not accessible via result.type in
-- JavaScript for reasons that are not fully understood.

-- :name assignmentById :get
SELECT a.assignment_id, a.date, a.course_id, a.title,
       CASE WHEN ma.assignment_id IS NOT NULL THEN 'M' WHEN apv.assignment_id IS NOT NULL THEN 'A' ELSE '?' END as assignment_type,
       COALESCE(apv.standard, ma.standard) as standard,
       COALESCE(apv.ic_name, min.ic_name) as ic_name,
       COALESCE(apv.points, ma.points) as points
FROM assignments a
LEFT JOIN assignment_point_values apv USING (assignment_id)
LEFT JOIN mastery_assignments ma USING (assignment_id)
LEFT JOIN mastery_ic_names min ON min.standard = ma.standard AND min.course_id = a.course_id
WHERE a.assignment_id = $assignmentId;

-- :name allAssignments :all
SELECT a.assignment_id, a.date, a.course_id, a.title,
       CASE WHEN ma.assignment_id IS NOT NULL THEN 'M' WHEN apv.assignment_id IS NOT NULL THEN 'A' ELSE '?' END as assignment_type,
       COALESCE(apv.standard, ma.standard) as standard,
       COALESCE(apv.ic_name, min.ic_name) as ic_name,
       COALESCE(apv.points, ma.points) as points
FROM assignments a
LEFT JOIN assignment_point_values apv USING (assignment_id)
LEFT JOIN mastery_assignments ma USING (assignment_id)
LEFT JOIN mastery_ic_names min ON min.standard = ma.standard AND min.course_id = a.course_id
WHERE ($search IS NULL OR upper(a.title) LIKE '%' || upper($search) || '%'
       OR upper(a.course_id) LIKE '%' || upper($search) || '%'
       OR CAST(a.assignment_id AS TEXT) = $search)
ORDER BY a.assignment_id DESC;

-- :name ungradedAssignments :all
SELECT a.assignment_id, a.date, a.course_id, a.title,
       CASE WHEN ma.assignment_id IS NOT NULL THEN 'M' WHEN apv.assignment_id IS NOT NULL THEN 'A' ELSE '?' END as assignment_type,
       COALESCE(apv.standard, ma.standard) as standard,
       COALESCE(apv.ic_name, min.ic_name) as ic_name,
       COALESCE(apv.points, ma.points) as points,
       CASE WHEN a.assignment_id IN (SELECT DISTINCT assignment_id FROM checklist_scores) THEN 'Yes' ELSE '' END as graded
FROM assignments a
LEFT JOIN assignment_point_values apv USING (assignment_id)
LEFT JOIN mastery_assignments ma USING (assignment_id)
LEFT JOIN mastery_ic_names min ON min.standard = ma.standard AND min.course_id = a.course_id
WHERE (a.assignment_id NOT IN (SELECT DISTINCT assignment_id FROM assignment_scores)
       OR a.assignment_id IN (SELECT DISTINCT assignment_id FROM checklist_scores))
  AND ($search IS NULL OR upper(a.title) LIKE '%' || upper($search) || '%'
       OR upper(a.course_id) LIKE '%' || upper($search) || '%'
       OR CAST(a.assignment_id AS TEXT) = $search)
ORDER BY a.assignment_id DESC;

-- :name allStudents :all
SELECT user_id, github, sortable_name, name, email, student_number, period, course_id
FROM roster
WHERE ($search IS NULL OR upper(sortable_name) LIKE '%' || upper($search) || '%'
       OR upper(github) LIKE '%' || upper($search) || '%')
ORDER BY period, sortable_name;

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

-- :name studentsByCourse :all
SELECT user_id, github, sortable_name, period
FROM roster WHERE course_id = $courseId
ORDER BY period, sortable_name;

-- :name checklistCriteria :all
SELECT seq, label, points FROM checklist_criteria
WHERE assignment_id = $assignmentId ORDER BY seq;

-- :name addChecklistCriterion :run
INSERT INTO checklist_criteria (assignment_id, seq, label, points)
VALUES ($assignmentId, (SELECT COALESCE(MAX(seq), 0) + 1 FROM checklist_criteria WHERE assignment_id = $assignmentId), $criteriaLabel, 1);

-- :name checklistMarks :all
SELECT user_id, seq, value FROM checklist_marks
WHERE assignment_id = $assignmentId;

-- :name getChecklistMark :get
SELECT value FROM checklist_marks
WHERE user_id = $userId AND assignment_id = $assignmentId AND seq = $seq;

-- :name upsertChecklistMark :insert
INSERT OR REPLACE INTO checklist_marks (user_id, assignment_id, seq, value)
VALUES ($userId, $assignmentId, $seq, $value);

-- :name deleteChecklistMark :run
DELETE FROM checklist_marks
WHERE user_id = $userId AND assignment_id = $assignmentId AND seq = $seq;

-- :name updateChecklistCriterionLabel :run
UPDATE checklist_criteria SET label = $criteriaLabel
WHERE assignment_id = $assignmentId AND seq = $seq;

-- :name updateChecklistCriterionPoints :run
UPDATE checklist_criteria SET points = $points
WHERE assignment_id = $assignmentId AND seq = $seq;

-- :name deleteChecklistCriterion :run
DELETE FROM checklist_criteria WHERE assignment_id = $assignmentId AND seq = $seq;

-- :name deleteChecklistMarksForCriterion :run
DELETE FROM checklist_marks WHERE assignment_id = $assignmentId AND seq = $seq;

-- Quiz scoring
-- :name hasFormAssessment :get
SELECT 1 as exists_ FROM form_assessments WHERE assignment_id = $assignmentId;

-- :name formAssessmentsWithDetails :all
SELECT fa.assignment_id, a.title, a.course_id, a.date,
  (SELECT count(*) FROM questions q WHERE q.assignment_id = fa.assignment_id) question_count,
  (SELECT count(DISTINCT sa.github) FROM student_answers sa
   WHERE sa.assignment_id = fa.assignment_id) student_count
FROM form_assessments fa
JOIN assignments a USING (assignment_id)
ORDER BY a.assignment_id DESC;

-- :name unscoredAnswersForQuestion :all
SELECT na.answer, count(DISTINCT sa.github) student_count
FROM normalized_answers na
JOIN student_answers sa ON sa.assignment_id = na.assignment_id
  AND sa.question_number = na.question_number AND sa.raw_answer = na.raw_answer
LEFT JOIN scored_answers sc ON sc.assignment_id = na.assignment_id
  AND sc.question_number = na.question_number AND sc.answer = na.answer
WHERE na.assignment_id = $assignmentId AND na.question_number = $questionNumber
  AND sc.assignment_id IS NULL
GROUP BY na.answer ORDER BY student_count DESC;

-- :name scoredAnswersForQuestion :all
SELECT answer, score FROM scored_answers
WHERE assignment_id = $assignmentId AND question_number = $questionNumber
ORDER BY score DESC, answer;

-- :name addScoredAnswer :insert
INSERT INTO scored_answers (assignment_id, question_number, answer, score)
VALUES ($assignmentId, $questionNumber, $answer, $score)
ON CONFLICT(assignment_id, question_number, answer) DO UPDATE SET score = excluded.score;

-- :name deleteScoredAnswer :run
DELETE FROM scored_answers
WHERE assignment_id = $assignmentId AND question_number = $questionNumber AND answer = $answer;

-- Ad hoc mastery points
-- :name allAdHocMasteryPoints :all
SELECT ah.user_id, r.sortable_name, r.period, r.course_id,
       ah.standard, ah.points, ah.reason, ah.date
FROM ad_hoc_mastery_points ah
JOIN roster r USING (user_id)
ORDER BY ah.date DESC, r.sortable_name;

-- :name insertAdHocMasteryPoints :insert
INSERT INTO ad_hoc_mastery_points (user_id, date, standard, points, reason)
VALUES ($userId, $date, $standard, $points, $reason);

-- :name adHocReasons :list
SELECT DISTINCT reason FROM ad_hoc_mastery_points ORDER BY reason;

-- :name adHocMasteryPointsByReason :all
SELECT ah.rowid, ah.user_id, r.sortable_name, r.period, r.course_id,
       ah.standard, ah.points, ah.reason, ah.date
FROM ad_hoc_mastery_points ah
JOIN roster r USING (user_id)
WHERE ah.reason = $reason
ORDER BY ah.date DESC, r.sortable_name;

-- :name updateAdHocMasteryPoints :run
UPDATE ad_hoc_mastery_points SET points = $points WHERE rowid = $rowid;

-- :name studentById :get
SELECT * FROM roster WHERE user_id = $userId;

-- :name studentMasteryPoints :all
SELECT mp.standard, mp.points, 'assignment' type, mp.title source, a.date
FROM mastery_assignment_points mp
JOIN assignments a USING (assignment_id)
WHERE mp.user_id = $userId
UNION ALL
SELECT standard, points, 'ad hoc' type, reason source, date
FROM ad_hoc_mastery_points
WHERE user_id = $userId
UNION ALL
SELECT sp.standard, sp.points, 'speedrun' type, a.title source,
       date(max(cs.finished_at), 'unixepoch', 'localtime') date
FROM speedrun_mastery_points sp
JOIN assignments a USING (assignment_id)
JOIN completed_speedruns cs USING (user_id, assignment_id)
JOIN graded_speedruns gs USING (speedrun_id)
WHERE sp.user_id = $userId AND gs.ok = 1
GROUP BY sp.user_id, sp.assignment_id
ORDER BY standard, type, source;

-- :name studentMasteryTotals :all
SELECT standard, sum(points) points
FROM all_mastery_points
WHERE user_id = $userId
GROUP BY standard
ORDER BY standard;

-- :name allStandards :list
SELECT DISTINCT standard FROM standards ORDER BY standard;

-- :name studentAssignmentScores :all
SELECT ap.assignment_id, ap.title, a.date, ap.ic_name,
       ap.max_points, ap.score, ap.points
FROM assignment_points ap
JOIN assignments a USING (assignment_id)
WHERE ap.user_id = $userId
ORDER BY a.date DESC, ap.title;

-- :name assignmentStudentScores :all
SELECT r.user_id, r.sortable_name, r.period, r.course_id,
       s.score, cast(round(s.score * apv.points) as integer) points,
       apv.points max_points, s.override
FROM assigned a
JOIN roster r USING (user_id)
LEFT JOIN assignment_scores s ON s.user_id = a.user_id AND s.assignment_id = a.assignment_id
LEFT JOIN assignment_point_values apv ON apv.assignment_id = a.assignment_id
WHERE a.assignment_id = $assignmentId
ORDER BY r.sortable_name;
