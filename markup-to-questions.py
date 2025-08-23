#!/usr/bin/env python

from markup_quiz import load_questions
import sys
import sqlite3

INSERT_QUESTION = "INSERT INTO questions (assignment_id, num, label, kind, question) values (?, ?, ?, ?, ?)"
INSERT_ANSWERS = "INSERT INTO answers (assignment_id, num, answer) values (?, ?, ?)"

if __name__ == "__main__":

    conn = sqlite3.connect('db.db')
    cursor = conn.cursor()

    [assignment_id, filename] = sys.argv[1:]

    for q in load_questions(assignment_id, filename):
        cursor.execute(INSERT_QUESTION, (q['assignment_id'], q['num'], q['label'], q['kind'], q['question']))
        if q['choices']:
            for c in q['choices']:
                cursor.execute(INSERT_ANSWERS, (q['assignment_id'], q['num'], c))

    conn.commit()
