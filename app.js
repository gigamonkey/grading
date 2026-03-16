#!/usr/bin/env node

import process from 'node:process';
import dotenv from 'dotenv';
import express from 'express';
import nunjucks from 'nunjucks';
import { DB } from 'pugsql';
import { API } from './api.js';

dotenv.config({ path: 'local.env' });

const port = process.env.HTTP_PORT ?? 3000;
const app = express();

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const api = new API();

app.set('json spaces', 2);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const env = nunjucks.configure('views', { autoescape: true, express: app });
env.addFilter('urlencode', encodeURIComponent);

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
    res.render('app/assignments/lookup-result.njk', { assignment });
  } catch {
    res.render('app/assignments/lookup-result.njk', { error: 'Not found' });
  }
});

app.get('/assignments/:assignmentId/edit-row', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const a = db.assignmentById({ assignmentId });
  if (req.query.assignment_type) a.assignment_type = req.query.assignment_type;
  const standards = db.courseStandards({ assignmentId });
  res.render('app/assignments/edit-row.njk', { a, standards });
});

app.get('/assignments/:assignmentId/mastery-ic-name', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const { standard } = req.query;
  const icName = db.masteryIcNameForStandard({ assignmentId, standard }) || '';
  res.render('app/assignments/mastery-ic-name.njk', { icName });
});

app.get('/assignments/:assignmentId/view-row', (req, res) => {
  const a = db.assignmentById({ assignmentId: Number(req.params.assignmentId) });
  res.render('app/assignments/view-row.njk', { a });
});

