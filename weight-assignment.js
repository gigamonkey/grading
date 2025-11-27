#!/usr/bin/env node


import { DB } from 'pugsql';
import { statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { Command } from 'commander';
import glob from 'fast-glob';
import { getSha, getTimestamp, numCorrect, scoreTest } from './modules/grading.js';
import { dumpJSON, loadJSON } from './modules/util.js';

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';



const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

new Command()
  .name('weight-assignment')
  .description('Add assignment weights for an assignment')
  .argument('<id>', 'Assignment id')
  .option('-n, --dry-run', "Don't write to database.")
  .action(async (assignmentId, opts) => {

    const rl = readline.createInterface({ input, output });

    const standards = db.courseStandards({assignmentId});
    const { course_id: courseId, title } = db.assignment({assignmentId});

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


      // if (!opts.dryRun) {
      //   db.ensureAssignment({ assignmentId, courseId, title });
      //   db.clearJavaUnitTest({assignmentId});
      //   db.clearScoredQuestionAssignment({assignmentId});
      //   db.insertScoredQuestionAssignment({ assignmentId, questions });
      // }

      // results.forEach((file) => {
      //   const d = dirname(file);
      //   const github = basename(d);
      //   const timestamp = getTimestamp(d);
      //   const sha = getSha(d);
      //   try {
      //     const results = statSync(file).size > 0 ? loadJSON(file) : [];
      //     const correct = numCorrect(results);
      //     const score = scoreTest(results, questions);
      //     if (!opts.dryRun) {
      //       db.insertJavaUnitTest({assignmentId, github, correct, score, timestamp, sha});
      //     } else {
      //       console.log({assignmentId, github, correct, score, timestamp, sha});
      //     }
      //   } catch (e) {
      //     console.log(e);
      //   }
      // });
    //});
    rl.close();

  })
  .parse();
