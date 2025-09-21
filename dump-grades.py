#!/usr/bin/env python

import pugsql
import json
import sys

if __name__ == "__main__":
    [course, assignment_id] = sys.argv[1:]

    db = pugsql.module("sql")
    db.connect(f"sqlite:///{course}/db.db")

    grades = db.grades_for_assignment(assignment_id=assignment_id)
    json.dump(list(grades), fp=sys.stdout, indent=2)
