#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { open } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Temporal } from '@js-temporal/polyfill';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import express from 'express';
import nunjucks from 'nunjucks';
import { DB } from 'pugsql';
import { API } from './api.js';
import { numCorrect, scoreTest } from './modules/grading.js';
import mdfilter from './modules/mdfilter.js';
import { Repo } from './modules/repo.js';
import { durationString, getCommitData } from './modules/speedruns.js';
import { loadTestcases, runTestsWithError } from './modules/test-javascript.js';
import { camelify } from './modules/util.js';

dotenv.config();

const port = process.env.HTTP_PORT ?? 3001;
const app = express();

const db = new DB('db.db').addQueries('modules/pugly.sql').addQueries('modules/queries.sql');

const api = new API(process.env.BHS_CS_SERVER, process.env.BHS_CS_API_KEY);

app.set('json spaces', 2);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const env = nunjucks.configure('views', { autoescape: true, express: app });
env.addFilter('urlencode', encodeURIComponent);
env.addFilter('epochDate', (ts) =>
  ts
    ? new Date(ts * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '',
);

mdfilter.install(env);
env.addFilter('parse_json', (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
});

// Dashboard
app.get('/', (_req, res) => {
  const stats = db.dashboardStats();
  res.render('app/dashboard.njk', { stats });
});

// Assignments
app.get('/assignments', (req, res) => {
  const search = req.query.search || null;
  const assignments = db.allAssignments({ search });
  if (req.headers['hx-request']) {
    res.render('app/assignments/tbody.njk', { assignments });
  } else {
    res.render('app/assignments.njk', { assignments, search });
  }
});

app.get('/assignments/new', (_req, res) => {
  res.render('app/assignments/new.njk', {});
});

app.get('/assigned', async (req, res) => {
  const { search, showNotForGrade } = req.query;
  try {
    const serverAssignments = await api.assignments();
    const localIds = new Set(db.assignments().map((a) => a.assignment_id));
    const notForGradeIds = new Set(db.notForGrade().map((a) => a.assignment_id));
    let assignments = serverAssignments
      .filter((a) => !localIds.has(a.assignment_id))
      .map((a) => ({ ...a, notForGrade: notForGradeIds.has(a.assignment_id) }))
      .sort((a, b) => (b.open_date ?? '').localeCompare(a.open_date ?? ''));
    if (!showNotForGrade) {
      assignments = assignments.filter((a) => !a.notForGrade);
    }
    if (search) {
      const q = search.toLowerCase();
      assignments = assignments.filter(
        (a) =>
          String(a.assignment_id).includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.course_id.toLowerCase().includes(q) ||
          a.kind?.toLowerCase().includes(q),
      );
    }
    if (req.headers['hx-request']) {
      res.render('app/assigned-tbody.njk', { assignments, showNotForGrade });
    } else {
      res.render('app/assigned.njk', { assignments, search, showNotForGrade });
    }
  } catch (e) {
    const template = req.headers['hx-request'] ? 'app/assigned-tbody.njk' : 'app/assigned.njk';
    const error = e.message ?? `Server returned ${e.status}`;
    res.render(template, { assignments: [], search, showNotForGrade, error });
  }
});

app.get('/assigned/:assignmentId/add-form', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const { title, courseId, kind, openDate } = req.query;
  const standards = db.standardsByCourse({ courseId });
  res.render('app/assigned-add-form.njk', {
    assignmentId,
    title,
    courseId,
    kind,
    openDate,
    standards,
  });
});

app.post('/assigned/:assignmentId/add', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const { standard, icName, points } = req.body;
  try {
    const assignment = await api.assignment(assignmentId);
    db.ensureAssignment({
      assignmentId: assignment.assignment_id,
      openDate: assignment.open_date,
      courseId: assignment.course_id,
      title: assignment.title,
    });
    if (assignment.kind) {
      db.ensureAssignmentKind({
        assignmentId: assignment.assignment_id,
        kind: assignment.kind,
      });
    }
    db.ensureAssignmentPointValue({
      assignmentId: assignment.assignment_id,
      standard,
      icName,
      points: Number(points),
    });
    res.send('');
  } catch (e) {
    const error = e.message ?? `Server returned ${e.status}`;
    res.status(422).send(`<tr><td colspan="6" class="error">${error}</td></tr>`);
  }
});

app.post('/assigned/:assignmentId/not-for-grade', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  db.markNotForGrade({ assignmentId });
  res.send('');
});

app.delete('/assigned/:assignmentId/not-for-grade', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  db.unmarkNotForGrade({ assignmentId });
  res.send('');
});

app.get('/assignments/lookup', async (req, res) => {
  const { assignmentId } = req.query;
  try {
    const assignment = await api.assignment(assignmentId);
    const standards = db.standardsByCourse({ courseId: assignment.course_id });
    res.render('app/assignments/lookup-result.njk', { assignment, standards });
  } catch (e) {
    res.render('app/assignments/lookup-result.njk', { error: e.message });
  }
});

app.get('/assignments/:assignmentId/api-json', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  try {
    const data = await api.assignment(assignmentId);
    res.render('app/assignments/api-json-dialog.njk', {
      assignmentId,
      json: JSON.stringify(data, null, 2),
    });
  } catch (e) {
    res.render('app/assignments/api-json-dialog.njk', { assignmentId, error: e.message });
  }
});

app.get('/assignments/:assignmentId/students', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const assignment = db.assignmentById({ assignmentId });
  const students = db.assignmentStudentScores({ assignmentId });
  const hasScoring = !!db.hasFormAssessment({ assignmentId });
  const hasJsResults = !!db.scoredQuestionAssignment({ assignmentId });
  const provenance = db.assignmentProvenance({ assignmentId })?.provenance;
  const hasJavaResults = provenance === 'java_unit_tests_scores';
  res.render('app/assignments/students.njk', {
    assignment,
    students,
    hasScoring,
    hasJsResults,
    hasJavaResults,
    provenance,
  });
});

app.get('/assignments/:assignmentId/students-tbody', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const assignment = db.assignmentById({ assignmentId });
  const students = db.assignmentStudentScores({ assignmentId });
  const hasScoring = !!db.hasFormAssessment({ assignmentId });
  const hasJsResults = !!db.scoredQuestionAssignment({ assignmentId });
  const provenance = db.assignmentProvenance({ assignmentId })?.provenance;
  const hasJavaResults = provenance === 'java_unit_tests_scores';
  res.render('app/assignments/students-tbody.njk', {
    assignment,
    students,
    hasScoring,
    hasJsResults,
    hasJavaResults,
  });
});

app.get('/assignments/:assignmentId/students/:userId/row', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId;
  const assignment = db.assignmentById({ assignmentId });
  const students = db.assignmentStudentScores({ assignmentId });
  const s = students.find((r) => r.user_id === userId);
  if (!s) return res.status(404).send('');
  const hasScoring = !!db.hasFormAssessment({ assignmentId });
  const hasJsResults = !!db.scoredQuestionAssignment({ assignmentId });
  const provenance = db.assignmentProvenance({ assignmentId })?.provenance;
  const hasJavaResults = provenance === 'java_unit_tests_scores';
  res.render('app/assignments/student-row.njk', {
    assignment,
    s,
    hasScoring,
    hasJsResults,
    hasJavaResults,
    provenance,
  });
});

app.post('/assignments/:assignmentId/students/:userId/direct-score', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId;
  const score = Number(req.body.score);
  if (Number.isNaN(score) || score < 0 || score > 1) {
    return res.status(400).send('Invalid score');
  }
  db.ensureDirectScore({ assignmentId, userId, score });
  res.set('HX-Trigger', JSON.stringify({ 'score-updated': userId }));
  res.send(`${(score * 100).toFixed(0)}%`);
});

app.get('/assignments/:assignmentId/students/:userId/answers', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId;
  const assignment = db.assignmentById({ assignmentId });
  const student = db.studentById({ userId });

  // Check for JS unit test results first
  const jsResults = db.studentJsTestResults({ assignmentId, github: student.github });
  if (jsResults.length > 0) {
    const totalScore = jsResults.length
      ? jsResults.filter((r) => r.answered).reduce((sum, r) => sum + r.correct, 0) /
        jsResults.length
      : null;
    return res.render('app/assignments/student-js-results.njk', {
      assignment,
      student,
      results: jsResults,
      totalScore,
    });
  }

  const rows = db.studentQuizAnswers({ assignmentId, github: student.github });
  // Group rows by question (mchoices have multiple rows per question)
  const questions = [];
  let current = null;
  for (const row of rows) {
    if (!current || current.question_number !== row.question_number) {
      current = {
        question_number: row.question_number,
        label: row.label,
        kind: row.kind,
        question: row.question,
        answers: [],
        score: null,
      };
      questions.push(current);
    }
    if (row.raw_answer != null) {
      current.answers.push(row.raw_answer);
      // For choices/freeanswer, score is on the single row; for mchoices we don't show per-answer scores
      if (row.score != null && current.score == null) {
        current.score = row.score;
      }
    }
  }
  const scored = questions.filter((q) => q.score != null);
  const totalScore = scored.length
    ? scored.reduce((sum, q) => sum + q.score, 0) / questions.length
    : null;
  res.render('app/assignments/student-answers.njk', { assignment, student, questions, totalScore });
});

app.get('/assignments/:assignmentId/view-row', (req, res) => {
  const a = db.assignmentById({ assignmentId: Number(req.params.assignmentId) });
  res.render('app/assignments/view-row.njk', { a });
});

