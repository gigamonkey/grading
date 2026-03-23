#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import express from 'express';
import nunjucks from 'nunjucks';
import { DB } from 'pugsql';
import { API } from './api.js';
import { Repo } from './modules/repo.js';
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
  res.render('app/assignments/students.njk', { assignment, students, hasScoring, hasJsResults });
});

app.get('/assignments/:assignmentId/students-tbody', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const assignment = db.assignmentById({ assignmentId });
  const students = db.assignmentStudentScores({ assignmentId });
  const hasScoring = !!db.hasFormAssessment({ assignmentId });
  const hasJsResults = !!db.scoredQuestionAssignment({ assignmentId });
  res.render('app/assignments/students-tbody.njk', {
    assignment,
    students,
    hasScoring,
    hasJsResults,
  });
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

app.post('/assignments/reload-gradebook', (req, res) => {
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
    db.transaction(() => {
      for (const file of files) {
        const text = fs.readFileSync(path.join(dir, file), 'utf-8');
        const rows = parse(text, { relax_column_count: true });
        const names = rows[0].slice(1);
        const studentRows = rows.slice(3);

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

    res.send(
      `<span class="success">Loaded ${totalRecords} grades from ${files.length} file${files.length === 1 ? '' : 's'}.</span>`,
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

  let graded = 0;
  db.transaction(() => {
    db.ensureAssignment({ assignmentId, openDate, courseId, title });
    db.ensureAssignmentKind({ assignmentId, kind });
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
      `<span class="success">Graded ${graded}/${total} students on ${questions} questions.</span>`,
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
  const masteryPoints = db.studentMasteryPoints({ userId });
  const masteryTotals = db.studentMasteryTotals({ userId });
  res.render('app/students/student.njk', { student, assignments, masteryPoints, masteryTotals });
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
  const standards = db.allStandards();
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
  const standards = db.allStandards();
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

app.get('/mastery-to-update', (_req, res) => {
  const rows = db.masteryToUpdate({ period: null });
  res.render('app/mastery-to-update.njk', { rows });
});

app.get('/ic-assignment/:icName', (req, res) => {
  const icName = req.params.icName;
  const assignment = db.icAssignmentInfo({ icName });
  const rows = db.icAssignmentScores({ icName });
  res.render('app/ic-assignment.njk', { icName, assignment, rows });
});

// Mastery IC Names
app.get('/mastery-ic-names', (req, res) => {
  const courses = db.distinctCourses();
  const course = req.query.course || courses[0] || null;
  const standards = course ? db.standardsWithoutMasteryIcNames({ courseId: course }) : [];
  const mappings = course ? db.masteryIcNamesByCourse({ courseId: course }) : [];
  const icNames = course ? db.availableMasteryIcNames({ courseId: course }) : [];
  res.render('app/mastery-ic-names.njk', { courses, course, standards, mappings, icNames });
});

app.get('/mastery-ic-names/options', (req, res) => {
  const { course } = req.query;
  const standards = db.standardsWithoutMasteryIcNames({ courseId: course });
  const mappings = db.masteryIcNamesByCourse({ courseId: course });
  const icNames = db.availableMasteryIcNames({ courseId: course });
  res.render('app/mastery-ic-names/options.njk', { standards, mappings, icNames, course });
});

app.put('/mastery-ic-names/:courseId/:standard', (req, res) => {
  const courseId = req.params.courseId;
  const standard = req.params.standard;
  const icName = req.body.icName?.trim();
  if (icName) db.ensureMasteryIcName({ courseId, standard, icName });
  const icNames = db.availableMasteryIcNames({ courseId });
  res.render('app/mastery-ic-names/mapping-cell.njk', {
    courseId,
    standard,
    icName: icName || null,
    icNames,
    editing: false,
  });
});

app.delete('/mastery-ic-names/:courseId/:standard', (req, res) => {
  const courseId = req.params.courseId;
  const standard = req.params.standard;
  db.deleteMasteryIcName({ courseId, standard });
  const icNames = db.availableMasteryIcNames({ courseId });
  res.render('app/mastery-ic-names/mapping-cell.njk', {
    courseId,
    standard,
    icName: null,
    icNames,
    editing: false,
  });
});

app.get('/mastery-ic-names/:courseId/:standard', (req, res) => {
  const courseId = req.params.courseId;
  const standard = req.params.standard;
  const mapping = db.masteryIcNamesByCourse({ courseId }).find((m) => m.standard === standard);
  const icName = mapping?.ic_name ?? null;
  const icNames = db.availableMasteryIcNames({ courseId });
  res.render('app/mastery-ic-names/mapping-cell.njk', {
    courseId,
    standard,
    icName,
    icNames,
    editing: false,
  });
});

app.get('/mastery-ic-names/:courseId/:standard/edit', (req, res) => {
  const courseId = req.params.courseId;
  const standard = req.params.standard;
  const mapping = db.masteryIcNamesByCourse({ courseId }).find((m) => m.standard === standard);
  const icName = mapping?.ic_name ?? null;
  const icNames = db.availableMasteryIcNames({ courseId });
  if (icName && !icNames.includes(icName)) icNames.unshift(icName);
  res.render('app/mastery-ic-names/mapping-cell.njk', {
    courseId,
    standard,
    icName,
    icNames,
    editing: true,
  });
});

app.post('/mastery-ic-names', (req, res) => {
  const { course } = req.body;
  const mappings = Object.entries(req.body)
    .filter(([k]) => k.startsWith('standard_'))
    .map(([k, v]) => ({ standard: k.replace('standard_', ''), icName: v }));
  for (const { standard, icName } of mappings) {
    if (icName) db.ensureMasteryIcName({ courseId: course, standard, icName });
  }
  res.redirect('/mastery-ic-names');
});

// Zeros
app.get('/zeros', (_req, res) => {
  const rows = db.zerosReport({ course: null, period: null });
  res.render('app/zeros.njk', { rows });
});

// Speedruns
app.get('/speedruns', (_req, res) => {
  const speedruns = db.ungradedSpeedruns();
  res.render('app/speedruns.njk', { speedruns });
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
  db.transaction(() => {
    db.clearStudentAnswers({ assignmentId });
    for (const student of students) {
      if (!student.github) continue;
      try {
        const repo = new Repo(`${process.env.BHS_CS_REPOS}/${student.github}.git/`);
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

app.post('/assignments/:assignmentId/students/:userId/reload-answers', async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const userId = req.params.userId;
  try {
    const student = db.studentById({ userId });
    if (!student?.github) {
      return res.send('<span class="error">No GitHub username for student.</span>');
    }
    const data = camelify(await api.assignment(assignmentId));
    const { url, kind } = data;
    if (kind !== 'questions') {
      return res.send(`<span class="error">Not a quiz assignment.</span>`);
    }
    const filename = `${url.slice(1)}/answers.json`;
    const repo = new Repo(`${process.env.BHS_CS_REPOS}/${student.github}.git/`);
    const sha = repo.sha('main', filename);
    if (!sha) {
      return res.send('<span class="error">No answers found.</span>');
    }
    const timestamp = repo.timestamp(sha);
    const contents = repo.contents(sha, filename);
    const answers = JSON.parse(contents);
    db.transaction(() => {
      db.clearStudentAnswersByGithub({ assignmentId, github: student.github });
      saveAnswers(student.github, assignmentId, answers, timestamp, sha);
    });
    res.send('<i class="bi bi-check-lg text-success"></i>');
  } catch (e) {
    res.send(`<span class="error">${e.message}</span>`);
  }
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
