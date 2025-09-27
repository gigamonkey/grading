#!/usr/bin/env node

/*
 * Grade a single expressions assignment.
 *
 *  - Total questions attempted.
 *  - Average number of tries per question.
 *  - % of questions correct on the first try.
 *  -
 */

import { DB } from 'pugsql';
import child_process from 'node:child_process';
import fs from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { Command } from 'commander';
import glob from 'fast-glob';
import { getSha, getTimestamp } from './modules/grading.js';
import { average, count, loadJSON, mapValues, values } from './modules/util.js';
import process from 'node:process';

const { entries, groupBy } = Object;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const exec = promisify(child_process.exec);

const _numberOr = (n, value) => (Number.isNaN(n) ? value : n);

const _roster = loadJSON('../roster.json');

/*
 * Get expressions.json file from local git repo
 */
const _getAnswers = async (problemSet, handle) => {
  try {
    const out = await exec(`git show main:c/itp/expressions/${problemSet}/expressions.json`, {
      cwd: `../github/${handle}.git/`,
    });
    return JSON.parse(out.stdout);
  } catch {
    return [];
  }
};

const summarizeAttempts = (answers) => {
  const summary = { correct: 0, incorrect: 0, attempts: 0 };
  answers.forEach((a) => {
    summary.attempts++;
    if (a.correct) {
      summary.correct++;
    } else {
      summary.incorrect++;
    }
  });
  return { ...summary, accuracy: summary.correct / summary.attempts };
};

const summary = (qs, numQuestions) => {
  const answered = entries(qs).length;
  return {
    answered,
    averageAccuracy: answered === 0 ? 0 : average(values(qs).map((s) => s.accuracy)),
    percentFirstTry: answered === 0 ? 0 : count(values(qs), (s) => s.accuracy === 1.0) / answered,
    percentDone: answered / numQuestions,
  };
};

new Command()
  .name('grade-expressions')
  .description('Grade an expressions assignment')
  .argument('<dir>', 'Directory holding the answer files extracted from git')
  .option('-n, --dry-run', "Don't write to database database.")
  .action((dir, opts) => {
    const { assignment_id: assignmentId, questions } = loadJSON(join(dir, 'assignment.json'));

    if (!questions) {
      console.log("Must supply number of questions in assigments.json");
      process.exit(1);
    }

    const results = glob.sync(`${dir}/**/expressions.json`);

    db.transaction(() => {

      if (!opts.dryRun) db.clearExpression({assignmentId});

      results.forEach((file) => {
        const d = dirname(file);
        const github = basename(d);
        const timestamp = getTimestamp(d);
        const sha = getSha(d);
        try {
          const answers = fs.statSync(file).size > 0 ? loadJSON(file) : [];
          const grouped = groupBy(answers, (a) => a.name);
          const summarized = mapValues(grouped, summarizeAttempts);
          const row = {assignmentId, github, ...summary(summarized, questions), timestamp, sha };
          if (opts.dryRun) {
            console.log(row);
          } else {
            db.insertExpression(row);
          }
        } catch (e) {
          console.log(`Processing ${file}`);
          console.log(e);
        }
      });
    });
  })
  .parse();