function saveAssignmentField(assignmentId, updates) {
  const current = db.assignmentById({ assignmentId });
  const type = updates.assignment_type ?? current.assignment_type;
  const standard = updates.standard ?? current.standard;
  const icName = updates.icName ?? current.ic_name ?? '';
  const points = updates.points != null ? Number(updates.points) : Number(current.points || 0);

  // Handle cleanup when switching between A and M
  if (type === 'M' && current.assignment_type !== 'M') {
    db.clearAssignmentPointValue({ assignmentId });
  }
  if (type !== 'M' && current.assignment_type === 'M' && current.standard) {
    db.deleteMasteryAssignmentStandard({ assignmentId, standard: current.standard });
  }

  // Can't write to point-value tables without a standard (NOT NULL + PK)
  if (!standard) return;

  if (type === 'M') {
    if (current.assignment_type === 'M' && current.standard && current.standard !== standard) {
      db.deleteMasteryAssignmentStandard({ assignmentId, standard: current.standard });
    }
    db.ensureMasteryAssignment({ assignmentId, standard, points });
  } else {
    if (current.standard && current.standard !== standard) {
      db.clearAssignmentPointValue({ assignmentId });
    }
    db.ensureAssignmentPointValue({ assignmentId, standard, icName, points });
  }
}

// Per-field editing endpoints for assignments
app.get('/assignments/:assignmentId/type', (req, res) => {
  const a = db.assignmentById({ assignmentId: Number(req.params.assignmentId) });
  res.render('app/assignments/type-cell.njk', { a, editing: req.query.edit === '1' });
});

app.put('/assignments/:assignmentId/type', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  saveAssignmentField(assignmentId, { assignment_type: req.body.assignment_type });
  const a = db.assignmentById({ assignmentId });
  // Return full row since type change can clear other fields
  res.setHeader('HX-Retarget', `#apv-row-${assignmentId}`);
  res.setHeader('HX-Reswap', 'outerHTML');
  res.render('app/assignments/view-row.njk', { a });
});

app.get('/assignments/:assignmentId/standard', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const a = db.assignmentById({ assignmentId });
  const standards = req.query.edit === '1' ? db.courseStandards({ assignmentId }) : [];
  res.render('app/assignments/standard-cell.njk', {
    a,
    standards,
    editing: req.query.edit === '1',
  });
});

app.put('/assignments/:assignmentId/standard', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  saveAssignmentField(assignmentId, { standard: req.body.standard });
  const a = db.assignmentById({ assignmentId });
  // Return full row since standard affects editability of other cells
  res.setHeader('HX-Retarget', `#apv-row-${assignmentId}`);
  res.setHeader('HX-Reswap', 'outerHTML');
  res.render('app/assignments/view-row.njk', { a });
});

app.get('/assignments/:assignmentId/ic-name', (req, res) => {
  const a = db.assignmentById({ assignmentId: Number(req.params.assignmentId) });
  res.render('app/assignments/ic-name-cell.njk', { a, editing: req.query.edit === '1' });
});

app.put('/assignments/:assignmentId/ic-name', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  saveAssignmentField(assignmentId, { icName: req.body.icName });
  const a = db.assignmentById({ assignmentId });
  res.render('app/assignments/ic-name-cell.njk', { a, editing: false });
});

app.get('/assignments/:assignmentId/points', (req, res) => {
  const a = db.assignmentById({ assignmentId: Number(req.params.assignmentId) });
  res.render('app/assignments/points-cell.njk', { a, editing: req.query.edit === '1' });
});

app.put('/assignments/:assignmentId/points', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  saveAssignmentField(assignmentId, { points: req.body.points });
  const a = db.assignmentById({ assignmentId });
  res.render('app/assignments/points-cell.njk', { a, editing: false });
});

app.post('/assignments', async (req, res) => {
  const { assignmentId, standard, icName, points } = req.body;
  try {
    const assignment = await api.assignment(assignmentId);
    db.ensureAssignment({
      assignmentId: assignment.assignment_id,
      openDate: assignment.open_date,
      courseId: assignment.course_id,
      title: assignment.title,
    });
    if (assignment.kind) {
      db.ensureAssignmentKind({
        assignmentId: assignment.assignment_id,
        kind: assignment.kind,
      });
    }
    db.ensureAssignmentPointValue({
      assignmentId: assignment.assignment_id,
      standard,
      icName,
      points: Number(points),
    });
    res.setHeader('HX-Redirect', '/assignments');
    res.send('');
  } catch (e) {
    res.render('app/assignments/tbody.njk', { assignments: [], error: e.message });
  }
});

app.post('/assignments/:assignmentId/refresh-kind', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  try {
    const data = camelify(await api.assignment(assignmentId));
    if (data.kind) {
      db.ensureAssignmentKind({ assignmentId, kind: data.kind });
    }
  } catch (e) {
    console.log(`Failed to fetch kind for assignment ${assignmentId}: ${e.message}`);
  }
  const a = db.assignmentById({ assignmentId });
  res.render('app/assignments/view-row.njk', { a });
});

app.post('/assignments/reload-gradebook', (_req, res) => {
  const dir = process.env.GRADEBOOK_DIR;
  if (!dir) {
    res.send('<span class="error">GRADEBOOK_DIR not set in .env</span>');
    return;
  }

  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('Grade Book Export') && f.endsWith('.csv'))
      .sort((a, b) => {
        const sa = fs.statSync(path.join(dir, a)).mtimeMs;
        const sb = fs.statSync(path.join(dir, b)).mtimeMs;
        return sa - sb;
      });
    if (files.length === 0) {
      res.send(`<span class="error">No Grade Book Export CSV files found in ${dir}</span>`);
      return;
    }

    let totalRecords = 0;
    const skipped = [];
    db.transaction(() => {
      for (const file of files) {
        const text = fs.readFileSync(path.join(dir, file), 'utf-8');
        const rows = parse(text, { relax_column_count: true });
        const names = rows[0].slice(1);
        const maxPoints = rows[2].slice(1);
        const studentRows = rows.slice(3);

        // Sniff course_id by tallying the courses of the students in this CSV.
        // The export filename does not carry the course, but the gradebook is
        // per-course so the modal student course is the CSV's course.
        const courseCounts = new Map();
        for (const cols of studentRows) {
          const m = cols[0].match(/#(\d+)/);
          if (!m) continue;
          const r = db.courseIdByStudentNumber({ studentNumber: m[1] });
          if (r?.course_id) {
            courseCounts.set(r.course_id, (courseCounts.get(r.course_id) ?? 0) + 1);
          }
        }
        let courseId = null;
        let max = 0;
        for (const [c, n] of courseCounts) {
          if (n > max) {
            max = n;
            courseId = c;
          }
        }
        if (!courseId) {
          skipped.push(file);
        } else {
          for (let i = 0; i < names.length; i++) {
            if (names[i] && maxPoints[i]) {
              db.ensureIcPointValue({
                courseId,
                icName: names[i],
                points: Number(maxPoints[i]),
              });
            }
          }
        }

        for (const cols of studentRows) {
          const name = cols[0];
          const match = name.match(/#(\d+)/);
          if (!match) continue;
          const studentNumber = match[1];
          const points = cols.slice(1);
          for (let i = 0; i < names.length; i++) {
            if (points[i]) {
              db.ensureIcGrade({ studentNumber, icName: names[i], points: Number(points[i]) });
              totalRecords++;
            }
          }
        }
      }
    });

    for (const file of files) {
      fs.unlinkSync(path.join(dir, file));
    }

    res.set('HX-Trigger', 'gradebook-reloaded');
    const skipMsg = skipped.length
      ? ` Skipped point values for ${skipped.length} file${skipped.length === 1 ? '' : 's'} with no recognized students.`
      : '';
    res.send(
      `<span class="success">Loaded ${totalRecords} grades from ${files.length} file${files.length === 1 ? '' : 's'}.${skipMsg}</span>`,
    );
  } catch (e) {
    res.send(`<span class="error">${e.message}</span>`);
  }
});

