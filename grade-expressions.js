#!/usr/bin/env node

/*
 * Grade a single expressions assignment.
 *
 *  - Total questions attempted.
 *  - Average number of tries per question.
 *  - % of questions correct on the first try.
 *  -
 */

import child_process from 'node:child_process';
import fs from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { Command } from 'commander';
import glob from 'fast-glob';
import { getSha, getTimestamp } from './modules/grading.js';
import { average, count, loadJSON, mapValues } from './modules/util.js';

const { fromEntries, entries, keys, values, groupBy } = Object;

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
  return [
    answered,
    answered === 0 ? 0 : average(values(qs).map((s) => s.accuracy)),
    answered === 0 ? 0 : count(values(qs), (s) => s.accuracy === 1.0) / answered,
    answered / numQuestions,
  ];
};

new Command()
  .name('grade-expressions')
  .description('Grade an expressions assignment')
  .argument('<dir>', 'Directory holding the answer files extracted from git')
  .action((dir, _opts) => {
    const { assignment_id, questions } = loadJSON(join(dir, 'assignment.json'));

    const results = glob.sync(`${dir}/**/expressions.json`);

    console.log(
      [
        'assignment_id',
        'github',
        'answered',
        'average_accuracy',
        'percent_first_try',
        'percent_done',
        'timestamp',
        'sha',
      ].join('\t'),
    );

    results.forEach((file) => {
      const d = dirname(file);
      const github = basename(d);
      const timestamp = getTimestamp(d);
      const sha = getSha(d);
      try {
        const answers = fs.statSync(file).size > 0 ? loadJSON(file) : [];
        const grouped = groupBy(answers, (a) => a.name);
        const summarized = mapValues(grouped, summarizeAttempts);
        console.log(
          [assignment_id, github, ...summary(summarized, questions), timestamp, sha].join('\t'),
        );
      } catch (e) {
        console.log(`Processing ${file}`);
        console.log(e);
      }
    });
  })
  .parse();
