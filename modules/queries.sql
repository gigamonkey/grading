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

-- :name gradesForAssignment :all
select
  user_id userId,
  assignment_id assignmentId,
  standard,
  score,
  grade
from assignment_grades
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
order by user_id, assignment_id, standard;

-- :name clearDirectScores :run
delete from direct_scores where assignment_id = $assignmentId;

-- :name ensureIcGrade :insert
insert into ic_grades (student_number, standard, grade) values ($studentNumber, $standard, $grade)
on conflict(student_number, standard) do update set grade=excluded.grade;