async function gradeJavascriptUnitTests(assignmentId) {
  const data = camelify(await api.assignment(assignmentId));
  const { url, kind, courseId, title, openDate } = data;

  if (kind !== 'coding') {
    throw new Error(`Assignment kind is "${kind}", expected "coding".`);
  }

  const config = await api.codingConfig(url);
  const branch = url.slice(1);
  const filename = `${url.slice(1)}/${config.files[0]}`;

  const testcasesCode = await api.jsTestcases(url);
  const testcases = loadTestcases(testcasesCode);
  const questions = Object.keys(testcases.allCases).length;

  const students = db.studentsByCourse({ courseId });

  const repos = new Map();
  for (const student of students) {
    if (!student.github) continue;
    try {
      const repo = new Repo(`${process.env.BHS_CS_REPOS}/${student.github}.git/`);
      repo.fetch();
      repos.set(student.github, repo);
    } catch (e) {
      console.log(`Error fetching repo for ${student.github}: ${e.message}`);
    }
  }

  let graded = 0;
  db.transaction(() => {
    db.ensureAssignment({ assignmentId, openDate, courseId, title });
    db.ensureAssignmentKind({ assignmentId, kind });
    db.clearJavascriptUnitTest({ assignmentId });
    db.clearScoredQuestionAssignment({ assignmentId });
    db.insertScoredQuestionAssignment({ assignmentId, questions });

    for (const student of students) {
      const repo = repos.get(student.github);
      if (!repo) continue;
      try {
        const sha = repo.sha(branch, filename);
        if (!sha) continue;

        const timestamp = repo.timestamp(sha);
        const code = repo.contents(sha, filename);

        const { results, error } = runTestsWithError(testcases, code);
        const testResults = error
          ? Object.fromEntries(Object.keys(testcases.allCases).map((n) => [n, null]))
          : results;

        for (const [question, result] of Object.entries(testResults)) {
          const answered = result === null ? 0 : 1;
          const correct = result === null ? 0 : result.every((r) => r.passed) ? 1 : 0;
          db.insertJavascriptUnitTest({
            assignmentId,
            github: student.github,
            question,
            answered,
            correct,
            timestamp,
            sha,
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

app.post('/assignments/:assignmentId/grade-js', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  try {
    const { graded, total, questions } = await gradeJavascriptUnitTests(assignmentId);
    res.setHeader('HX-Trigger', 'gradesUpdated');
    res.send(
      `<i class="bi bi-check-circle-fill text-success" title="Graded ${graded}/${total} students on ${questions} questions"></i>`,
    );
  } catch (e) {
    res.send(`<span class="error">${e.message}</span>`);
  }
});

function runJavaGrader(args, stdin) {
  const jar = process.env.BHS_CS_JAR;
  if (!jar) throw new Error('BHS_CS_JAR environment variable not set.');
  const cmd = `java -cp ${jar} com.gigamonkeys.bhs.grading.Grade ${args}`;
  const opts = { encoding: 'utf-8', timeout: 600_000, maxBuffer: 50 * 1024 * 1024 };
  if (stdin) opts.input = stdin;
  const raw = execSync(cmd, opts);
  try {
    return JSON.parse(raw);
  } catch (_e) {
    throw new Error(`Failed to parse Grade output: ${raw.slice(0, 500)}`);
  }
}

async function gradeJavaUnitTests(assignmentId) {
  const data = camelify(await api.assignment(assignmentId));
  const { url, kind, courseId, title, openDate } = data;

  if (kind !== 'coding') {
    throw new Error(`Assignment kind is "${kind}", expected "coding".`);
  }

  const config = await api.codingConfig(url);
  const file = config.files[0];
  if (!file.endsWith('.java')) {
    throw new Error(`Not a Java assignment (file: ${file}).`);
  }

  const tester = config.server.testClass;
  const branch = url.slice(1);
  const filename = `${branch}/${file}`;

  const students = db.studentsByCourse({ courseId });
  const repoPathList = students
    .filter((s) => s.github)
    .map((s) => `${process.env.BHS_CS_REPOS}/${s.github}.git/`);
  for (const path of repoPathList) {
    try {
      new Repo(path).fetch();
    } catch (e) {
      console.log(`Error fetching ${path}: ${e.message}`);
    }
  }
  const repoPaths = repoPathList.join('\n');

  const output = runJavaGrader(
    `--repos-from - --file ${filename} --tester ${tester} --branch ${branch} --latest --output json`,
    repoPaths,
  );
  const firstWithResults = Object.values(output).find((e) => e.results);
  const questions = firstWithResults ? Object.keys(firstWithResults.results).length : 0;
  if (questions === 0) {
    throw new Error(
      'Java grader returned no results for any student. Is the tester class in the jar up to date?',
    );
  }

  let graded = 0;
  db.transaction(() => {
    db.ensureAssignment({ assignmentId, openDate, courseId, title });
    db.ensureAssignmentKind({ assignmentId, kind });
    db.clearJavaUnitTest({ assignmentId });
    db.clearScoredQuestionAssignment({ assignmentId });
    db.insertScoredQuestionAssignment({ assignmentId, questions });

    for (const [github, entry] of Object.entries(output)) {
      const { results, sha, time } = entry;
      const timestamp = time ? Math.floor(new Date(time).getTime() / 1000) : null;
      const correct = results ? numCorrect(results) : 0;
      const score = results ? scoreTest(results, questions) : 0;
      db.insertJavaUnitTest({ assignmentId, github, correct, score, timestamp, sha });
      graded++;
    }
  });

  return { graded, total: students.length, questions };
}

app.post('/assignments/:assignmentId/grade-java', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  try {
    const { graded, total, questions } = await gradeJavaUnitTests(assignmentId);
    res.setHeader('HX-Trigger', 'gradesUpdated');
    res.send(
      `<i class="bi bi-check-circle-fill text-success" title="Graded ${graded}/${total} students on ${questions} questions"></i>`,
    );
  } catch (e) {
    res.send(`<span class="error">${e.message}</span>`);
  }
});

// Students
app.get('/students', (req, res) => {
  const search = req.query.search || null;
  const students = db.allStudents({ search });
  if (req.headers['hx-request']) {
    res.render('app/students/tbody.njk', { students });
  } else {
    res.render('app/students.njk', { students, search });
  }
});

app.get('/students/:userId', (req, res) => {
  const userId = req.params.userId;
  const student = db.studentById({ userId });
  const assignments = db.studentAssignmentScores({ userId });
  const reloadKinds = Object.fromEntries(
    assignments.map((a) => [a.assignment_id, reloadKindFor(a.assignment_id)]),
  );
  const masteryPoints = db.studentMasteryPoints({ userId });
  const masteryTotals = db.studentMasteryTotals({ userId });
  const speedruns = db.studentSpeedruns({ userId });
  const toUpdate = db.studentToUpdate({ userId });
  const masteryToUpdate = db.studentMasteryToUpdate({ userId });
  res.render('app/students/student.njk', {
    student,
    assignments,
    reloadKinds,
    masteryPoints,
    masteryTotals,
    speedruns,
    toUpdate,
    masteryToUpdate,
  });
});

app.post('/students/:userId/drop', (req, res) => {
  const userId = req.params.userId;
  db.transaction(() => {
    db.insertDroppedStudent({ userId });
    db.deleteRosterStudent({ userId });
  });
  const students = db.allStudents({ search: null });
  res.render('app/students/tbody.njk', { students });
});

// Overrides
app.get('/overrides', (_req, res) => {
  const overrides = db.allOverrides();
  res.render('app/overrides.njk', { overrides });
});

app.get('/overrides/new', (_req, res) => {
  res.render('app/overrides/form.njk', {});
});

app.get('/overrides/search-students', (req, res) => {
  const students = db.findUser({ q: req.query.q || '' });
  res.render('app/overrides/student-results.njk', { students });
});

app.get('/overrides/search-assignments', (req, res) => {
  const assignments = db.findAssignment({ q: req.query.q || '' });
  res.render('app/overrides/assignment-results.njk', { assignments });
});

app.post('/overrides', (req, res) => {
  const { userId, assignmentId, score, reason } = req.body;
  db.ensureScoreOverride({
    userId,
    assignmentId: Number(assignmentId),
    score: Number(score),
    reason,
  });
  const overrides = db.allOverrides();
  res.render('app/overrides/post-response.njk', { overrides });
});

// Ad Hoc Mastery Points
app.get('/ad-hoc-mastery', (_req, res) => {
  const points = db.allAdHocMasteryPoints();
  res.render('app/ad-hoc-mastery.njk', { rows: points });
});

app.get('/ad-hoc-mastery/new', (_req, res) => {
  const standards = db.standardsWithIcNames();
  const reasons = db.adHocReasons();
  const today = new Date().toISOString().slice(0, 10);
  res.render('app/ad-hoc-mastery/form.njk', { standards, reasons, today });
});

app.get('/ad-hoc-mastery/search-students', (req, res) => {
  const students = db.findUser({ q: req.query.q || '' });
  res.render('app/overrides/student-results.njk', { students });
});

app.post('/ad-hoc-mastery', (req, res) => {
  const { userId, standard, points, reason, date } = req.body;
  db.insertAdHocMasteryPoints({
    userId,
    standard,
    points: Number(points),
    reason,
    date,
  });
  const allPoints = db.allAdHocMasteryPoints();
  const standards = db.standardsWithIcNames();
  const reasons = db.adHocReasons();
  res.render('app/ad-hoc-mastery/post-response.njk', { rows: allPoints, standards, reasons });
});

app.get('/ad-hoc-mastery/reason/:reason', (req, res) => {
  const reason = req.params.reason;
  const points = db.adHocMasteryPointsByReason({ reason });
  const standard = req.query.standard || (points.length ? points[0].standard : '');
  const today = new Date().toISOString().slice(0, 10);
  res.render('app/ad-hoc-mastery/reason.njk', { points, reason, standard, today });
});

app.post('/ad-hoc-mastery/reason/:reason', (req, res) => {
  const reason = req.params.reason;
  const { userId, standard, points, date } = req.body;
  db.insertAdHocMasteryPoints({
    userId,
    standard,
    points: Number(points),
    reason,
    date,
  });
  const allPoints = db.adHocMasteryPointsByReason({ reason });
  res.render('app/ad-hoc-mastery/reason-tbody.njk', { points: allPoints });
});

app.get('/ad-hoc-mastery/student/:userId', (req, res) => {
  const userId = req.params.userId;
  const student = db.studentById({ userId });
  const points = db.studentMasteryPoints({ userId });
  const totals = db.studentMasteryTotals({ userId });
  res.render('app/ad-hoc-mastery/student.njk', { student, points, totals });
});

app.get('/ad-hoc-mastery/:rowid/points', (_req, res) => {
  const rowid = Number(_req.params.rowid);
  const editing = _req.query.edit === '1';
  res.render('app/ad-hoc-mastery/points-cell.njk', {
    rowid,
    points: Number(_req.query.points),
    editing,
  });
});

app.put('/ad-hoc-mastery/:rowid/points', (req, res) => {
  const rowid = Number(req.params.rowid);
  db.updateAdHocMasteryPoints({ rowid, points: Number(req.body.points) });
  res.render('app/ad-hoc-mastery/points-cell.njk', {
    rowid,
    points: Number(req.body.points),
    editing: false,
  });
});

app.delete('/ad-hoc-mastery/:rowid', (req, res) => {
  db.deleteAdHocMasteryPoints({ rowid: Number(req.params.rowid) });
  res.send('');
});

// To Update
app.get('/to-update', (_req, res) => {
  const rows = db.toUpdate({ period: null });
  res.render('app/to-update.njk', { rows });
});

app.get('/to-update/tbody', (_req, res) => {
  const rows = db.toUpdate({ period: null });
  res.render('app/to-update/tbody.njk', { rows });
});

app.get('/mastery-to-update', (_req, res) => {
  const rows = db.masteryToUpdate({ period: null });
  res.render('app/mastery-to-update.njk', { rows });
});

app.get('/mastery-to-update/tbody', (_req, res) => {
  const rows = db.masteryToUpdate({ period: null });
  res.render('app/mastery-to-update/tbody.njk', { rows });
});

app.get('/ic-assignment/:icName', (req, res) => {
  const icName = req.params.icName;
  const assignment = db.icAssignmentInfo({ icName });
  const rows = db.icAssignmentScores({ icName });
  const existsInIc = !!db.icPointValue({ icName });
  res.render('app/ic-assignment.njk', { icName, assignment, rows, existsInIc });
});

// Mastery IC Names
app.get('/standards', (_req, res) => {
  const standards = db.standardsWithIcNames();
  res.render('app/standards.njk', { standards });
});

app.put('/standards/:courseId/:standard', (req, res) => {
  const courseId = req.params.courseId;
  const standard = req.params.standard;
  const icName = req.body.icName?.trim();
  if (icName) db.ensureMasteryIcName({ courseId, standard, icName });
  const icNames = db.availableMasteryIcNames({ courseId });
  res.render('app/standards/mapping-cell.njk', {
    courseId,
    standard,
    icName: icName || null,
    icNames,
    editing: false,
  });
});

app.delete('/standards/:courseId/:standard', (req, res) => {
  const courseId = req.params.courseId;
  const standard = req.params.standard;
  db.deleteMasteryIcName({ courseId, standard });
  const icNames = db.availableMasteryIcNames({ courseId });
  res.render('app/standards/mapping-cell.njk', {
    courseId,
    standard,
    icName: null,
    icNames,
    editing: false,
  });
});

app.get('/standards/:courseId/:standard', (req, res) => {
  const courseId = req.params.courseId;
  const standard = req.params.standard;
  const mapping = db.masteryIcNamesByCourse({ courseId }).find((m) => m.standard === standard);
  const icName = mapping?.ic_name ?? null;
  const icNames = db.availableMasteryIcNames({ courseId });
  res.render('app/standards/mapping-cell.njk', {
    courseId,
    standard,
    icName,
    icNames,
    editing: false,
  });
});

app.get('/standards/:courseId/:standard/edit', (req, res) => {
  const courseId = req.params.courseId;
  const standard = req.params.standard;
  const mapping = db.masteryIcNamesByCourse({ courseId }).find((m) => m.standard === standard);
  const icName = mapping?.ic_name ?? null;
  const icNames = db.availableMasteryIcNames({ courseId });
  if (icName && !icNames.includes(icName)) icNames.unshift(icName);
  res.render('app/standards/mapping-cell.njk', {
    courseId,
    standard,
    icName,
    icNames,
    editing: true,
  });
});

// Zeros
app.get('/zeros', (_req, res) => {
  const rows = db.zerosReport({ course: null, period: null });
  res.render('app/zeros.njk', { rows });
});

// Speedruns
app.get('/speedruns', (_req, res) => {
  const speedruns = db.allSpeedruns();
  const firstUngraded = speedruns.find((s) => s.ok == null);
  const ungradedCount = speedruns.filter((s) => s.ok == null).length;
  res.render('app/speedruns.njk', { speedruns, ungradedCount, firstUngraded });
});

app.post('/speedruns/sync', async (_req, res) => {
  try {
    const _result = await syncSpeedruns();
    res.set('HX-Redirect', '/speedruns');
    res.send('');
  } catch (e) {
    res.send(`<p class="text-danger">Sync error: ${e.message}</p>`);
  }
});

async function countQuestions(url) {
  const filename = `${homedir()}/hacks/bhs-cs/views/pages/${url}/index.njk`;
  const file = await open(filename);
  let questions = 0;
  for await (const line of file.readLines()) {
    if (line.match(/^\s*<div data-name/)) {
      questions++;
    }
  }
  return questions;
}

async function syncSpeedruns() {
  const onServer = await api.completedSpeedruns();
  const inGradebook = new Set(db.completedSpeedruns().map((r) => r.speedrun_id));
  const speedrunnables = new Set(db.speedrunnables().map((r) => r.assignment_id));
  const assignments = new Set(db.assignments().map((r) => r.assignment_id));

  let inserted = 0;
  const toFetch = new Set();

  for (const s of onServer) {
    if (!inGradebook.has(s.speedrun_id)) {
      const github = db.github({ userId: s.user_id });
      if (github) {
        toFetch.add(github);
        db.insertCompletedSpeedrun(camelify(s));
        inserted++;
      }
    }
  }

  const serverAssignmentIds = new Set(onServer.map((s) => s.assignment_id));
  for (const id of serverAssignmentIds) {
    if (!speedrunnables.has(id)) {
      const assignment = camelify(await api.assignment(id));
      const kind = assignment.url.match(/itp/) ? 'javascript' : 'java';
      const questions = await countQuestions(assignment.url);
      db.insertSpeedrunnable({ assignmentId: id, kind, questions });
    }
    if (!assignments.has(id)) {
      const assignment = camelify(await api.assignment(id));
      const { assignmentId, openDate: date, courseId, title } = assignment;
      db.insertAssignment({ assignmentId, date, courseId, title });
    }
  }

  for (const github of toFetch) {
    new Repo(`${process.env.BHS_CS_REPOS}/${github}.git`).fetch();
  }

  return { inserted, fetched: toFetch.size };
}

function gradeJavaSpeedrun(repo, branch, file, config, speedrun) {
  const tester = config.server.testClass;
  const filename = `${branch}/${file}`;
  const output = runJavaGrader(
    `--repo ${repo} --file ${filename} --tester ${tester} --branch ${branch} --range ${speedrun.first_sha}..${speedrun.last_sha} --output json`,
  );

  const entries = Object.entries(output);
  const totalQuestions =
    entries.length > 0
      ? Math.max(...entries.map(([, e]) => (e.results ? Object.keys(e.results).length : 0)))
      : speedrun.questions;

  let maxPassed = 0;
  const commits = entries.map(([label, e]) => {
    const passed = e.results
      ? Object.values(e.results).filter((cases) => cases.every((c) => c.passed)).length
      : 0;
    const total = e.results ? Object.keys(e.results).length : 0;
    maxPassed = Math.max(maxPassed, passed);

    return {
      shortSha: e.sha || label,
      date: e.time || '',
      elapsed: e.delta != null ? durationString(Temporal.Duration.from({ seconds: e.delta })) : '',
      totalElapsed:
        e.elapsed != null ? durationString(Temporal.Duration.from({ seconds: e.elapsed })) : '',
      elapsedSeconds: e.delta ?? 0,
      totalElapsedSeconds: e.elapsed ?? 0,
      passed,
      attempted: total,
      error: e.error || null,
    };
  });

  commits.sort((a, b) => a.totalElapsedSeconds - b.totalElapsedSeconds);

  const totalSeconds = commits.length > 0 ? commits[commits.length - 1].totalElapsedSeconds : 0;

  return {
    commits,
    totalTime: durationString(Temporal.Duration.from({ seconds: totalSeconds })),
    totalSeconds,
    maxPassed,
    questions: totalQuestions,
  };
}

function buildTimelineFromCache(rows, questions) {
  let maxPassed = 0;
  const commits = rows.map((r) => {
    const passed = r.passed ?? undefined;
    if (passed != null) maxPassed = Math.max(maxPassed, passed);
    return {
      shortSha: r.sha,
      date: r.timestamp || '',
      elapsed:
        r.delta_seconds != null
          ? durationString(Temporal.Duration.from({ seconds: r.delta_seconds }))
          : '',
      totalElapsed:
        r.elapsed_seconds != null
          ? durationString(Temporal.Duration.from({ seconds: r.elapsed_seconds }))
          : '',
      elapsedSeconds: r.delta_seconds ?? 0,
      totalElapsedSeconds: r.elapsed_seconds ?? 0,
      passed: r.passed,
      attempted: r.attempted,
      error: r.error || null,
    };
  });

  const totalSeconds = commits.length > 0 ? commits[commits.length - 1].totalElapsedSeconds : 0;

  return {
    commits,
    totalTime: durationString(Temporal.Duration.from({ seconds: totalSeconds })),
    totalSeconds,
    maxPassed,
    questions,
  };
}

function cacheTimeline(speedrunId, timeline) {
  for (const c of timeline.commits) {
    db.insertSpeedrunCommit({
      speedrunId,
      sha: c.shortSha,
      timestamp: c.date,
      deltaSeconds: c.elapsedSeconds,
      elapsedSeconds: c.totalElapsedSeconds,
      passed: c.passed ?? null,
      attempted: c.attempted ?? null,
      error: c.error ?? null,
    });
  }
}

app.get('/speedruns/:speedrunId', (req, res) => {
  const { speedrunId } = req.params;
  const speedrun = db.specificSpeedrun({ speedrunId });
  if (!speedrun) {
    return res.status(404).send('Speedrun not found.');
  }

  const ungraded = db.ungradedSpeedruns();
  const currentIndex = ungraded.findIndex((s) => s.speedrun_id === Number(speedrunId));
  const total = ungraded.length;

  res.render('app/speedruns/grade.njk', {
    speedrun,
    currentIndex: currentIndex + 1,
    total,
  });
});

app.get('/speedruns/:speedrunId/results', async (req, res) => {
  const { speedrunId } = req.params;
  const speedrun = db.specificSpeedrun({ speedrunId });
  if (!speedrun) {
    return res.status(404).send('Speedrun not found.');
  }

  const { url } = await api.assignment(speedrun.assignment_id);
  const config = await api.codingConfig(url);
  const file = config.files[0];
  const repo = `${process.env.BHS_CS_REPOS}/${speedrun.github}.git/`;
  const branch = url.slice(1);

  // Check cache first
  const cached = db.speedrunCommitsForSpeedrun({ speedrunId });
  let timeline;
  if (cached.length > 0) {
    timeline = buildTimelineFromCache(cached, speedrun.questions);
  } else {
    const repoObj = new Repo(repo);
    try {
      repoObj.fetch();
    } catch (e) {
      console.log(`Error fetching ${repo}: ${e.message}`);
    }

    function extendedLastSha(lastSha) {
      try {
        return repoObj.nextChange(lastSha, branch);
      } catch {
        return null;
      }
    }

    if (file.endsWith('.java')) {
      timeline = gradeJavaSpeedrun(repo, branch, file, config, speedrun);

      if (timeline.commits.length > 0 && timeline.maxPassed < timeline.questions) {
        const next = extendedLastSha(speedrun.last_sha);
        if (next) {
          db.updateSpeedrunLastSha({ speedrunId, lastSha: next.sha });
          timeline = gradeJavaSpeedrun(repo, branch, file, config, {
            ...speedrun,
            last_sha: next.sha,
          });
        }
      }
    } else {
      const testcases = loadTestcases(await api.jsTestcases(url));
      timeline = getCommitData(
        repo,
        branch,
        file,
        testcases,
        speedrun.first_sha,
        speedrun.last_sha,
        branch,
        speedrun.questions,
      );

      if (timeline.commits.length > 0 && timeline.maxPassed < timeline.questions) {
        const next = extendedLastSha(speedrun.last_sha);
        if (next) {
          db.updateSpeedrunLastSha({ speedrunId, lastSha: next.sha });
          timeline = getCommitData(
            repo,
            branch,
            file,
            testcases,
            speedrun.first_sha,
            next.sha,
            branch,
            speedrun.questions,
          );
        }
      }
    }

    cacheTimeline(speedrunId, timeline);
  }

  const graded = db.gradedSpeedrun({ speedrunId });
  res.render('app/speedruns/results.njk', { speedrun, timeline, graded });
});

app.post('/speedruns/:speedrunId/regrade', async (req, res) => {
  const { speedrunId } = req.params;
  db.deleteSpeedrunCommits({ speedrunId });
  db.deleteGradedSpeedrun({ speedrunId });
  res.set('HX-Redirect', `/speedruns/${speedrunId}`);
  res.send('');
});

app.post('/speedruns/:speedrunId/grade', (req, res) => {
  const { speedrunId } = req.params;
  const currentId = Number(speedrunId);
  const ok = Number(req.body.ok);
  db.ensureGradedSpeedrun({ speedrunId, ok });

  const ungraded = db.ungradedSpeedruns();
  const next = ungraded.find((s) => s.speedrun_id > currentId) || ungraded[0];
  if (next) {
    res.set('HX-Redirect', `/speedruns/${next.speedrun_id}`);
  } else {
    res.set('HX-Redirect', '/speedruns');
  }
  res.send('');
});

app.post('/speedruns/:speedrunId/skip', (_req, res) => {
  const ungraded = db.ungradedSpeedruns();
  // Find the next one after the current
  const currentId = Number(_req.params.speedrunId);
  const currentIndex = ungraded.findIndex((s) => s.speedrun_id === currentId);
  const next = ungraded[currentIndex + 1] || ungraded[0];
  if (next && next.speedrun_id !== currentId) {
    res.set('HX-Redirect', `/speedruns/${next.speedrun_id}`);
  } else {
    res.set('HX-Redirect', '/speedruns');
  }
  res.send('');
});

// Checklist grader
function renderChecklistTable(
  res,
  assignmentId,
  sort = 'github',
  dir = 'asc',
  prevSort = null,
  prevDir = 'asc',
) {
  const data = checklistData(assignmentId);
  const byGithub = (a, b) => (a.github || '').localeCompare(b.github || '');
  const byName = (a, b) => (a.sortable_name || '').localeCompare(b.sortable_name || '');
  const byPoints = (a, b) =>
    (data.studentPoints[a.user_id] ?? -1) - (data.studentPoints[b.user_id] ?? -1);
  const makeCmp = (s, d) => {
    const r = d === 'desc' ? -1 : 1;
    if (s === 'github') return (a, b) => r * byGithub(a, b);
    if (s === 'name') return (a, b) => r * byName(a, b);
    if (s === 'score' || s === 'points') return (a, b) => r * byPoints(a, b);
    return () => 0;
  };
  const secondary = prevSort ? makeCmp(prevSort, prevDir) : byGithub;
  data.students.sort((a, b) => makeCmp(sort, dir)(a, b) || secondary(a, b));
  res.render('app/checklist/_table.njk', { ...data, sort, dir, prevSort, prevDir });
}

function checklistData(assignmentId) {
  const assignment = db.assignmentById({ assignmentId });
  const criteria = db.checklistCriteriaForAssignment({ assignmentId });
  const students = db.studentsByCourse({ courseId: assignment.course_id });
  const marks = db.checklistMarksForAssignment({ assignmentId });
  const markMap = {};
  for (const m of marks) {
    if (!markMap[m.user_id]) markMap[m.user_id] = {};
    markMap[m.user_id][m.seq] = m.value;
  }
  const totalPoints = criteria.reduce((sum, c) => sum + (c.points ?? 1), 0);
  const studentPoints = {};
  for (const s of students) {
    studentPoints[s.user_id] = criteria.reduce((sum, c) => {
      return sum + (markMap[s.user_id]?.[c.seq] === 'check' ? (c.points ?? 1) : 0);
    }, 0);
  }
  return { assignment, criteria, students, markMap, totalPoints, studentPoints };
}

function ensureDefaultCriteria(assignmentId) {
  const criteria = db.checklistCriteriaForAssignment({ assignmentId });
  if (criteria.length === 0) {
    db.addChecklistCriterion({ assignmentId, criteriaLabel: 'Turned in' });
  }
}

app.get('/checklist', (req, res) => {
  const search = req.query.search || null;
  const assignments = db.ungradedAssignments({ search });
  if (req.headers['hx-request']) {
    res.render('app/checklist/tbody.njk', { assignments });
  } else {
    res.render('app/checklist.njk', { assignments, search });
  }
});

app.get('/checklist/:assignmentId', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  ensureDefaultCriteria(assignmentId);
  const sort = ['name', 'github', 'score', 'points'].includes(req.query.sort)
    ? req.query.sort
    : 'github';
  const defaultDir = sort === 'score' || sort === 'points' ? 'desc' : 'asc';
  const dir = ['asc', 'desc'].includes(req.query.dir) ? req.query.dir : defaultDir;
  const prevSort = ['name', 'github', 'score', 'points'].includes(req.query.prevSort)
    ? req.query.prevSort
    : null;
  const prevDir = ['asc', 'desc'].includes(req.query.prevDir) ? req.query.prevDir : 'asc';
  const data = checklistData(assignmentId);

  const byGithub = (a, b) => (a.github || '').localeCompare(b.github || '');
  const byName = (a, b) => (a.sortable_name || '').localeCompare(b.sortable_name || '');
  const byPoints = (a, b) =>
    (data.studentPoints[a.user_id] ?? -1) - (data.studentPoints[b.user_id] ?? -1);

  const makeCmp = (s, d) => {
    const r = d === 'desc' ? -1 : 1;
    if (s === 'github') return (a, b) => r * byGithub(a, b);
    if (s === 'name') return (a, b) => r * byName(a, b);
    if (s === 'score' || s === 'points') return (a, b) => r * byPoints(a, b);
    return () => 0;
  };

  const primary = makeCmp(sort, dir);
  const secondary = prevSort ? makeCmp(prevSort, prevDir) : byGithub;
  data.students.sort((a, b) => primary(a, b) || secondary(a, b));

  res.render('app/checklist/table.njk', { ...data, sort, dir, prevSort, prevDir });
});

app.post('/checklist/:assignmentId/criteria', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const label = req.body.criteriaLabel?.trim();
  if (label) db.addChecklistCriterion({ assignmentId, criteriaLabel: label });
  renderChecklistTable(res, assignmentId);
});

app.put('/checklist/:assignmentId/mark/:userId/:seq', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId; // keep as string — roster.user_id is TEXT
  const seq = Number(req.params.seq);
  const current = db.getChecklistMark({ userId, assignmentId, seq });
  const next = !current ? 'check' : current.value === 'check' ? 'x' : null;
  if (next) {
    db.upsertChecklistMark({ userId, assignmentId, seq, value: next });
  } else {
    db.deleteChecklistMark({ userId, assignmentId, seq });
  }
  const criteria = db.checklistCriteriaForAssignment({ assignmentId });
  const marks = db.checklistMarksForAssignment({ assignmentId });
  const userMarks = {};
  for (const m of marks) {
    if (m.user_id === userId) userMarks[m.seq] = m.value;
  }
  const totalPoints = criteria.reduce((sum, c) => sum + (c.points ?? 1), 0);
  const earned = criteria.reduce(
    (sum, c) => sum + (userMarks[c.seq] === 'check' ? (c.points ?? 1) : 0),
    0,
  );
  res.render('app/checklist/mark-response.njk', {
    assignmentId,
    userId,
    seq,
    value: next,
    earned,
    totalPoints,
  });
});

app.get('/checklist/:assignmentId/criteria/:seq/label', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const criterion = db.checklistCriteriaForAssignment({ assignmentId }).find((c) => c.seq === seq);
  res.render('app/checklist/label-cell.njk', {
    assignmentId,
    seq,
    criteriaLabel: criterion?.label ?? '',
    editing: false,
  });
});

app.get('/checklist/:assignmentId/criteria/:seq/label/edit', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const criterion = db.checklistCriteriaForAssignment({ assignmentId }).find((c) => c.seq === seq);
  res.render('app/checklist/label-cell.njk', {
    assignmentId,
    seq,
    criteriaLabel: criterion?.label ?? '',
    editing: true,
  });
});

app.put('/checklist/:assignmentId/criteria/:seq/label', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const criteriaLabel = req.body.criteriaLabel?.trim() || '';
  if (criteriaLabel) db.updateChecklistCriterionLabel({ assignmentId, seq, criteriaLabel });
  const criterion = db.checklistCriteriaForAssignment({ assignmentId }).find((c) => c.seq === seq);
  res.render('app/checklist/label-cell.njk', {
    assignmentId,
    seq,
    criteriaLabel: criterion?.label ?? criteriaLabel,
    editing: false,
  });
});

