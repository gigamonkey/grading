-- :name ensureAssignment :insert
insert or replace into assignments
  (assignment_id, date, course_id, title)
values
  ($assignmentId, $openDate, $courseId, $title);

-- :name ensureAssignmentKind :insert
insert or replace into assignment_kinds
  (assignment_id, kind)
values
  ($assignmentId, $kind);

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

-- :name clearJavascriptUnitTestForStudent :run
delete from javascript_unit_tests where assignment_id = $assignmentId and github = $github;

-- :name studentJsTestResults :all
select question, answered, correct
from javascript_unit_tests
where assignment_id = $assignmentId and github = $github
order by question;

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

-- :name clearStudentAnswersByGithub :run
delete from student_answers where assignment_id = $assignmentId and github = $github;

-- :name ensureIcPointValue :insert
insert into ic_point_values (course_id, ic_name, points) values ($courseId, $icName, $points)
on conflict(course_id, ic_name) do update set points = excluded.points;

-- :name courseIdByStudentNumber :get
SELECT course_id FROM roster WHERE student_number = $studentNumber LIMIT 1;

-- :name icPointValueExists :get
SELECT 1 AS exists_ FROM ic_point_values WHERE ic_name = $icName LIMIT 1;

-- Rename an IC assignment column. ic_name is referenced from
-- assignment_point_values, mastery_ic_names, ic_point_values, and ic_grades.
-- :name renameIcNameInAssignmentPointValues :run
UPDATE assignment_point_values SET ic_name = $newIcName WHERE ic_name = $oldIcName;

-- :name renameIcNameInMasteryIcNames :run
UPDATE mastery_ic_names SET ic_name = $newIcName WHERE ic_name = $oldIcName;

-- :name renameIcNameInIcPointValues :run
UPDATE ic_point_values SET ic_name = $newIcName WHERE ic_name = $oldIcName;

-- :name renameIcNameInIcGrades :run
UPDATE ic_grades SET ic_name = $newIcName WHERE ic_name = $oldIcName;

-- :name ensureIcGrade :insert
insert into ic_grades (student_number, ic_name, points) values ($studentNumber, $icName, $points)
on conflict(student_number, ic_name) do update set points = excluded.points;

-- :name ensureStudentAnswer :insert
insert into student_answers
  (github, assignment_id, question_number, answer_number, raw_answer, timestamp, sha)
values
  ($github, $assignmentId, $questionNumber, $answerNumber, $rawAnswer, $timestamp, $sha)
on conflict (github, assignment_id, question_number, answer_number) do
update set raw_answer = excluded.raw_answer, timestamp = excluded.timestamp, sha = excluded.sha;

-- :name ensureNormalizedAnswer :insert
insert into normalized_answers
  (assignment_id, question_number, raw_answer, answer)
values
  ($assignmentId, $questionNumber, $rawAnswer, $answer)
on conflict(assignment_id, question_number, raw_answer) do update set answer = excluded.answer;


-- :name correctAnswers :all
SELECT question_number, answer FROM scored_answers WHERE score = 1.0 and assignment_id = $assignmentId ORDER BY cast(question_number as integer) asc;


-- :name courseStandards :list
SELECT DISTINCT standard FROM (
  SELECT standard FROM assignment_point_values
  JOIN assignments USING (assignment_id)
  WHERE course_id = (SELECT course_id FROM assignments WHERE assignment_id = $assignmentId)
  UNION
  SELECT standard FROM mastery_assignments
  JOIN assignments USING (assignment_id)
  WHERE course_id = (SELECT course_id FROM assignments WHERE assignment_id = $assignmentId)
)
ORDER BY standard;

-- :name ungradedSpeedruns :all
select * from ungraded_speedruns;

-- :name allSpeedruns :all
select h.*, gs.ok from hydrated_speedruns h
left join graded_speedruns gs using (speedrun_id)
order by h.finished_at desc;

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

-- :name updateSpeedrunLastSha :run
update completed_speedruns set last_sha = $lastSha where speedrun_id = $speedrunId;

