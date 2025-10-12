#!/usr/bin/env bash

JAR=~/hacks/bhs-cs/java/target/bhs-cs.jar
RUNNER=com.gigamonkeys.bhs.testing.TestRunner

tester="com.gigamonkeys.bhs.assignments.$1"
shift

for f; do
    echo -n "Testing $f ... "
    if java -cp "$JAR" "$RUNNER" "$tester" "$f" > "$(dirname "$f")/results.json" 2> /dev/null; then
        echo "ok."
    else
        echo "broken."
        touch "$(dirname "$f")/broken.txt"
    fi
done