app.get('/checklist/:assignmentId/criteria/:seq/points', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const criterion = db.checklistCriteriaForAssignment({ assignmentId }).find((c) => c.seq === seq);
  res.render('app/checklist/points-cell.njk', {
    assignmentId,
    seq,
    points: criterion?.points ?? 1,
    editing: false,
  });
});

app.get('/checklist/:assignmentId/criteria/:seq/points/edit', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const criterion = db.checklistCriteriaForAssignment({ assignmentId }).find((c) => c.seq === seq);
  res.render('app/checklist/points-cell.njk', {
    assignmentId,
    seq,
    points: criterion?.points ?? 1,
    editing: true,
  });
});

app.put('/checklist/:assignmentId/criteria/:seq/points', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const points = Number(req.body.points) || 1;
  db.updateChecklistCriterionPoints({ assignmentId, seq, points });
  renderChecklistTable(res, assignmentId);
});

app.delete('/checklist/:assignmentId/criteria/:seq', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  db.transaction(() => {
    db.deleteChecklistCriterion({ assignmentId, seq });
    db.deleteChecklistMarksForCriterion({ assignmentId, seq });
  });
  renderChecklistTable(res, assignmentId);
});

// MD Grader

function mdGraderData(assignmentId, userId, branch, filePath) {
  const assignment = db.assignmentById({ assignmentId });
  const items = db.rubricItemsForAssignment({ assignmentId });
  const students = db.studentsByCourse({ courseId: assignment.course_id });
  students.sort((a, b) => (a.github || '').localeCompare(b.github || ''));
  const allMarks = db.rubricMarksForAssignment({ assignmentId });
  const markMap = {};
  for (const m of allMarks) {
    if (!markMap[m.user_id]) markMap[m.user_id] = {};
    markMap[m.user_id][m.seq] = m.fraction;
  }
  const totalPoints = items.reduce((sum, item) => sum + item.points, 0);

  const studentIndex = userId ? students.findIndex((s) => s.user_id === userId) : 0;
  const student = students[studentIndex];

  const prevUserId = students[(studentIndex - 1 + students.length) % students.length].user_id;
  const nextUserId = students[(studentIndex + 1) % students.length].user_id;

  let mdHtml = '';
  let mdRaw = '';
  let wordCount = 0;
  let fileError = null;
  let sha = null;
  try {
    const repo = new Repo(`${process.env.BHS_CS_REPOS}/${student.github}.git/`);
    sha = repo.sha(branch, filePath);
    mdRaw = repo.contents(branch, filePath);
    mdHtml = env.getFilter('md')(mdRaw, false);
    wordCount = mdRaw.split(/\s+/).filter(Boolean).length;
    if (sha) {
      const timestamp = repo.timestamp(sha);
      db.upsertRubricSubmission({ userId: student.user_id, assignmentId, sha, timestamp });
    }
  } catch {
    fileError = `Could not load ${filePath} from branch ${branch} for ${student.github}`;
  }
  if (!sha) {
    sha = 'not-submitted';
    db.upsertRubricSubmission({ userId: student.user_id, assignmentId, sha, timestamp: null });
  }

  // Auto-compute word_count marks
  for (const item of items) {
    if (item.kind === 'word_count') {
      const params = JSON.parse(item.parameters);
      const fraction = Math.min(wordCount / params.minWords, 1.0);
      db.upsertRubricMark({ userId: student.user_id, assignmentId, sha, seq: item.seq, fraction });
      if (!markMap[student.user_id]) markMap[student.user_id] = {};
      markMap[student.user_id][item.seq] = fraction;
    }
  }

  const earned = items.reduce((sum, item) => {
    const fraction = markMap[student.user_id]?.[item.seq];
    return sum + (fraction != null ? fraction * item.points : 0);
  }, 0);

  return {
    assignment,
    assignmentId,
    items,
    student,
    students,
    studentIndex,
    totalStudents: students.length,
    markMap,
    totalPoints,
    earned,
    prevUserId,
    nextUserId,
    branch,
    filePath,
    sha,
    mdHtml,
    mdRaw,
    wordCount,
    fileError,
  };
}

