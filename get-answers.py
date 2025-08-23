#!/usr/bin/env python

"""
Load answers to form based quiz from local github mirrors.
"""

import sqlite3
from pathlib import Path
from subprocess import run, CalledProcessError
import os
import json
import sys
from dotenv import load_dotenv
import requests

load_dotenv()

INSERT_ANSWER = """
INSERT INTO student_answers
  (user_id, assignment_id, num, answer)
VALUES
  (?, ?, ?, ?)
"""


github_root = Path(__file__).parent.parent / 'github'

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {os.environ['BHS_CS_API_KEY']}",
}

def assignment(assignment_id):

    url = f"{os.environ['BHS_CS_SERVER']}/api/assignment/{assignment_id}"
    r = requests.get(url, headers=headers)

    if (r.status_code == 200):
        return r.json()
    else:
        raise RuntimeError(f"Can't get assignment for {assignment_id}: status {r.status_code}")


def assigned_students(assignment_id, course_id):

    url = f"{os.environ['BHS_CS_SERVER']}/api/assignment/{assignment_id}/{course_id}/assigned"
    r = requests.get(url, headers=headers)

    if (r.status_code == 200):
        return r.json()
    else:
        raise RuntimeError(f"Can't get assigned students for {assignment_id}/{course_id}: status {r.status_code}")


def load_answers(github, branch, path):
    args = ['git', '-C', f'{github_root}/{github}.git/', 'show', f'{branch}:{path}']
    try:
        result = run(args, encoding='utf-8', capture_output=True, check=True)
        return json.loads(result.stdout)
    except CalledProcessError:
        return None

def save_answers(user_id, assignment_id, answers):
    for num, answer in enumerate(answers):
        cursor.execute(INSERT_ANSWER, (user_id, assignment_id, num, answer))


if __name__ == "__main__":
    conn = sqlite3.connect('db.db')
    cursor = conn.cursor()

    assignment_id = sys.argv[1]
    course_id = sys.argv[2]

    a = assignment(assignment_id)

    for s in assigned_students(assignment_id, course_id):
        answers = load_answers(s['github'], 'main', f"{a['url'][1:]}/answers.json")
        if answers:
            save_answers(s['user_id'], assignment_id, answers)
        else:
            print(f"No answers for {s['name']} ({s['github']})", file=sys.stderr)

    conn.commit()
