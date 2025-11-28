#!/usr/bin/env node

import { DB } from 'pugsql';
import { env } from 'node:process';
import { Command } from 'commander';
import { API } from './api.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { dumpJSON } from './modules/util.js';

const db = new DB('db.db').addQueries('modules/queries.sql');

const intOrStar = (v) => v === '*' ? undefined : parseInt(v);

new Command()
  .description('Dump grades in JSON for a given assignment id.')
  .argument('[assignment]', 'Assignment', '*')
  .option('-u, --user <user>', 'User id')
  .option('-n, --dry-run', "Don't write to file.")
  .action((assignment, opts) => {

    const assignmentId = intOrStar(assignment);
    const { user: userId } = opts;

    let data;
    let filename;

    if (assignmentId && userId) {
      data = db.gradesForUserAndAssignment({assignmentId, userId});
      filename = `${userId}-${assignmentId}`;
    } else if (assignmentId) {
      data = db.gradesForAssignment({assignmentId});
      filename = assignmentId;
    } else if (userId) {
      data = db.gradesForUser({userId});
      filename = userId;
    } else {
      data = db.allGrades();
      filename = 'all';
    }

    if (!data) {
      console.warn("No data!!!");
    } else {
      if (opts.dryRun) {
        dumpJSON(data);
      } else {
        writeFileSync(path.join('grades', `${filename}.json`), JSON.stringify(data, null, 2), 'utf-8');
      }
    }

  })
  .parse();