function renderMdGraderSidebar(res, assignmentId, userId, branch, filePath) {
  const data = mdGraderData(assignmentId, userId, branch, filePath);
  res.render('app/md-grader/_sidebar.njk', data);
}

app.get('/md-grader/:assignmentId', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  let branch = req.query.branch;
  let filePath = req.query.path;
  if (!branch || !filePath) {
    const config = db.rubricConfigForAssignment({ assignmentId });
    if (config) {
      branch = config.branch;
      filePath = config.file_path;
    } else {
      const assignment = db.assignmentById({ assignmentId });
      return res.render('app/md-grader/setup.njk', { assignment, assignmentId });
    }
  } else {
    db.upsertRubricConfig({ assignmentId, branch, filePath });
  }
  const data = mdGraderData(assignmentId, null, branch, filePath);
  res.render('app/md-grader/page.njk', data);
});

app.post('/md-grader/:assignmentId/fetch-submissions', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  let branch = req.body.branch;
  let filePath = req.body.filePath;
  if (!branch || !filePath) {
    const config = db.rubricConfigForAssignment({ assignmentId });
    if (config) {
      branch = config.branch;
      filePath = config.file_path;
    }
  }
  const students = db.rubricStudentsNeedingFetch({ assignmentId });
  let found = 0;
  for (const student of students) {
    try {
      const repo = new Repo(`${process.env.BHS_CS_REPOS}/${student.github}.git/`);
      repo.fetch();
      if (branch && filePath) {
        const sha = repo.sha(branch, filePath);
        if (sha) {
          const timestamp = repo.timestamp(sha);
          db.upsertRubricSubmission({ userId: student.user_id, assignmentId, sha, timestamp });
          found++;
        }
      }
    } catch (e) {
      console.log(`Error fetching ${student.github}: ${e.message}`);
    }
  }
  res.render('app/md-grader/fetch-result.njk', { fetched: students.length, found });
});

