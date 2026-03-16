#!/usr/bin/env node

import { DB } from 'pugsql';
import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const pickOne = async (rl, items, display, prompt) => {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];

  items.forEach((item, i) => console.log(`  ${i + 1}. ${display(item)}`));
  const answer = await rl.question(prompt);
  const num = parseInt(answer, 10);
  if (Number.isNaN(num) || num < 1 || num > items.length) {
    console.error('Invalid selection.');
    process.exit(1);
  }
  return items[num - 1];
};

const main = async () => {
  const rl = readline.createInterface({ input, output });

  // Find student
  const studentQuery = await rl.question('Student name: ');
  const students = db.findUser({ q: studentQuery });
  if (students.length === 0) {
    console.error('No students found.');
    process.exit(1);
  }
  const student = await pickOne(
    rl,
    students,
    (s) => `${s.sortable_name}  period ${s.period}  ${s.course_id}`,
    'Pick student number: ',
  );

  // Find assignment
  const assignmentQuery = await rl.question('Assignment id or title: ');
  const assignments = db.findAssignment({ q: assignmentQuery });
  if (assignments.length === 0) {
    console.error('No assignments found.');
    process.exit(1);
  }
  const assignment = await pickOne(
    rl,
    assignments,
    (a) => `[${a.assignment_id}] ${a.title}  (${a.course_id}  ${a.date})`,
    'Pick assignment number: ',
  );

  const scoreStr = await rl.question('Score: ');
  const score = parseFloat(scoreStr);
  if (Number.isNaN(score)) {
    console.error('Invalid score.');
    process.exit(1);
  }

  const reason = await rl.question('Reason: ');

  rl.close();

  db.ensureScoreOverride({
    userId: student.user_id,
    assignmentId: assignment.assignment_id,
    score,
    reason,
  });

  console.log(`Override set: ${student.sortable_name} / ${assignment.title} = ${score}`);
};

new Command()
  .description('Add a score override for a student assignment')
  .action(main)
  .parse();
