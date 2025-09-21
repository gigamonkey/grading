.read schema.sql

DELETE FROM roster;
.import --csv '| cat ../roster.json | mlr --ijson --ocsv cat' roster