app.get('/md-grader/:assignmentId/student/:userId', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId;
  const branch = req.query.branch;
  const filePath = req.query.filePath;
  const data = mdGraderData(assignmentId, userId, branch, filePath);
  const content = env.render('app/md-grader/_content.njk', data);
  const sidebar = env.render('app/md-grader/_sidebar.njk', data);
  res.send(content + sidebar);
});

app.post('/md-grader/:assignmentId/rubric', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const label = req.body.label?.trim();
  if (label) {
    db.addRubricItem({
      assignmentId,
      label,
      points: Number(req.body.points) || 1,
      kind: 'manual',
      parameters: null,
    });
  }
  const userId = req.body.userId;
  const branch = req.body.branch;
  const filePath = req.body.filePath;
  renderMdGraderSidebar(res, assignmentId, userId, branch, filePath);
});

app.post('/md-grader/:assignmentId/word-count-item', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const minWords = Number(req.body.minWords) || 100;
  const points = Number(req.body.points) || 1;
  db.addRubricItem({
    assignmentId,
    label: `Min ${minWords} words`,
    points,
    kind: 'word_count',
    parameters: JSON.stringify({ minWords }),
  });
  const userId = req.body.userId;
  const branch = req.body.branch;
  const filePath = req.body.filePath;
  renderMdGraderSidebar(res, assignmentId, userId, branch, filePath);
});

app.put('/md-grader/:assignmentId/mark/:userId/:seq', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId;
  const seq = Number(req.params.seq);
  const branch = req.query.branch;
  const filePath = req.query.filePath;
  const sha = req.query.sha;

  // Three-state cycle: ungraded → 1.0 → 0.0 → delete (ungraded)
  const current = db.getRubricMark({ userId, assignmentId, sha, seq });
  if (!current) {
    db.upsertRubricMark({ userId, assignmentId, sha, seq, fraction: 1.0 });
  } else if (current.fraction === 1.0) {
    db.upsertRubricMark({ userId, assignmentId, sha, seq, fraction: 0.0 });
  } else {
    db.deleteRubricMark({ userId, assignmentId, sha, seq });
  }

  const items = db.rubricItemsForAssignment({ assignmentId });
  const marks = db.rubricMarksForAssignment({ assignmentId });
  const userMarks = {};
  for (const m of marks) {
    if (m.user_id === userId) userMarks[m.seq] = m.fraction;
  }
  const totalPoints = items.reduce((sum, item) => sum + item.points, 0);
  const earned = items.reduce((sum, item) => {
    const fraction = userMarks[item.seq];
    return sum + (fraction != null ? fraction * item.points : 0);
  }, 0);

  const updatedMark = db.getRubricMark({ userId, assignmentId, sha, seq });
  const fraction = updatedMark ? updatedMark.fraction : undefined;

  const student = { user_id: userId };
  res.render('app/md-grader/mark-response.njk', {
    assignmentId,
    student,
    seq,
    fraction,
    earned,
    totalPoints,
    branch,
    filePath,
    sha,
  });
});

app.get('/md-grader/:assignmentId/rubric/:seq/label', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.query.userId;
  const branch = req.query.branch;
  const filePath = req.query.filePath;
  renderMdGraderSidebar(res, assignmentId, userId, branch, filePath);
});

