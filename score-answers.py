#!/usr/bin/env python

"""
Score answers that have been loaded into database, either the choices from
multiple choice questions or all distinct answers submitted for free response
questions.
"""


import sys
import sqlite3

NUMS = "SELECT num, question, kind from questions where assignment_id = ?"

ALL_ANSWERS = "SELECT answer from answers where assignment_id = ? and num = ?"

UPDATE_SCORE = "UPDATE answers SET score = ? where assignment_id = ? and num = ? and answer = ?"

if __name__ == "__main__":

    conn = sqlite3.connect('db.db')
    cursor = conn.cursor()

    assignment_id = sys.argv[1]

    cursor.execute(NUMS, (assignment_id,))
    for (num, question, kind) in cursor.fetchall():
        if kind == "choices":
            print(question)
            print()
            cursor.execute(ALL_ANSWERS, (assignment_id, num))
            answers = [a for (a,) in cursor.fetchall()]

            for i, a in enumerate(answers):
                print(f"[{i}] {a}")
            print()
            n = input("Correct answer: ")
            cursor.execute(UPDATE_SCORE, (1.0, assignment_id, num, answers[int(n)]))
        else:
            print(f"*** Don't know how to score answers for {kind} questions.")

    conn.commit()
