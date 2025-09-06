#!/usr/bin/env python

from markup_quiz import load_questions
import sys
import sqlite3

INSERT_QUESTION = "INSERT INTO questions (assignment_id, num, label, kind, question) values (?, ?, ?, ?, ?)"
INSERT_NORMALIZED_ANSWER = "INSERT INTO normalized_answers (assignment_id, num, raw_answer, answer) values (?, ?, ?, ?)"

if __name__ == "__main__":

    conn = sqlite3.connect('db.db')
    cursor = conn.cursor()

    [assignment_id, filename] = sys.argv[1:]

    for q in load_questions(assignment_id, filename):
        cursor.execute(INSERT_QUESTION, (q['assignment_id'], q['num'], q['label'], q['kind'], q['question']))
        if 'choices' in q:
            for c in q['choices']:
                # For MCQs the choice is its own normalized answer
                cursor.execute(INSERT_NORMALIZED_ANSWER, (q['assignment_id'], q['num'], c, c))
        else:
            print(f"No choices in {q}")

    conn.commit()
