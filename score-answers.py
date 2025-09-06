#!/usr/bin/env python

"""
Score answers that have been loaded into database, either the choices from
multiple choice questions or all distinct answers submitted for free response
questions.
"""


import sys
import sqlite3

NUMS = "SELECT num, question, kind from questions where assignment_id = ?"

ALL_ANSWERS = "SELECT distinct answer from normalized_answers where assignment_id = ? and num = ?"

UNSCORED_ANSWERS = """
SELECT answer FROM normalized_answers
LEFT JOIN scored_answers sa using (assignment_id, num, answer)
WHERE
  assignment_id = ? AND
  num = ? AND
  sa.assignment_id is NULL
"""

UPDATE_SCORE = "UPDATE scored_answers SET score = ? where assignment_id = ? and num = ? and answer = ?"

ADD_SCORED_ANSWER = "INSERT INTO scored_answers (assignment_id, num, answer, score) VALUES (?, ?, ?, ?)"

if __name__ == "__main__":

    conn = sqlite3.connect('db.db')
    cursor = conn.cursor()

    assignment_id = sys.argv[1]

    cursor.execute(NUMS, (assignment_id,))
    for (num, question, kind) in cursor.fetchall():
        cursor.execute(UNSCORED_ANSWERS, (assignment_id, num))
        answers = [a for (a,) in cursor.fetchall()]

        if answers:
            print(question)
            print()

            if kind == "choices":
                for i, a in enumerate(answers):
                    print(f"[{i}] {a}")
                print()
                n = int(input("Correct answer: "))
                for i, a in enumerate(answers):
                    score = 1.0 if i == n else 0.0
                    cursor.execute(ADD_SCORED_ANSWER, (assignment_id, num, a, score))
                    conn.commit()

            elif kind == "freeanswer":
                for a in answers:
                    score = float(input(f"{a}: "))
                    cursor.execute(ADD_SCORED_ANSWER, (assignment_id, num, a, score))
                    conn.commit()

            else:
                print(f"*** Don't know how to score answers for {kind} questions.")

    conn.commit()
