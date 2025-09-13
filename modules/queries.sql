-- :name postPromptResponseGrade :insert
insert into prompt_response_grades (user_id, posted, grade) values ($userId, $posted, $grade)
on conflict(user_id, posted) do update set grade=excluded.grade;

-- :name orderedPromptResponseGrades :all
select * from prompt_response_grades order by grade asc;


-- :name studentsForPeriod :all
select * from roster where period = $period;
