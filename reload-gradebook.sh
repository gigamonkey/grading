#!/usr/bin/env bash

set -euo pipefail

cd exports
make clean all
cd ..
./load-exported-gradebook.js exports/*.tsv
