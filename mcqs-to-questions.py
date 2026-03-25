#!/usr/bin/env python

import pugsql
import sys
import xml.etree.ElementTree as ET
from sqlalchemy import event


def text_content(elem):
    """Extract text content from an element, collapsing whitespace."""
    parts = []
    if elem.text:
        parts.append(elem.text)
    for child in elem:
        if child.tag == "c":
            if child.text:
                parts.append(child.text)
        else:
            parts.append(text_content(child))
        if child.tail:
            parts.append(child.tail)
    return " ".join("".join(parts).split())


def load_mcqs(filename):
    tree = ET.parse(filename)
    root = tree.getroot()

    questions = []
    for i, mcq in enumerate(root.findall("mcq")):
        question_elem = mcq.find("question")
        question_text = "\n\n".join(
            text_content(p) for p in question_elem if p.tag in ("p", "code")
        )

        answers_elem = mcq.find("answers")
        kind = "mchoices" if answers_elem.get("kind") == "multiple" else "choices"

        choices = []
        correct = []
        for item in answers_elem.findall("item"):
            text = text_content(item)
            choices.append(text)
            if item.get("correct") == "true":
                correct.append(text)

        questions.append(
            {
                "question_number": i,
                "label": mcq.find("title").text.strip(),
                "kind": kind,
                "question": question_text,
                "choices": choices,
                "correct": correct,
            }
        )

    return questions


def store_questions(db, assignment_id, filename):
    questions = load_mcqs(filename)
    with db.transaction():
        db.clear_form_assessment(assignment_id=assignment_id)
        db.add_form_assessment(assignment_id=assignment_id)
        for q in questions:
            db.add_question(
                assignment_id=assignment_id,
                question_number=q["question_number"],
                label=q["label"],
                kind=q["kind"],
                question=q["question"],
            )
            for c in q["choices"]:
                db.add_normalized_answer(
                    assignment_id=assignment_id,
                    question_number=q["question_number"],
                    raw_answer=c,
                    answer=c,
                )
            for c in q["choices"]:
                db.add_scored_answer(
                    assignment_id=assignment_id,
                    question_number=q["question_number"],
                    answer=c,
                    score=1.0 if c in q["correct"] else 0.0,
                )


if __name__ == "__main__":
    [assignment_id, filename] = sys.argv[1:]

    db = pugsql.module("sql")
    db.connect("sqlite:///db.db")

    @event.listens_for(db.engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        dbapi_conn.execute("PRAGMA foreign_keys = ON")

    store_questions(db, assignment_id, filename)
