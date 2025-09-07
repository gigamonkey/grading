#!/usr/bin/env python

"""
Score answers that have been loaded into database, either the choices from
multiple choice questions or all distinct answers submitted for free response
questions.
"""


import sys
import pugsql
import re


def unscored_answers(assignment_id, question_number):
    return [a['answer'] for a in db.unscored_answers(assignment_id=assignment_id, question_number=question_number)]


if __name__ == "__main__":
    assignment_id = sys.argv[1]

    db = pugsql.module("sql")
    db.connect("sqlite:///db.db")

    questions = db.question_numbers(assignment_id=assignment_id)
    for q in questions:
        question_number = q['question_number']
        question = q['question']
        kind = q['kind']

        answers = unscored_answers(assignment_id, question_number)

        if answers:
            print(f"Question:\n\n{question}\n")

            if kind == "choices":
                for i, a in enumerate(answers):
                    print(f"[{i}] {a}")
                print()
                n = int(input("Correct answer: "))
                for i, a in enumerate(answers):
                    db.add_scored_answer(
                        assignment_id=assignment_id,
                        question_number=question_number,
                        answer=a,
                        score = 1.0 if i == n else 0.0
                    )

            elif kind == "mchoices":
                for i, a in enumerate(answers):
                    print(f"[{i}] {a}")
                print()
                correct = set(int(n) for n in re.split(r',\s*', input("Correct answers (comma delimited): ")))
                for i, a in enumerate(answers):
                    db.add_scored_answer(
                        assignment_id=assignment_id,
                        question_number=question_number,
                        answer=a,
                        score = 1.0 if i in correct else -1.0
                    )

            elif kind == "freeanswer":
                print("Score these answers:")
                for a in answers:
                    score = float(input(f'Answer "{a}" Score: '))
                    db.add_scored_answer(
                        assignment_id=assignment_id,
                        question_number=question_number,
                        answer=a,
                        score=score
                    )

            else:
                print(f"*** Don't know how to score answers for {kind} questions.")
