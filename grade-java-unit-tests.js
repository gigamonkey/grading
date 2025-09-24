#!/usr/bin/env node

import { DB } from 'pugsql';
import { statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { Command } from 'commander';
import glob from 'fast-glob';
import { getSha, getTimestamp, numCorrect, scoreTest } from './modules/grading.js';
import { loadJSON } from './modules/util.js';

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

new Command()
  .name('grade-java-unit-tests')
  .description('Score results.json files from TestRunner')
  .argument('<dir>', 'Directory holding student code and results.json files')
  .action((dir, _opts) => {
    const { assignment_id: assignmentId, questions } = loadJSON(join(dir, 'assignment.json'));
    const results = glob.sync(`${dir}/**/results.json`);

    db.transaction(() => {
      db.clearJavaUnitTest({assignmentId});
      db.clearScoredQuestionAssignment({assignmentId});

      db.insertScoredQuestionAssignment({ assignmentId, questions });

      results.forEach((file) => {
        const d = dirname(file);
        const github = basename(d);
        const timestamp = getTimestamp(d);
        const sha = getSha(d);
        try {
          const results = statSync(file).size > 0 ? loadJSON(file) : [];
          const correct = numCorrect(results);
          const score = scoreTest(results, questions);
          db.insertJavaUnitTest({assignmentId, github, correct, score, timestamp, sha});
        } catch (e) {
          console.log(e);
        }
      });
    });
  })
  .parse();
