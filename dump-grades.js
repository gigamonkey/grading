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
  .name('dump-grades')
  .description('Dump grades in JSON for a given assignment id.')
  .argument('[assignment]', 'Assignment', '*')
  .option('-u, --user <user>', 'User id')
  .action((assignment, opts) => {

    const assignmentId = intOrStar(assignment);
    const { user: userId } = opts;

    let data;

    if (assignmentId && userId) {
      data = db.gradesForUserAndAssignment({assignmentId, userId});
    } else if (assignmentId) {
      data = db.gradesForAssignment({assignmentId});
    } else if (userId) {
      data = db.gradesForUser({userId});
    } else {
      data = db.allGrades();
    }

    if (!data) {
      console.warn("No data!!!");
    } else {
      dumpJSON(data);
    }

  })
  .parse();
