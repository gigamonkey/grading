#!/usr/bin/env node

import { env } from 'node:process';
import { API } from './api.js';
import { DB } from 'pugsql';
import { statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { Command } from 'commander';
import glob from 'fast-glob';
import { getSha, getTimestamp, numCorrect, scoreTest } from './modules/grading.js';
import { camelify, dumpJSON, loadJSON } from './modules/util.js';

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');


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
      throw new Error("No assignment for id " + assignmentId);
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
    const standards = db.courseStandards({assignmentId});
    const { courseId, title } = assignment;

    standards.forEach((s, i) => {
      console.log(`[${i + 1}] ${s}`);
    });

    const a = await rl.question('Which standard (or new): ');
    const n = Number(a);

    const standard = isNaN(n) ? a : standards[n - 1];

    const soFar = db.weightedAssignmentsForStandard({courseId, standard});

    console.log('Assignments so far:');
    soFar.forEach(({date, title, weight}) => {
      console.log(`  ${date} - ${title}: ${weight.toFixed(1)}`);
    });

    const weight = Number(await rl.question(`Weight for ${title}: `));

    db.insertAssignmentWeight({assignmentId, standard, weight});
    rl.close();

  })
  .parse();
