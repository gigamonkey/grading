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

-- :name clearDirectScores :run
delete from direct_scores where assignment_id = $assignmentId;

-- :name clearStudentAnswers :run
delete from student_answers where assignment_id = $assignmentId;

-- :name ensureIcGrade :insert
insert into ic_grades (student_number, standard, grade) values ($studentNumber, $standard, $grade)
on conflict(student_number, standard) do update set grade = excluded.grade;


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