app.get('/md-grader/:assignmentId/rubric/:seq/label/edit', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.query.userId;
  const branch = req.query.branch;
  const filePath = req.query.filePath;
  const data = mdGraderData(assignmentId, userId, branch, filePath);
  const seq = Number(req.params.seq);
  data.editingLabelSeq = seq;
  res.render('app/md-grader/_sidebar.njk', data);
});

app.put('/md-grader/:assignmentId/rubric/:seq/label', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const label = req.body.label?.trim() || '';
  if (label) db.updateRubricItemLabel({ assignmentId, seq, label });
  const userId = req.body.userId;
  const branch = req.body.branch;
  const filePath = req.body.filePath;
  renderMdGraderSidebar(res, assignmentId, userId, branch, filePath);
});

app.get('/md-grader/:assignmentId/rubric/:seq/points', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.query.userId;
  const branch = req.query.branch;
  const filePath = req.query.filePath;
  renderMdGraderSidebar(res, assignmentId, userId, branch, filePath);
});

app.get('/md-grader/:assignmentId/rubric/:seq/points/edit', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.query.userId;
  const branch = req.query.branch;
  const filePath = req.query.filePath;
  const data = mdGraderData(assignmentId, userId, branch, filePath);
  const seq = Number(req.params.seq);
  data.editingPointsSeq = seq;
  res.render('app/md-grader/_sidebar.njk', data);
});

app.put('/md-grader/:assignmentId/rubric/:seq/points', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const points = Number(req.body.points) || 1;
  db.updateRubricItemPoints({ assignmentId, seq, points });
  const userId = req.body.userId;
  const branch = req.body.branch;
  const filePath = req.body.filePath;
  renderMdGraderSidebar(res, assignmentId, userId, branch, filePath);
});

app.delete('/md-grader/:assignmentId/rubric/:seq', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  db.transaction(() => {
    db.deleteRubricItem({ assignmentId, seq });
    db.deleteRubricMarksForItem({ assignmentId, seq });
  });
  const userId = req.query.userId;
  const branch = req.query.branch;
  const filePath = req.query.filePath;
  renderMdGraderSidebar(res, assignmentId, userId, branch, filePath);
});

// Quiz Scoring

function saveAnswers(github, assignmentId, answers, timestamp, sha) {
  answers.forEach((answer, num) => {
    if (Array.isArray(answer)) {
      answer.forEach((a, i) => {
        db.ensureStudentAnswer({
          github,
          assignmentId,
          questionNumber: num,
          answerNumber: i,
          rawAnswer: a,
          timestamp,
          sha,
        });
        if (a)
          db.ensureNormalizedAnswer({
            assignmentId,
            questionNumber: num,
            rawAnswer: a,
            answer: a.trim(),
          });
      });
    } else {
      db.ensureStudentAnswer({
        github,
        assignmentId,
        questionNumber: num,
        answerNumber: 0,
        rawAnswer: answer,
        timestamp,
        sha,
      });
      if (answer)
        db.ensureNormalizedAnswer({
          assignmentId,
          questionNumber: num,
          rawAnswer: answer,
          answer: answer.trim(),
        });
    }
  });
}

function quizScoringData(assignmentId, questionNumber) {
  const assignment = db.assignmentById({ assignmentId });
  const questions = db.questionsForFormAssessment({ assignmentId });

  // Determine scored status for each question
  for (const q of questions) {
    const unscored = db.unscoredAnswersForQuestion({
      assignmentId,
      questionNumber: q.question_number,
    });
    q.scored = unscored.length === 0;
  }

  // Find current question
  const question = questions.find((q) => q.question_number === questionNumber) || null;
  const unscoredAnswers = question
    ? db.unscoredAnswersForQuestion({ assignmentId, questionNumber })
    : [];
  const scoredAnswers = question
    ? db.scoredAnswersForQuestion({ assignmentId, questionNumber })
    : [];

  // Students grouped by the answer they gave (for the right-side panel).
  const studentsByAnswer = {};
  if (question) {
    for (const row of db.studentsForQuestion({ assignmentId, questionNumber })) {
      (studentsByAnswer[row.answer] ||= []).push(row);
    }
  }

  // Compute per-question accuracy stats
  const totalStudents =
    unscoredAnswers.reduce((s, a) => s + a.student_count, 0) +
    scoredAnswers.reduce((s, a) => s + a.student_count, 0);
  const correctStudents = scoredAnswers
    .filter((a) => a.score >= 1)
    .reduce((s, a) => s + a.student_count, 0);

  // Prev/next
  const idx = questions.findIndex((q) => q.question_number === questionNumber);
  const prevQuestion = idx > 0 ? questions[idx - 1].question_number : null;
  const nextQuestion = idx < questions.length - 1 ? questions[idx + 1].question_number : null;

  return {
    assignment,
    questions,
    question,
    unscoredAnswers,
    scoredAnswers,
    studentsByAnswer,
    totalStudents,
    correctStudents,
    prevQuestion,
    nextQuestion,
    currentQuestion: questionNumber,
  };
}

function firstUnscoredQuestion(assignmentId) {
  const questions = db.questionsForFormAssessment({ assignmentId });
  for (const q of questions) {
    const unscored = db.unscoredAnswersForQuestion({
      assignmentId,
      questionNumber: q.question_number,
    });
    if (unscored.length > 0) return q.question_number;
  }
  return questions.length > 0 ? questions[0].question_number : 0;
}

function nextUnscoredQuestion(assignmentId, afterQuestionNumber) {
  const questions = db.questionsForFormAssessment({ assignmentId });
  const idx = questions.findIndex((q) => q.question_number === afterQuestionNumber);
  // Look after current
  for (let i = idx + 1; i < questions.length; i++) {
    const unscored = db.unscoredAnswersForQuestion({
      assignmentId,
      questionNumber: questions[i].question_number,
    });
    if (unscored.length > 0) return questions[i].question_number;
  }
  // Wrap around
  for (let i = 0; i <= idx; i++) {
    const unscored = db.unscoredAnswersForQuestion({
      assignmentId,
      questionNumber: questions[i].question_number,
    });
    if (unscored.length > 0) return questions[i].question_number;
  }
  // All scored, stay on next question
  return idx < questions.length - 1 ? questions[idx + 1].question_number : afterQuestionNumber;
}

app.get('/quiz-scoring', (_req, res) => {
  const assessments = db.formAssessmentsWithDetails();
  res.render('app/quiz-scoring.njk', { assessments });
});

async function fetchAndLoadAnswers(assignmentId) {
  const data = camelify(await api.assignment(assignmentId));
  const { url, kind, courseId, title, openDate } = data;
  if (kind !== 'questions') {
    throw new Error(`Assignment kind is "${kind}", expected "questions".`);
  }
  db.ensureAssignment({ assignmentId, openDate, courseId, title });
  db.ensureAssignmentKind({ assignmentId, kind });
  db.ensureFormAssessment({ assignmentId });
  const students = db.studentsByCourse({ courseId });
  const filename = `${url.slice(1)}/answers.json`;
  let loaded = 0;
  const repos = new Map();
  for (const student of students) {
    if (!student.github) continue;
    try {
      const repo = new Repo(`${process.env.BHS_CS_REPOS}/${student.github}.git/`);
      repo.fetch();
      repos.set(student.github, repo);
    } catch (e) {
      console.log(`Error fetching repo for ${student.github}: ${e.message}`);
    }
  }
  db.transaction(() => {
    db.clearStudentAnswers({ assignmentId });
    for (const student of students) {
      const repo = repos.get(student.github);
      if (!repo) continue;
      try {
        const sha = repo.sha('main', filename);
        if (sha) {
          const timestamp = repo.timestamp(sha);
          const contents = repo.contents(sha, filename);
          const answers = JSON.parse(contents);
          saveAnswers(student.github, assignmentId, answers, timestamp, sha);
          loaded++;
        }
      } catch (e) {
        console.log(`Error fetching answers for ${student.github}: ${e.message}`);
      }
    }
  });
  return { loaded, total: students.length };
}

app.get('/quiz-scoring/:assignmentId', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const studentCount =
    db.formAssessmentsWithDetails().find((a) => a.assignment_id === assignmentId)?.student_count ||
    0;
  if (studentCount === 0) {
    try {
      await fetchAndLoadAnswers(assignmentId);
    } catch (e) {
      console.log(`Auto-fetch failed for assignment ${assignmentId}: ${e.message}`);
    }
  }
  const questionNumber =
    req.query.q != null ? Number(req.query.q) : firstUnscoredQuestion(assignmentId);
  const data = quizScoringData(assignmentId, questionNumber);
  const newStudentCount =
    db.formAssessmentsWithDetails().find((a) => a.assignment_id === assignmentId)?.student_count ||
    0;
  res.render('app/quiz-scoring/scoring.njk', {
    ...data,
    assignmentId,
    studentCount: newStudentCount,
  });
});

app.post('/quiz-scoring/:assignmentId/fetch', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  try {
    const { loaded, total } = await fetchAndLoadAnswers(assignmentId);
    res.render('app/quiz-scoring/fetch-status.njk', { loaded, total });
  } catch (e) {
    res.render('app/quiz-scoring/fetch-status.njk', { error: e.message });
  }
});

