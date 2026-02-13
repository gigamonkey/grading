#!/usr/bin/env python

import json
import re
import sys

HAS_CHOICES = {"choices", "mchoices", "ochoices", "omchoices"}

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
    choice = ""
    choice_open = False

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

                    # Save the last choice.
                    if choice_open:
                        choices.append(normalize(choice))
                        choice = ""
                        choice_open = False

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
                    elif kind == 'tf':
                        q['choices'] = ['True', 'False']
                        q['kind'] = 'choices'
                    elif kind == 'yn':
                        q['choices'] = ['Yes', 'No' ]
                        q['kind'] = 'choices'

                    if kind == 'ochoices':
                        q['kind'] = 'choices'
                    elif kind == 'omchoices':
                        q['kind'] = 'mchoices'

                    questions.append(q)
                    label, question, kind = None, "", None
                    question_number += 1
                    continue

                elif choice_open:
                    if c := line.strip():
                        choice = f"{choice} {c}"
                    elif choice:
                        choices.append(normalize(choice))
                        choice = ""
                        choice_open = False

                elif c := line.strip():
                    if kind in HAS_CHOICES and not kind_open:
                        choice = c
                        choice_open = True

                kind_open = False

            else:
                # Accumulate the question
                question += line

    return questions

if __name__ == "__main__":

    [assignment_id, filename] = sys.argv[1:]

    json.dump(load_questions(assignment_id, filename), fp=sys.stdout, indent=2)
