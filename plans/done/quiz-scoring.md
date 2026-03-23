# Plan: Web-Based Quiz Answer Scoring

## Context

Currently, scoring form-based quiz assessments requires running three separate CLI scripts in sequence: `get-file.js` (fetch answers from git), `load-answers.js` (load into DB), and `score-answers.py` (interactively score each answer). This plan adds a web page that combines all three steps into a single workflow using the existing Express/Nunjucks/HTMX app.

Questions must already be loaded into the DB via `markup-to-questions.py` before using this feature.

## Routes

- `GET /quiz-scoring` — List form assessments available to score
- `GET /quiz-scoring/:assignmentId` — Scoring UI for an assignment
- `POST /quiz-scoring/:assignmentId/fetch` — Fetch answers from git repos and load into DB
- `GET /quiz-scoring/:assignmentId/question/:questionNumber` — HTMX partial: render one question's scoring panel
- `POST /quiz-scoring/:assignmentId/question/:questionNumber/score-choice` — Score a single-choice question (choices/ochoices/tf/yn)
- `POST /quiz-scoring/:assignmentId/question/:questionNumber/toggle-mchoice` — Toggle one multi-choice answer as correct/incorrect
- `POST /quiz-scoring/:assignmentId/question/:questionNumber/score-free` — Score one free-answer response

## New SQL Queries (`modules/queries.sql`)

```sql
-- :name formAssessments :all
-- List all form assessments with progress info
SELECT fa.assignment_id, a.title, a.course_id, a.date,
  (SELECT count(*) FROM questions q WHERE q.assignment_id = fa.assignment_id) question_count,
  (SELECT count(DISTINCT sa.github) FROM student_answers sa
   WHERE sa.assignment_id = fa.assignment_id) student_count
FROM form_assessments fa
JOIN assignments a USING (assignment_id)
ORDER BY a.assignment_id DESC;

-- :name questionsForFormAssessment :all
SELECT question_number, label, kind, question FROM questions
WHERE assignment_id = $assignmentId ORDER BY question_number;

-- :name unscoredAnswersForQuestion :all
-- Unscored normalized answers with how many students gave each
SELECT na.answer, count(DISTINCT sa.github) student_count
FROM normalized_answers na
JOIN student_answers sa ON sa.assignment_id = na.assignment_id
  AND sa.question_number = na.question_number AND sa.raw_answer = na.raw_answer
LEFT JOIN scored_answers sc ON sc.assignment_id = na.assignment_id
  AND sc.question_number = na.question_number AND sc.answer = na.answer
WHERE na.assignment_id = $assignmentId AND na.question_number = $questionNumber
  AND sc.assignment_id IS NULL
GROUP BY na.answer ORDER BY student_count DESC;

-- :name scoredAnswersForQuestion :all
SELECT answer, score FROM scored_answers
WHERE assignment_id = $assignmentId AND question_number = $questionNumber
ORDER BY score DESC, answer;

-- :name addScoredAnswer :insert
INSERT INTO scored_answers (assignment_id, question_number, answer, score)
VALUES ($assignmentId, $questionNumber, $answer, $score)
ON CONFLICT(assignment_id, question_number, answer) DO UPDATE SET score = excluded.score;
```

## Fetch & Load Logic (in `app.js`)

Extract a `saveAnswers(db, github, assignmentId, answers)` helper (ported from `load-answers.js`):
- Iterate over the answers array (indexed by question number)
- Handle both string and array elements (multi-answer questions)
- Call `db.ensureStudentAnswer()` and `db.ensureNormalizedAnswer()` (normalizing = `.trim()`)

The `POST /fetch` route:
1. `api.assignment(assignmentId)` to get `url`, `kind`, `courseId`, `title`
2. Verify `kind === 'questions'`
3. `db.ensureAssignment()`, `db.ensureFormAssessment()`
4. Get students via `db.studentsByCourse({ courseId })`
5. In a `db.transaction()`: clear student answers, then for each student:
   - `new Repo(process.env.BHS_CS_REPOS + '/' + github + '.git/')`
   - `sha = repo.sha('main', url.slice(1) + '/answers.json')`
   - If sha: parse `repo.contents(sha, filename)` as JSON, call `saveAnswers`
6. Return status partial or HX-Redirect back to the scoring page

## Scoring UI Interaction (HTMX)

The scoring page shows one question at a time in a `#question-panel` div, with a question nav sidebar.

### Per question kind:
- **choices/ochoices/tf/yn**: Each unscored answer is a clickable button. Clicking one marks it correct (1.0) and all others incorrect (0.0) in one request. Auto-advances to next question.
- **mchoices/omchoices**: Each unscored answer has a correct/incorrect toggle. Each click scores that one answer (1.0 or -1.0). When all answers are scored, auto-advances.
- **freeanswer**: Each answer has an inline score input. Submitting scores that answer. When all scored, auto-advances.

Use hidden `<input>` fields for answer text (not `hx-vals`) to avoid escaping issues with student-submitted text.

### Question navigation:
- Sidebar with question numbers, visually distinguished (scored vs. unscored)
- Prev/Next buttons
- Updated via `hx-swap-oob` after each scoring action

## Templates

- `views/app/quiz-scoring.njk` — Index page (extends layout), table of form assessments
- `views/app/quiz-scoring/scoring.njk` — Main scoring page (extends layout), fetch button + question nav + panel area
- `views/app/quiz-scoring/question-panel.njk` — HTMX partial for one question's answers and scoring controls
- `views/app/quiz-scoring/question-nav.njk` — HTMX partial for the question list sidebar
- `views/app/quiz-scoring/fetch-status.njk` — Partial returned after fetch completes

## Other Changes

- `views/app/layout.njk`: Add `<a href="/quiz-scoring">Quiz Scoring</a>` after the Checklist link in the nav
- `app.js`: `import { Repo } from './modules/repo.js';` at the top

## Files to Modify

- `modules/queries.sql` — New queries
- `app.js` — New routes, `saveAnswers` helper, Repo import
- `views/app/layout.njk` — Nav link

## Files to Create

- `views/app/quiz-scoring.njk`
- `views/app/quiz-scoring/scoring.njk`
- `views/app/quiz-scoring/question-panel.njk`
- `views/app/quiz-scoring/question-nav.njk`
- `views/app/quiz-scoring/fetch-status.njk`

## Notes

- Git operations via `Repo` are synchronous (`execSync`). For large classes, the fetch step may block for a few seconds. The UI should show a loading indicator (HTMX `hx-indicator`).
- `score-answers.py` has a typo: `"ochices"` instead of `"ochoices"`. The web UI should treat `choices`, `ochoices`, `tf`, `yn` identically (pick-one-correct) and `mchoices`, `omchoices` identically (multi-toggle).

## Verification

1. Start the dev server, navigate to `/quiz-scoring`
2. Ensure form assessments with pre-loaded questions appear in the list
3. Click an assignment, verify the scoring page loads with questions in the nav
4. Click "Fetch & Load Answers", verify answers load from git (check student_answers table)
5. Test scoring a single-choice question: click an answer, verify it scores all answers and advances
6. Test scoring a multi-choice question: toggle answers correct/incorrect, verify auto-advance
7. Test scoring a free-answer question: enter scores, verify auto-advance
8. Verify the question nav updates to show scored questions
9. Check that `form_assessment_scores` view produces correct scores after all questions are scored
