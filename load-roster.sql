DELETE FROM roster;
.import --csv '| cat ../roster.json | mlr --ijson --ocsv --headerless-csv-output cat' roster