-- :name studentSpeedruns :all
SELECT h.*, gs.ok FROM hydrated_speedruns h
LEFT JOIN graded_speedruns gs USING (speedrun_id)
WHERE h.user_id = $userId
ORDER BY h.finished_at DESC;

-- :name speedrunCommitsForSpeedrun :all
SELECT * FROM speedrun_commits WHERE speedrun_id = $speedrunId ORDER BY elapsed_seconds;

-- :name deleteGradedSpeedrun :run
DELETE FROM graded_speedruns WHERE speedrun_id = $speedrunId;

-- :name deleteSpeedrunCommits :run
DELETE FROM speedrun_commits WHERE speedrun_id = $speedrunId;

-- :name ensureGradedSpeedrun :insert
insert or replace into graded_speedruns (speedrun_id, ok) values ($speedrunId, $ok);

-- :name ensureJavaUnitTest :insert
insert or replace into java_unit_tests
  (assignment_id, github, correct, score, timestamp, sha)
values
  ($assignmentId, $github, $correct, $score, $timestamp, $sha);

-- :name standardsWithIcNames :all
SELECT s.course_id, s.standard, s.mastery_points, min.ic_name, ipv.points AS ic_points
FROM standards s
LEFT JOIN mastery_ic_names min USING (course_id, standard)
LEFT JOIN ic_point_values ipv ON ipv.ic_name = min.ic_name AND ipv.course_id = s.course_id
ORDER BY s.course_id, s.standard;

-- :name masteryIcNamesByCourse :all
SELECT min.standard, min.ic_name, s.mastery_points, ipv.points AS ic_points
FROM mastery_ic_names min
JOIN standards s USING (course_id, standard)
LEFT JOIN ic_point_values ipv ON ipv.ic_name = min.ic_name AND ipv.course_id = min.course_id
WHERE min.course_id = $courseId
ORDER BY min.standard;

-- :name deleteMasteryIcName :run
DELETE FROM mastery_ic_names WHERE course_id = $courseId AND standard = $standard;

-- :name standardsWithoutMasteryIcNames :all
SELECT s.standard, s.mastery_points
FROM standards s
LEFT JOIN mastery_ic_names min USING (course_id, standard)
WHERE s.course_id = $courseId AND min.standard IS NULL
ORDER BY s.standard;

-- :name availableMasteryIcNames :list
SELECT ic_name
FROM ic_point_values
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
       COALESCE(apv.points, ma.points) as points,
       EXISTS(SELECT 1 FROM assignment_scores s WHERE s.assignment_id = a.assignment_id) as has_scores,
       ak.kind,
       ipv.points as ic_points
FROM assignments a
LEFT JOIN assignment_point_values apv USING (assignment_id)
LEFT JOIN mastery_assignments ma USING (assignment_id)
LEFT JOIN mastery_ic_names min ON min.standard = ma.standard AND min.course_id = a.course_id
LEFT JOIN assignment_kinds ak USING (assignment_id)
LEFT JOIN ic_point_values ipv ON ipv.ic_name = COALESCE(apv.ic_name, min.ic_name) AND ipv.course_id = a.course_id
WHERE a.assignment_id = $assignmentId;

-- :name allAssignments :all
SELECT a.assignment_id, a.date, a.course_id, a.title,
       CASE WHEN ma.assignment_id IS NOT NULL THEN 'M' WHEN apv.assignment_id IS NOT NULL THEN 'A' ELSE '?' END as assignment_type,
       COALESCE(apv.standard, ma.standard) as standard,
       COALESCE(apv.ic_name, min.ic_name) as ic_name,
       COALESCE(apv.points, ma.points) as points,
       EXISTS(SELECT 1 FROM assignment_scores s WHERE s.assignment_id = a.assignment_id) as has_scores,
       ak.kind,
       ipv.points as ic_points
