BEGIN TRANSACTION;

delete from assignments;
delete from assignment_weights;
delete from roster;

.mode csv
.import assignments.csv assignments
.import assignment-weights.csv assignment_weights
.import '| cat ../roster.json | mlr --ijson --ocsv cat' roster

COMMIT;
