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

nunjucks.configure('views', { autoescape: true, express: app });

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

app.listen(port, () => {
  console.log(`Gradebook app running at http://localhost:${port}`);
});
