#!/usr/bin/env bash

JAR=~/hacks/bhs-cs/java/target/bhs-cs.jar
RUNNER=com.gigamonkeys.bhs.testing.TestRunner

tester="com.gigamonkeys.bhs.assignments.$1"
shift

for f; do
    echo "Testing $f"
    java -cp "$JAR" "$RUNNER" "$tester" "$f" > "$(dirname "$f")/results.json"
done
