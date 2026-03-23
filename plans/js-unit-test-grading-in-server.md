# Plan: JavaScript Unit Test Grading in the Grade Server

## Goal

Add a button on the assignments page (or assignment detail page) that fetches
each student's latest code from their repo under `BHS_CS_REPOS`, runs the
JavaScript unit tests, and inserts scores into the database — replacing the
current multi-step CLI workflow (`get-file.js` → `grade-javascript-unit-tests.js`).

## Current CLI Workflow

1. `./get-file.js <assignmentId> --course <course>` — snapshots `code.js` from
   each student's repo into `<course>/<id>-<title>/<github>/code.js`
2. `./grade-javascript-unit-tests.js <dir>` — fetches `testcases.js` from the
   BHS-CS server, runs tests in a VM against each student's code, inserts
   per-question results into `javascript_unit_tests`

## Precedent: Quiz Answer Fetching

The quiz scoring flow already does something very similar in-server:
`fetchAndLoadAnswers()` (app.js:772) reads files directly from git repos via
the `Repo` class, without writing to disk. The JS grading route should follow
this same pattern.

## Implementation

### 1. Server-side grading function

Add a function in `app.js` (or a new module if preferred) that combines the
fetch + grade steps:

```js
async function gradeJavascriptUnitTests(assignmentId) {
  // 1. Fetch assignment metadata from API
  const data = camelify(await api.assignment(assignmentId));
  const { url, kind, courseId, title, openDate } = data;

  if (kind !== 'coding') {
    throw new Error(`Assignment kind is "${kind}", expected "coding".`);
  }

  // 2. Get coding config to know which file to look for
  const config = await api.codingConfig(url);
  const branch = url.slice(1);           // e.g. "c/itp/coding/functions"
  const filename = `${url.slice(1)}/${config.files[0]}`;  // e.g. "c/itp/coding/functions/code.js"

  // 3. Fetch testcases from server
  const testcasesCode = await api.jsTestcases(url);
  const testcases = loadTestcases(testcasesCode);
  const questions = Object.keys(testcases.allCases).length;

  // 4. Get all students for the course
  const students = db.studentsByCourse({ courseId });

  // 5. Run tests and insert results in a transaction
  let graded = 0;
  db.transaction(() => {
    db.ensureAssignment({ assignmentId, openDate, courseId, title });
    db.clearJavascriptUnitTest({ assignmentId });
    db.clearScoredQuestionAssignment({ assignmentId });
    db.insertScoredQuestionAssignment({ assignmentId, questions });

    for (const student of students) {
      if (!student.github) continue;
      try {
        const repo = new Repo(`${process.env.BHS_CS_REPOS}/${student.github}.git/`);
        const sha = repo.sha(branch, filename);
        if (!sha) continue;

        const timestamp = repo.timestamp(sha);
        const code = repo.contents(sha, filename);

        const { results, error } = runTestsWithError(testcases, code);
        const testResults = error
          ? Object.fromEntries(Object.keys(testcases.allCases).map(n => [n, null]))
          : results;

        for (const [question, result] of Object.entries(testResults)) {
          const answered = result === null ? 0 : 1;
          const correct = result === null ? 0 : (result.every(r => r.passed) ? 1 : 0);
          db.insertJavascriptUnitTest({
            assignmentId, github: student.github,
            question, answered, correct, timestamp, sha
          });
        }
        graded++;
      } catch (e) {
        console.log(`Error grading ${student.github}: ${e.message}`);
      }
    }
  });

  return { graded, total: students.length, questions };
}
```

### 2. Import `runTestsWithError` and `loadTestcases`

At the top of `app.js`, add:

```js
import { runTestsWithError, loadTestcases } from './modules/test-javascript.js';
```

These already exist in `modules/test-javascript.js` — no new test-running code
needed.

### 3. Add POST route

```js
app.post('/assignments/:assignmentId/grade-js', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  try {
    const { graded, total, questions } = await gradeJavascriptUnitTests(assignmentId);
    res.send(`<span class="success">Graded ${graded}/${total} students on ${questions} questions.</span>`);
  } catch (e) {
    res.send(`<span class="error">${e.message}</span>`);
  }
});
```

### 4. Add button to the assignment students page

In `views/app/assignments/students.njk`, add a "Grade JS" button that triggers
the grading via HTMX:

```html
<button hx-post="/assignments/{{ assignment.assignment_id }}/grade-js"
        hx-target="#grade-status"
        hx-swap="innerHTML"
        hx-indicator="#grade-spinner">
  Grade JS Unit Tests
</button>
<span id="grade-spinner" class="htmx-indicator">Grading...</span>
<span id="grade-status"></span>
```

This button should only appear for coding assignments. The `assignment` object
passed to the template includes the assignment kind (from the `assignments`
table or looked up via API). If the kind isn't stored locally, we can check
whether the assignment has `scored_question_assignments` rows or just always
show the button and let the server return an error for non-coding assignments.

After grading completes, the page should reload the student scores table so the
new results are visible. This can be done by adding `hx-on::after-request` to
trigger a refresh of the student table, or by returning an HX-Trigger header
that causes the tbody to reload.

### 5. Alternative: button on the assignments list page

Could also add a grade button directly in each assignment row on `/assignments`.
This is simpler but provides less context. The students page is probably better
since you can immediately see the results.

## Things to Consider

- **Performance**: Grading reads from git repos synchronously (via
  `execSync`). For a class of ~30 students this should be fast (a few seconds).
  The HTMX indicator handles the UX during the wait.

- **Idempotency**: The function clears existing results before inserting, so
  re-grading is safe and expected.

- **Error handling**: Individual student errors are logged but don't abort the
  batch. The response reports how many students were successfully graded.

- **No disk writes**: Unlike the CLI workflow, this reads directly from git
  repos via `Repo.contents()` — no intermediate files on disk.

- **`codingConfig` dependency**: The route needs to fetch the coding config from
  the BHS-CS server to know which file to look for. This is an async API call
  that `api.codingConfig(url)` already supports.

- **`jsTestcases` vs `fetchTestcases`**: The module's `fetchTestcases` function
  hardcodes the server URL. Using `api.jsTestcases(url)` + `loadTestcases()`
  is cleaner since it uses the configured server.