async function doReloadAnswers(assignmentId, student) {
  const data = camelify(await api.assignment(assignmentId));
  const { url, kind } = data;
  if (kind !== 'questions') {
    return { ok: false, html: '<span class="error">Not a quiz assignment.</span>' };
  }
  const filename = `${url.slice(1)}/answers.json`;
  const repo = new Repo(`${process.env.BHS_CS_REPOS}/${student.github}.git/`);
  repo.fetch();
  const sha = repo.sha('main', filename);
  if (!sha) {
    return { ok: false, html: '<span class="error">No answers found.</span>' };
  }
  const timestamp = repo.timestamp(sha);
  const contents = repo.contents(sha, filename);
  const answers = JSON.parse(contents);
  db.transaction(() => {
    db.clearStudentAnswersByGithub({ assignmentId, github: student.github });
    saveAnswers(student.github, assignmentId, answers, timestamp, sha);
  });
  return { ok: true, event: 'answers-reloaded' };
}

app.post('/assignments/:assignmentId/students/:userId/reload-answers', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId;
  try {
    const student = db.studentById({ userId });
    if (!student?.github) {
      return res.send('<span class="error">No GitHub username for student.</span>');
    }
    const r = await doReloadAnswers(assignmentId, student);
    if (!r.ok) return res.send(r.html);
    res.set('HX-Trigger', JSON.stringify({ [r.event]: userId }));
    res.send('<i class="bi bi-check-lg text-success"></i>');
  } catch (e) {
    res.send(`<span class="error">${e.message}</span>`);
  }
});

async function doReloadJs(assignmentId, student) {
  const data = camelify(await api.assignment(assignmentId));
  const { url, kind } = data;
  if (kind !== 'coding') {
    return { ok: false, html: '<span class="error">Not a coding assignment.</span>' };
  }
  const config = await api.codingConfig(url);
  const branch = url.slice(1);
  const filename = `${url.slice(1)}/${config.files[0]}`;

  const repo = new Repo(`${process.env.BHS_CS_REPOS}/${student.github}.git/`);
  repo.fetch();
  const sha = repo.sha(branch, filename);
  if (!sha) {
    return { ok: false, html: '<span class="error">No code found.</span>' };
  }
  const timestamp = repo.timestamp(sha);
  const code = repo.contents(sha, filename);

  const testcasesCode = await api.jsTestcases(url);
  const testcases = loadTestcases(testcasesCode);

  const { results, error } = runTestsWithError(testcases, code);
  const testResults = error
    ? Object.fromEntries(Object.keys(testcases.allCases).map((n) => [n, null]))
    : results;

  db.transaction(() => {
    db.clearJavascriptUnitTestForStudent({ assignmentId, github: student.github });
    for (const [question, result] of Object.entries(testResults)) {
      const answered = result === null ? 0 : 1;
      const correct = result === null ? 0 : result.every((r) => r.passed) ? 1 : 0;
      db.insertJavascriptUnitTest({
        assignmentId,
        github: student.github,
        question,
        answered,
        correct,
        timestamp,
        sha,
      });
    }
  });
  return { ok: true, event: 'js-reloaded' };
}

app.post('/assignments/:assignmentId/students/:userId/reload-js', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId;
  try {
    const student = db.studentById({ userId });
    if (!student?.github) {
      return res.send('<span class="error">No GitHub username for student.</span>');
    }
    const r = await doReloadJs(assignmentId, student);
    if (!r.ok) return res.send(r.html);
    res.set('HX-Trigger', JSON.stringify({ [r.event]: userId }));
    res.send('<i class="bi bi-check-lg text-success"></i>');
  } catch (e) {
    res.send(`<span class="error">${e.message}</span>`);
  }
});

async function doReloadJava(assignmentId, student) {
  const data = camelify(await api.assignment(assignmentId));
  const { url, kind } = data;
  if (kind !== 'coding') {
    return { ok: false, html: '<span class="error">Not a coding assignment.</span>' };
  }
  const config = await api.codingConfig(url);
  const file = config.files[0];
  if (!file.endsWith('.java')) {
    return { ok: false, html: '<span class="error">Not a Java assignment.</span>' };
  }
  const tester = config.server.testClass;
  const branch = url.slice(1);
  const filename = `${branch}/${file}`;
  const repoPath = `${process.env.BHS_CS_REPOS}/${student.github}.git/`;
  try {
    new Repo(repoPath).fetch();
  } catch (e) {
    console.log(`Error fetching ${repoPath}: ${e.message}`);
  }

  const output = runJavaGrader(
    `--repo ${repoPath} --file ${filename} --tester ${tester} --branch ${branch} --latest --output json`,
  );

  const entry = output[student.github];
  if (!entry) {
    return { ok: false, html: '<span class="error">No results found.</span>' };
  }

  const { results, sha, time } = entry;
  const timestamp = Math.floor(new Date(time).getTime() / 1000);
  const questions = db.scoredQuestionAssignment({ assignmentId })?.questions;
  const correct = numCorrect(results);
  const score = scoreTest(results, questions);
  db.ensureJavaUnitTest({ assignmentId, github: student.github, correct, score, timestamp, sha });
  return { ok: true, event: 'java-reloaded' };
}

app.post('/assignments/:assignmentId/students/:userId/reload-java', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId;
  try {
    const student = db.studentById({ userId });
    if (!student?.github) {
      return res.send('<span class="error">No GitHub username for student.</span>');
    }
    const r = await doReloadJava(assignmentId, student);
    if (!r.ok) return res.send(r.html);
    res.set('HX-Trigger', JSON.stringify({ [r.event]: userId }));
    res.send('<i class="bi bi-check-lg text-success"></i>');
  } catch (e) {
    res.send(`<span class="error">${e.message}</span>`);
  }
});

function reloadKindFor(assignmentId) {
  if (db.hasFormAssessment({ assignmentId })) return 'answers';
  const provenance = db.assignmentProvenance({ assignmentId })?.provenance;
  if (provenance === 'java_unit_tests_scores') return 'java';
  if (db.scoredQuestionAssignment({ assignmentId })) return 'js';
  return null;
}

app.post('/students/:userId/assignments/:assignmentId/reload', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId;
  try {
    const student = db.studentById({ userId });
    if (!student?.github) {
      return res.send('<span class="error">No GitHub username for student.</span>');
    }
    const kind = reloadKindFor(assignmentId);
    let r;
    if (kind === 'answers') r = await doReloadAnswers(assignmentId, student);
    else if (kind === 'js') r = await doReloadJs(assignmentId, student);
    else if (kind === 'java') r = await doReloadJava(assignmentId, student);
    else return res.send('<span class="error">Reload not supported.</span>');
    if (!r.ok) return res.send(r.html);
    res.set(
      'HX-Trigger',
      JSON.stringify({
        [r.event]: userId,
        'student-assignment-reloaded': `${userId}-${assignmentId}`,
      }),
    );
    res.send('<i class="bi bi-check-lg text-success"></i>');
  } catch (e) {
    res.send(`<span class="error">${e.message}</span>`);
  }
});

app.get('/students/:userId/assignments/:assignmentId/row', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId;
  const student = db.studentById({ userId });
  const assignments = db.studentAssignmentScores({ userId });
  const a = assignments.find((row) => row.assignment_id === assignmentId);
  if (!a) return res.status(404).send('');
  res.render('app/students/assignment-row.njk', {
    a,
    student,
    userId,
    reloadKind: reloadKindFor(assignmentId),
  });
});

app.get('/quiz-scoring/:assignmentId/question/:questionNumber', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const questionNumber = Number(req.params.questionNumber);
  const data = quizScoringData(assignmentId, questionNumber);
  res.render('app/quiz-scoring/question-panel.njk', { ...data, assignmentId });
});

app.post('/quiz-scoring/:assignmentId/question/:questionNumber/score-choice', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const questionNumber = Number(req.params.questionNumber);
  const correctAnswer = req.body.answer;
  const unscored = db.unscoredAnswersForQuestion({ assignmentId, questionNumber });
  db.transaction(() => {
    for (const a of unscored) {
      const score = a.answer === correctAnswer ? 1.0 : 0.0;
      db.addScoredAnswer({ assignmentId, questionNumber, answer: a.answer, score });
    }
  });
  const next = nextUnscoredQuestion(assignmentId, questionNumber);
  const data = quizScoringData(assignmentId, next);
  res.render('app/quiz-scoring/question-panel.njk', { ...data, assignmentId });
});

app.post('/quiz-scoring/:assignmentId/question/:questionNumber/toggle-mchoice', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const questionNumber = Number(req.params.questionNumber);
  const { answer } = req.body;
  const score = Number(req.body.score);
  db.addScoredAnswer({ assignmentId, questionNumber, answer, score });
  const remaining = db.unscoredAnswersForQuestion({ assignmentId, questionNumber });
  const showQuestion =
    remaining.length > 0 ? questionNumber : nextUnscoredQuestion(assignmentId, questionNumber);
  const data = quizScoringData(assignmentId, showQuestion);
  res.render('app/quiz-scoring/question-panel.njk', { ...data, assignmentId });
});

app.post('/quiz-scoring/:assignmentId/question/:questionNumber/score-free', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const questionNumber = Number(req.params.questionNumber);
  const { answer } = req.body;
  const score = Number(req.body.score);
  db.addScoredAnswer({ assignmentId, questionNumber, answer, score });
  const remaining = db.unscoredAnswersForQuestion({ assignmentId, questionNumber });
  const showQuestion =
    remaining.length > 0 ? questionNumber : nextUnscoredQuestion(assignmentId, questionNumber);
  const data = quizScoringData(assignmentId, showQuestion);
  res.render('app/quiz-scoring/question-panel.njk', { ...data, assignmentId });
});

app.post('/quiz-scoring/:assignmentId/question/:questionNumber/unscore', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const questionNumber = Number(req.params.questionNumber);
  const { answer } = req.body;
  db.deleteScoredAnswer({ assignmentId, questionNumber, answer });
  const data = quizScoringData(assignmentId, questionNumber);
  res.render('app/quiz-scoring/question-panel.njk', { ...data, assignmentId });
});

app.listen(port, () => {
  console.log(`Gradebook app running at http://localhost:${port}`);
});