app.put('/assignments/:assignmentId/point-value', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const { standard, points, assignment_type } = req.body;
  let { icName } = req.body;
  const current = db.assignmentById({ assignmentId });
  if (assignment_type === 'M') {
    if (current.assignment_type !== 'M') db.clearAssignmentPointValue({ assignmentId });
    if (current.standard && current.standard !== standard) {
      db.deleteMasteryAssignmentStandard({ assignmentId, standard: current.standard });
    }
    db.ensureMasteryAssignment({ assignmentId, standard, points: Number(points) });
  } else {
    if (current.assignment_type === 'M') {
      db.deleteMasteryAssignmentStandard({ assignmentId, standard: current.standard });
    }
    db.clearAssignmentPointValue({ assignmentId });
    db.ensureAssignmentPointValue({ assignmentId, standard, icName, points: Number(points) });
  }
  const a = db.assignmentById({ assignmentId });
  res.render('app/assignments/view-row.njk', { a });
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
    db.ensureAssignmentPointValue({ assignmentId, standard, icName, points: Number(points) });
    const assignments = db.allAssignments({ search: null });
    res.render('app/assignments/tbody.njk', { assignments });
  } catch (e) {
    res.status(400).send(`Error: ${e.message}`);
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

// Overrides
app.get('/overrides', (_req, res) => {
  const overrides = db.allOverrides();
  res.render('app/overrides.njk', { overrides });
});

app.get('/overrides/new', (_req, res) => {
  res.render('app/overrides/new.njk', {});
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
  db.ensureScoreOverride({ userId: Number(userId), assignmentId: Number(assignmentId), score: Number(score), reason });
  const overrides = db.allOverrides();
  res.render('app/overrides/tbody.njk', { overrides });
});

// To Update
app.get('/to-update', (req, res) => {
  const period = req.query.period || null;
  const rows = db.toUpdate({ period });
  const periods = db.distinctPeriods();
  if (req.headers['hx-request']) {
    res.render('app/to-update/tbody.njk', { rows });
  } else {
    res.render('app/to-update.njk', { rows, periods, period });
  }
});

app.get('/mastery-to-update', (req, res) => {
  const period = req.query.period || null;
  const rows = db.masteryToUpdate({ period });
  const periods = db.distinctPeriods();
  if (req.headers['hx-request']) {
    res.render('app/mastery-to-update/tbody.njk', { rows });
  } else {
    res.render('app/mastery-to-update.njk', { rows, periods, period });
  }
});

// Mastery IC Names
app.get('/mastery-ic-names', (req, res) => {
  const courses = db.distinctCourses();
  const course = req.query.course || courses[0] || null;
  const standards = course ? db.standardsWithoutMasteryIcNames({ courseId: course }) : [];
  const icNames = course ? db.availableMasteryIcNames({ courseId: course }) : [];
  res.render('app/mastery-ic-names.njk', { courses, course, standards, icNames });
});

app.get('/mastery-ic-names/options', (req, res) => {
  const { course } = req.query;
  const standards = db.standardsWithoutMasteryIcNames({ courseId: course });
  const icNames = db.availableMasteryIcNames({ courseId: course });
  res.render('app/mastery-ic-names/options.njk', { standards, icNames });
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
app.get('/zeros', (req, res) => {
  const course = req.query.course || null;
  const period = req.query.period || null;
  const rows = db.zerosReport({ course, period });
  const courses = db.distinctCourses();
  const periods = db.distinctPeriods();
  if (req.headers['hx-request']) {
    res.render('app/zeros/tbody.njk', { rows });
  } else {
    res.render('app/zeros.njk', { rows, courses, periods, course, period });
  }
});

// Speedruns
app.get('/speedruns', (_req, res) => {
  const speedruns = db.ungradedSpeedruns();
  res.render('app/speedruns.njk', { speedruns });
});

// Checklist grader
function checklistData(assignmentId) {
  const assignment = db.assignmentById({ assignmentId });
  const criteria = db.checklistCriteria({ assignmentId });
  const students = db.studentsByCourse({ courseId: assignment.course_id });
  const marks = db.checklistMarks({ assignmentId });
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

function ensureChecklistCriterion(assignmentId, criteriaLabel) {
  const criteria = db.checklistCriteria({ assignmentId });
  if (!criteria.some(c => c.label === criteriaLabel)) {
    db.addChecklistCriterion({ assignmentId, criteriaLabel });
  }
}

app.get('/checklist', (req, res) => {
  const search = req.query.search || null;
  const assignments = search ? db.findAssignment({ q: search }) : [];
  res.render('app/checklist.njk', { assignments, search });
});

app.get('/checklist/:assignmentId', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  ensureChecklistCriterion(assignmentId, 'Turned in');
  const sort = req.query.sort === 'name' ? 'name' : 'github';
  const data = checklistData(assignmentId);
  if (sort === 'github') {
    data.students.sort((a, b) => (a.github || '').localeCompare(b.github || ''));
  }
  res.render('app/checklist/table.njk', { ...data, sort });
});

app.post('/checklist/:assignmentId/criteria', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const label = req.body.criteriaLabel?.trim();
  if (label) db.addChecklistCriterion({ assignmentId, criteriaLabel: label });
  const data = checklistData(assignmentId);
  data.students.sort((a, b) => (a.github || '').localeCompare(b.github || ''));
  res.render('app/checklist/_table.njk', { ...data, sort: 'github' });
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
  const criteria = db.checklistCriteria({ assignmentId });
  const marks = db.checklistMarks({ assignmentId });
  const userMarks = {};
  for (const m of marks) {
    if (m.user_id === userId) userMarks[m.seq] = m.value;
  }
  const totalPoints = criteria.reduce((sum, c) => sum + (c.points ?? 1), 0);
  const earned = criteria.reduce((sum, c) => sum + (userMarks[c.seq] === 'check' ? (c.points ?? 1) : 0), 0);
  res.render('app/checklist/mark-response.njk', { assignmentId, userId, seq, value: next, earned, totalPoints });
});

app.get('/checklist/:assignmentId/criteria/:seq/label/edit', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const criterion = db.checklistCriteria({ assignmentId }).find(c => c.seq === seq);
  res.render('app/checklist/label-cell.njk', { assignmentId, seq, criteriaLabel: criterion?.label ?? '', editing: true });
});

app.put('/checklist/:assignmentId/criteria/:seq/label', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const criteriaLabel = req.body.criteriaLabel?.trim() || '';
  if (criteriaLabel) db.updateChecklistCriterionLabel({ assignmentId, seq, criteriaLabel });
  const criterion = db.checklistCriteria({ assignmentId }).find(c => c.seq === seq);
  res.render('app/checklist/label-cell.njk', { assignmentId, seq, criteriaLabel: criterion?.label ?? criteriaLabel, editing: false });
});

app.get('/checklist/:assignmentId/criteria/:seq/points/edit', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const criterion = db.checklistCriteria({ assignmentId }).find(c => c.seq === seq);
  res.render('app/checklist/points-cell.njk', { assignmentId, seq, points: criterion?.points ?? 1, editing: true });
});

app.put('/checklist/:assignmentId/criteria/:seq/points', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  const points = Number(req.body.points) || 1;
  db.updateChecklistCriterionPoints({ assignmentId, seq, points });
  const data = checklistData(assignmentId);
  data.students.sort((a, b) => (a.github || '').localeCompare(b.github || ''));
  res.render('app/checklist/_table.njk', { ...data, sort: 'github' });
});

app.delete('/checklist/:assignmentId/criteria/:seq', (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const seq = Number(req.params.seq);
  db.transaction(() => {
    db.deleteChecklistCriterion({ assignmentId, seq });
    db.deleteChecklistMarksForCriterion({ assignmentId, seq });
  })();
  const data = checklistData(assignmentId);
  data.students.sort((a, b) => (a.github || '').localeCompare(b.github || ''));
  res.render('app/checklist/_table.njk', { ...data, sort: 'github' });
});

app.listen(port, () => {
  console.log(`Gradebook app running at http://localhost:${port}`);
});
