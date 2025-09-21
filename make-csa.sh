#!/usr/bin/env bash

set -euo pipefail

# Set up the database.
sqlite3 csa/db.db < csa-schema.sql

# Load assignment weights. (Need to add new assignments to this file)
sqlite3 csa/db.db < csa/assignment-weights.sql

cd csa;

# Load CSVs of hand graded assignments
sqlite3 db.db < load-github-scored.sql

sqlite3 db.db 'select * from standards;'
