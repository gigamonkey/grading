#!/usr/bin/env node

import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import { Command } from 'commander';
import { DB } from 'pugsql';

const db = new DB('db.db').addQueries('modules/pugly.sql').addQueries('modules/queries.sql');

const main = async (courseId) => {
  const standards = db.standardsWithoutMasteryIcNames({ courseId });

  if (standards.length === 0) {
    console.log('All mastery standards already have IC name mappings.');
    return;
  }

  const icNames = db.availableMasteryIcNames({ courseId });

  if (icNames.length === 0) {
    console.log(
      'No available IC names to map (all are already used by assignment_point_values or mastery_ic_names).',
    );
    return;
  }

  const rl = readline.createInterface({ input, output });

  console.log('\nAvailable IC names:');
  for (const [i, name] of icNames.entries()) {
    console.log(`  ${i + 1}. ${name}`);
  }

  for (const standard of standards) {
    process.stdout.write(`\nStandard: ${standard}\n`);
    const answer = await rl.question('IC name number (or enter name directly, blank to skip): ');

    if (answer.trim() === '') {
      continue;
    }

    const num = parseInt(answer, 10);
    const icName = Number.isNaN(num) ? answer.trim() : icNames[num - 1];

    if (!icName) {
      console.log(`Invalid selection, skipping.`);
      continue;
    }

    db.ensureMasteryIcName({ courseId, standard, icName });
    console.log(`  Mapped ${standard} -> ${icName}`);
  }

  rl.close();
};

new Command()
  .description('Map mastery standards to IC assignment names')
  .argument('<courseId>', 'Course ID (e.g. csa, itp)')
  .action(main)
  .parse();