FROM assignments a
LEFT JOIN assignment_point_values apv USING (assignment_id)
LEFT JOIN mastery_assignments ma USING (assignment_id)
LEFT JOIN mastery_ic_names min ON min.standard = ma.standard AND min.course_id = a.course_id
LEFT JOIN assignment_kinds ak USING (assignment_id)
LEFT JOIN ic_point_values ipv ON ipv.ic_name = COALESCE(apv.ic_name, min.ic_name) AND ipv.course_id = a.course_id
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
       CASE WHEN a.assignment_id IN (SELECT DISTINCT assignment_id FROM checklist_scores)
              OR a.assignment_id IN (SELECT DISTINCT assignment_id FROM points_rubric_marks) THEN 'Yes' ELSE '' END as graded
FROM assignments a
LEFT JOIN assignment_point_values apv USING (assignment_id)
LEFT JOIN mastery_assignments ma USING (assignment_id)
LEFT JOIN mastery_ic_names min ON min.standard = ma.standard AND min.course_id = a.course_id
WHERE (a.assignment_id NOT IN (SELECT DISTINCT assignment_id FROM assignment_scores)
       OR a.assignment_id IN (SELECT DISTINCT assignment_id FROM checklist_scores)
       OR a.assignment_id IN (SELECT DISTINCT assignment_id FROM points_rubric_marks))
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

-- :name insertDroppedStudent :run
INSERT INTO dropped SELECT * FROM roster WHERE user_id = $userId;

-- :name deleteRosterStudent :run
DELETE FROM roster WHERE user_id = $userId;

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

-- :name studentToUpdate :all
SELECT * FROM to_update WHERE user_id = $userId ORDER BY ic_name;

-- :name studentMasteryToUpdate :all
SELECT * FROM mastery_to_update WHERE user_id = $userId ORDER BY ic_name;

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

-- :name checklistCriteriaForAssignment :all
SELECT seq, label, points FROM checklist_criteria
WHERE assignment_id = $assignmentId ORDER BY seq;

-- :name addChecklistCriterion :run
INSERT INTO checklist_criteria (assignment_id, seq, label, points)
VALUES ($assignmentId, (SELECT COALESCE(MAX(seq), 0) + 1 FROM checklist_criteria WHERE assignment_id = $assignmentId), $criteriaLabel, 1);

-- :name checklistMarksForAssignment :all
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
SELECT sc.answer, sc.score, count(DISTINCT sa.github) student_count
FROM scored_answers sc
LEFT JOIN normalized_answers na ON na.assignment_id = sc.assignment_id
  AND na.question_number = sc.question_number AND na.answer = sc.answer
LEFT JOIN student_answers sa ON sa.assignment_id = na.assignment_id
  AND sa.question_number = na.question_number AND sa.raw_answer = na.raw_answer
WHERE sc.assignment_id = $assignmentId AND sc.question_number = $questionNumber
GROUP BY sc.answer, sc.score
ORDER BY sc.score DESC, sc.answer;

-- :name studentsForQuestion :all
SELECT DISTINCT na.answer, sa.github,
       coalesce(r.sortable_name, sa.github) sortable_name,
       coalesce(r.name, sa.github) name
FROM student_answers sa
JOIN normalized_answers na ON na.assignment_id = sa.assignment_id
  AND na.question_number = sa.question_number AND na.raw_answer = sa.raw_answer
LEFT JOIN roster r ON r.github = sa.github
WHERE sa.assignment_id = $assignmentId AND sa.question_number = $questionNumber
ORDER BY na.answer, sortable_name;

-- :name addScoredAnswer :insert
INSERT INTO scored_answers (assignment_id, question_number, answer, score)
VALUES ($assignmentId, $questionNumber, $answer, $score)
ON CONFLICT(assignment_id, question_number, answer) DO UPDATE SET score = excluded.score;

-- :name deleteScoredAnswer :run
DELETE FROM scored_answers
WHERE assignment_id = $assignmentId AND question_number = $questionNumber AND answer = $answer;

