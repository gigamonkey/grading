DROP TABLE IF EXISTS roster;
.import --csv '| cat ../roster.json | mlr --ijson --ocsv cat' roster
