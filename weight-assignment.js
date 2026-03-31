#!/usr/bin/env node

import { env, stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import { Command } from 'commander';
import { DB } from 'pugsql';
import { API } from './api.js';
import { camelify } from './modules/util.js';

const db = new DB('db.db').addQueries('modules/pugly.sql').addQueries('modules/queries.sql');

const ensureAssignment = async (assignmentId, opts) => {
  const assignment = db.assignment({ assignmentId });

  if (assignment) {
    return camelify(assignment);
  } else {
    const api = new API(opts.server, opts.apiKey);
    const assignment = camelify(await api.assignment(assignmentId));
    if (assignment) {
      db.ensureAssignment(assignment);
      return assignment;
    } else {
      throw new Error(`No assignment for id ${assignmentId}`);
    }
  }
};

new Command()
  .description('Add assignment weights for an assignment')
  .argument('<id>', 'Assignment id')
  .option('-n, --dry-run', "Don't write to database.")
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(async (assignmentId, opts) => {
    const rl = readline.createInterface({ input, output });
    const assignment = await ensureAssignment(assignmentId, opts);
    const standards = db.courseStandards({ assignmentId });
    const { courseId, title } = assignment;

    standards.forEach((s, i) => {
      console.log(`[${i + 1}] ${s}`);
    });

    const a = await rl.question('Which standard (or new): ');
    const n = Number(a);

    const standard = Number.isNaN(n) ? a : standards[n - 1];

    const soFar = db.weightedAssignmentsForStandard({ courseId, standard });

    console.log('Assignments so far:');
    soFar.forEach(({ date, title, weight }) => {
      console.log(`  ${date} - ${title}: ${weight.toFixed(1)}`);
    });

    const weight = Number(await rl.question(`Weight for ${title}: `));

    db.insertAssignmentWeight({ assignmentId, standard, weight });
    rl.close();
  })
  .parse();