-- Ad hoc mastery points
-- :name allAdHocMasteryPoints :all
SELECT ah.rowid, ah.user_id, r.sortable_name, r.period, r.course_id,
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
SELECT NULL rowid, mp.standard, mp.points, 'assignment' type, mp.title source, a.date
FROM mastery_assignment_points mp
JOIN assignments a USING (assignment_id)
WHERE mp.user_id = $userId
UNION ALL
SELECT rowid, standard, points, 'ad hoc' type, reason source, date
FROM ad_hoc_mastery_points
WHERE user_id = $userId
UNION ALL
SELECT NULL rowid, sp.standard, sp.points, 'speedrun' type, a.title source,
       date(max(cs.finished_at), 'unixepoch', 'localtime') date
FROM speedrun_mastery_points sp
JOIN assignments a USING (assignment_id)
JOIN completed_speedruns cs USING (user_id, assignment_id)
JOIN graded_speedruns gs USING (speedrun_id)
WHERE sp.user_id = $userId AND gs.ok = 1
GROUP BY sp.user_id, sp.assignment_id
ORDER BY standard, type, source;

-- :name deleteAdHocMasteryPoints :run
DELETE FROM ad_hoc_mastery_points WHERE rowid = $rowid;

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

-- :name assignmentProvenance :get
SELECT provenance FROM recorded_scores WHERE assignment_id = $assignmentId LIMIT 1;

-- :name assignmentStudentScores :all
SELECT r.user_id, r.github, r.sortable_name, r.period, r.course_id,
       s.score, cast(round(s.score * apv.points) as integer) points,
       apv.points max_points, s.override,
       m.sha, m.timestamp graded_at
FROM assigned a
JOIN roster r USING (user_id)
LEFT JOIN assignment_scores s ON s.user_id = a.user_id AND s.assignment_id = a.assignment_id
LEFT JOIN assignment_point_values apv ON apv.assignment_id = a.assignment_id
LEFT JOIN graded_work_metadata m ON m.user_id = a.user_id AND m.assignment_id = a.assignment_id
WHERE a.assignment_id = $assignmentId
ORDER BY r.sortable_name;

-- :name icAssignmentInfo :get
SELECT a.assignment_id, a.title, a.date, apv.points, apv.standard
FROM assignment_point_values apv
JOIN assignments a USING (assignment_id)
WHERE apv.ic_name = $icName
LIMIT 1;

-- :name icAssignmentScores :all
SELECT user_id, sortable_name, period, points
FROM assignment_points
WHERE ic_name = $icName
ORDER BY period, sortable_name;

-- :name studentQuizAnswers :all
SELECT
  q.question_number, q.label, q.kind, q.question,
  sa.raw_answer, na.answer, sc.score
FROM questions q
LEFT JOIN student_answers sa ON sa.assignment_id = q.assignment_id
  AND sa.question_number = q.question_number AND sa.github = $github
LEFT JOIN normalized_answers na ON na.assignment_id = q.assignment_id
  AND na.question_number = q.question_number AND na.raw_answer = sa.raw_answer
LEFT JOIN scored_answers sc ON sc.assignment_id = q.assignment_id
  AND sc.question_number = q.question_number AND sc.answer = na.answer
WHERE q.assignment_id = $assignmentId
ORDER BY q.question_number, sa.answer_number;

-- :name markNotForGrade :insert
INSERT OR IGNORE INTO not_for_grade (assignment_id) VALUES ($assignmentId);

-- :name unmarkNotForGrade :run
DELETE FROM not_for_grade WHERE assignment_id = $assignmentId;

-- Rubric grading
-- :name rubricItemsForAssignment :all
SELECT * FROM rubric_items WHERE assignment_id = $assignmentId ORDER BY seq;

-- :name addRubricItem :insert
INSERT INTO rubric_items (assignment_id, seq, label, points, kind, parameters)
VALUES ($assignmentId,
  COALESCE((SELECT max(seq) + 1 FROM rubric_items WHERE assignment_id = $assignmentId), 1),
  $label, $points, $kind, $parameters);

-- :name updateRubricItemLabel :run
UPDATE rubric_items SET label = $label
WHERE assignment_id = $assignmentId AND seq = $seq;

