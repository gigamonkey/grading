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
