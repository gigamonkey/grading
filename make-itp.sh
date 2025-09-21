#!/usr/bin/env bash

set -euo pipefail

# Set up the database.
sqlite3 itp/db.db < itp-schema.sql

# Load assignment weights. (Need to add new assignments to this file)
sqlite3 itp/db.db < itp/assignment-weights.sql

# Load auto graded expressions scores
sqlite3 itp/db.db < itp/load-expressions.sql

# Load CSVs of hand graded assignments
sqlite3 itp/db.db < itp/load-hand-graded.sql

# Load auto-graded unit test assignments from per-assignment dbs.
(cd itp &&  ./load-unittest-grades.sh)

sqlite3 db.db 'select * from standards;'
