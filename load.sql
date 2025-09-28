BEGIN TRANSACTION;

delete from assignments;
delete from assignment_weights;
--delete from graded_assignments;
delete from roster;

.mode csv
.import assignment-titles.csv assignments
--.import graded-assignments.csv graded_assignments
.import assignment-weights.csv assignment_weights
.import '| cat ../roster.json | mlr --ijson --ocsv cat' roster

COMMIT;