-- :name deleteRubricItem :run
DELETE FROM rubric_items WHERE assignment_id = $assignmentId AND seq = $seq;

-- :name upsertRubricSubmission :run
INSERT INTO rubric_submissions (user_id, assignment_id, sha, timestamp)
VALUES ($userId, $assignmentId, $sha, $timestamp)
ON CONFLICT (user_id, assignment_id, sha) DO UPDATE SET timestamp = $timestamp;

-- :name rubricMarksForAssignment :all
SELECT m.* FROM rubric_marks m
JOIN (
  SELECT user_id, assignment_id, sha
  FROM rubric_submissions
  WHERE assignment_id = $assignmentId
  GROUP BY user_id, assignment_id
  HAVING timestamp IS max(timestamp)
) latest USING (user_id, assignment_id, sha)
WHERE m.assignment_id = $assignmentId;

-- :name getRubricMark :get
SELECT * FROM rubric_marks
WHERE user_id = $userId AND assignment_id = $assignmentId AND sha = $sha AND seq = $seq;

-- :name upsertRubricMark :run
INSERT INTO rubric_marks (user_id, assignment_id, sha, seq, fraction)
VALUES ($userId, $assignmentId, $sha, $seq, $fraction)
ON CONFLICT (user_id, assignment_id, sha, seq) DO UPDATE SET fraction = $fraction;

-- :name deleteRubricMark :run
DELETE FROM rubric_marks
WHERE user_id = $userId AND assignment_id = $assignmentId AND sha = $sha AND seq = $seq;

-- :name deleteRubricMarksForItem :run
DELETE FROM rubric_marks WHERE assignment_id = $assignmentId AND seq = $seq;

-- :name rubricConfigForAssignment :get
SELECT * FROM rubric_configs WHERE assignment_id = $assignmentId;

-- :name upsertRubricConfig :run
INSERT INTO rubric_configs (assignment_id, branch, file_path)
VALUES ($assignmentId, $branch, $filePath)
ON CONFLICT (assignment_id) DO UPDATE SET branch = $branch, file_path = $filePath;

-- :name rubricStudentsNeedingFetch :all
SELECT r.user_id, r.github
FROM roster r
JOIN assignments a ON a.course_id = r.course_id
LEFT JOIN rubric_submissions rs
  ON rs.user_id = r.user_id AND rs.assignment_id = a.assignment_id
WHERE a.assignment_id = $assignmentId
  AND r.github IS NOT NULL
GROUP BY r.user_id
HAVING COUNT(rs.sha) = 0
   OR MAX(rs.timestamp) IS NULL;

-- Excused assignments
-- :name ensureExcusedAssignment :run
INSERT INTO excused_assignments (assignment_id, user_id, reason)
VALUES ($assignmentId, $userId, $reason)
ON CONFLICT (assignment_id, user_id) DO NOTHING;

-- :name deleteExcusedAssignment :run
DELETE FROM excused_assignments WHERE assignment_id = $assignmentId AND user_id = $userId;

-- :name excusedUsersForAssignment :list
SELECT user_id FROM excused_assignments WHERE assignment_id = $assignmentId;

-- Points-grader marks
-- :name pointsRubricMarksForAssignment :all
SELECT * FROM points_rubric_marks WHERE assignment_id = $assignmentId;

-- :name getPointsRubricMark :get
SELECT * FROM points_rubric_marks
WHERE user_id = $userId AND assignment_id = $assignmentId AND seq = $seq;

-- :name upsertPointsRubricMark :run
INSERT INTO points_rubric_marks (user_id, assignment_id, seq, fraction)
VALUES ($userId, $assignmentId, $seq, $fraction)
ON CONFLICT (user_id, assignment_id, seq) DO UPDATE SET fraction = $fraction;

-- :name deletePointsRubricMark :run
DELETE FROM points_rubric_marks
WHERE user_id = $userId AND assignment_id = $assignmentId AND seq = $seq;

-- :name deletePointsRubricMarksForItem :run
DELETE FROM points_rubric_marks WHERE assignment_id = $assignmentId AND seq = $seq;
