#!/usr/bin/env bash

set -euo pipefail

# Set up the database.
sqlite3 eng/db.db < eng-schema.sql

# Load assignment weights. (Need to add new assignments to this file)
sqlite3 eng/db.db < eng/assignment-weights.sql

cd eng

# Load CSVs of hand graded assignments
sqlite3 db.db < load-hand-graded.sql

# Load auto-graded unit test assignments from per-assignment dbs.
#./load-unittest-grades.sh

sqlite3 db.db 'select * from standards;'
