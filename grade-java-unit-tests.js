#!/usr/bin/env node

import { DB } from 'pugsql';
import { statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { Command } from 'commander';
import glob from 'fast-glob';
import { getSha, getTimestamp, numCorrect, scoreTest } from './modules/grading.js';
import { loadJSON, loadSnakeCaseJSON } from './modules/util.js';

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

new Command()
  .description('Score results.json files from TestRunner')
  .argument('<dir>', 'Directory holding student code and results.json files')
  .option('-n, --dry-run', "Don't write to database.")
  .action((dir, opts) => {

    const { assignmentId, openDate, questions, title, courseId } = loadSnakeCaseJSON(join(dir, 'assignment.json'));

    const results = glob.sync(`${dir}/**/results.json`);

    db.transaction(() => {

      if (!opts.dryRun) {
        db.ensureAssignment({ assignmentId, openDate, courseId, title });
        // FIXME: Not sure what's right here. If we want to just update one
        // student's grade, e.g. someone who did the test late, we want to leave
        // all the old scores there. But maybe more normally we've got all the
        // results for all students in the directory where we've exported the
        // code and tested it. In that case we clear everything out and reload
        // everything. Maybe the right thing is to use an ensure rather than
        // insert method in the loop below.
        db.clearJavaUnitTest({assignmentId});
        db.clearScoredQuestionAssignment({assignmentId});
        db.insertScoredQuestionAssignment({ assignmentId, questions });
      }

      results.forEach((file) => {
        const d = dirname(file);
        const github = basename(d);
        const timestamp = getTimestamp(d);
        const sha = getSha(d);
        try {
          const results = statSync(file).size > 0 ? loadJSON(file) : [];
          const correct = numCorrect(results);
          const score = scoreTest(results, questions);
          if (!opts.dryRun) {
            db.insertJavaUnitTest({assignmentId, github, correct, score, timestamp, sha});
          } else {
            console.log({assignmentId, github, correct, score, timestamp, sha});
          }
        } catch (e) {
          console.log(`Processing ${file}`);
          console.log(e);
        }
      });
    });
  })
  .parse();
