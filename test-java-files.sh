#!/usr/bin/env bash

set -euo pipefail

JAR=~/hacks/bhs-cs/java/target/bhs-cs.jar
RUNNER=com.gigamonkeys.bhs.testing.TestRunner

tester="com.gigamonkeys.bhs.assignments.$1"
shift

for f; do
    echo -n "Testing $f ... "
    rm -f "$(dirname "$f")/broken.txt"
    if [[ ! -e "$(dirname "$f")/missing.txt" ]]; then
        if java -cp "$JAR" "$RUNNER" "$tester" "$f" > "$(dirname "$f")/results.json" 2> /dev/null; then
            echo "ok."
        else
            echo "broken."
            touch "$(dirname "$f")/broken.txt"
        fi
    else
        echo "missing."
    fi
done
