#!/usr/bin/env python

import json
import re
import sys

def load_questions(assignment_id, filename):
    with open(filename) as f:
        return extract_questions(assignment_id, f)


def normalize(s):
    s = re.sub(r'`', '', s)
    s = re.sub(r"\\code\{([^}]*)\}", r"\1", s)
    return s;


def extract_questions(assignment_id, input):

    question_number = 0
    label = None
    question = ""
    kind = None
    choices = []
    kind_open = False

    questions = []

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
                    q = {
                        "assignment_id": assignment_id,
                        "question_number": question_number,
                        "label": label,
                        "kind": kind,
                        "question": question.strip(),
                    }
                    if choices:
                        q['choices'] = choices
                        choices = []

                    questions.append(q)
                    label, question, kind = None, "", None
                    question_number += 1
                    continue
                elif c := line.strip():
                    if kind in {"choices", "mchoices"} and not kind_open:
                        choices.append(normalize(c))
                kind_open = False

            else:
                # Accumulate the question
                question += line

    return questions

if __name__ == "__main__":

    [assignment_id, filename] = sys.argv[1:]

    json.dump(load_questions(assignment_id, filename), fp=sys.stdout, indent=2)
