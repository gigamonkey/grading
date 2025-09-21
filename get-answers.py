#!/usr/bin/env python

"""
Load answers to form based quiz from local github mirrors. Uses server API
to get information about the assignment and a list of the students who were
assigned the assignment.
"""

import pugsql
from pathlib import Path
from subprocess import run, CalledProcessError
import os
import json
import sys
from dotenv import load_dotenv
import requests

load_dotenv()

github_root = Path(__file__).parent.parent / "github"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {os.environ['BHS_CS_API_KEY']}",
}


def assignment(assignment_id):
    url = f"{os.environ['BHS_CS_SERVER']}/api/assignment/{assignment_id}"
    r = requests.get(url, headers=headers)

    if r.status_code == 200:
        return r.json()
    else:
        raise RuntimeError(
            f"Can't get assignment for {assignment_id}: status {r.status_code}"
        )


def assigned_students(assignment_id, course_id):
    url = f"{os.environ['BHS_CS_SERVER']}/api/assignment/{assignment_id}/{course_id}/assigned"
    r = requests.get(url, headers=headers)

    if r.status_code == 200:
        return r.json()
    else:
        raise RuntimeError(
            f"Can't get assigned students for {assignment_id}/{course_id}: status {r.status_code}"
        )


def load_answers(github, branch, path):
    args = ["git", "-C", f"{github_root}/{github}.git/", "show", f"{branch}:{path}"]
    try:
        result = run(args, encoding="utf-8", capture_output=True, check=True)
        return json.loads(result.stdout)
    except CalledProcessError:
        return None


def normalize(answer):
    return answer.strip()


def save_answer(db, user_id, assignment_id, question_number, answer_number, raw_answer):
    db.add_student_answer(
        user_id=user_id,
        assignment_id=assignment_id,
        question_number=question_number,
        answer_number=answer_number,
        raw_answer=raw_answer
    )
    if raw_answer:
        db.add_normalized_answer(
            assignment_id=assignment_id,
            question_number=question_number,
            raw_answer=raw_answer,
            answer=normalize(raw_answer)
        )


def save_answers(db, user_id, assignment_id, answers):
    for num, answer in enumerate(answers):
        if isinstance(answer, list):
            for i, a in enumerate(answer):
                save_answer(db, user_id, assignment_id, num, i, a)
        else:
            save_answer(db, user_id, assignment_id, num, 0, answer)


if __name__ == "__main__":
    [assignment_id, course_id] = sys.argv[1:]

    a = assignment(assignment_id)
    students = assigned_students(assignment_id, course_id)

    db = pugsql.module("sql")
    db.connect("sqlite:///db.db")

    with db.transaction():
        for s in students:
            answers = load_answers(s["github"], "main", f"{a['url'][1:]}/answers.json")
            if answers:
                save_answers(db, s["user_id"], assignment_id, answers)
            else:
                print(f"No answers for {s['name']} ({s['github']})", file=sys.stderr)
