#!/usr/bin/env python

import pugsql
from markup_quiz import load_questions
import sys


def store_questions(db, questions):
    for q in questions:
        with db.transaction():
            db.add_question(**q)
            if "choices" in q:
                for c in q["choices"]:
                    # For MCQs each choice is its own normalized answer
                    db.add_normalized_answer(
                        assignment_id=q["assignment_id"],
                        num=q["num"],
                        raw_answer=c,
                        answer=c,
                    )
            else:
                print(f"No choices in {q}")


if __name__ == "__main__":
    [assignment_id, filename] = sys.argv[1:]

    db = pugsql.module("sql")
    db.connect("sqlite:///db.db")

    store_questions(db, load_questions(assignment_id, filename))
