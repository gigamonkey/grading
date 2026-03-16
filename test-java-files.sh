#!/usr/bin/env bash

set -euo pipefail

BHS_CS=/Users/peter/hacks/bhs-cs
JAR=$BHS_CS/java/target/bhs-cs.jar

export BHS_DATA_ROOT=$BHS_CS/java/

tester="com.gigamonkeys.bhs.assignments.$1"
shift

if [[ "$#" -eq 0 ]]; then
    echo "No files to test. Did you forget the tester class? (You gave $tester)"
    exit 1
fi

for f; do
    echo -n "Testing $f ... "
    rm -f "$(dirname "$f")/broken.txt"
    if [[ ! -e "$(dirname "$f")/missing.txt" ]]; then
        #if java -Xrs -Xss8m -Xmx200m -cp "$JAR" "$RUNNER" "$tester" "$f" > "$(dirname "$f")/results.json" 2> /dev/null; then
        if java --enable-preview -Xrs -Xss8m -Xmx200m -cp "$JAR" "$RUNNER" "$tester" "$f" > "$(dirname "$f")/results.json" ; then
            echo "ok."
        else
            echo "broken."
            touch "$(dirname "$f")/broken.txt"
        fi
    else
        echo "missing."
    fi
done
