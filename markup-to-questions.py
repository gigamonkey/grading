#!/usr/bin/env python

import fileinput
import json
import re
import sys
import sqlite3

INSERT_QUESTION = "INSERT INTO questions (assignment_id, num, label, kind, question) values (?, ?, ?, ?, ?)"
INSERT_ANSWERS = "INSERT INTO answers (assignment_id, num, answer) values (?, ?, ?)"

def emit_questions(cursor, assignment_id, input):

    num = 0
    label = None
    question = ""
    kind = None
    choices = []
    kind_open = False

    for line in input:

        # The question label
        if label_match := re.match(r'^\*\* (.*)', line):
            label = label_match.group(1)
            continue

        if label:
            # Question kind
            if kind_match := re.match(r'^## (\S+)', line):
                kind = kind_match.group(1)
                kind_open = True

            # End of kind (maybe on same line as start of kind)
            if kind:
                if re.search(r'##\.$', line):
                    cursor.execute(INSERT_QUESTION, (assignment_id, num, label, kind, question.strip()))
                    label, question, kind = None, "", None
                    if choices:
                        for c in choices:
                            cursor.execute(INSERT_ANSWERS, (assignment_id, num, c))
                        choices = []
                    num += 1
                    continue
                elif c := line.strip():
                    if kind == "choices" and not kind_open:
                        choices.append(c)
                kind_open = False

            else:
                # Accumulate the question
                question += line

if __name__ == "__main__":

    conn = sqlite3.connect('db.db')
    cursor = conn.cursor()

    assignment_id = sys.argv[1]

    with open(sys.argv[2]) as f:
        emit_questions(cursor, assignment_id, f)

    conn.commit()
