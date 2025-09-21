#!/usr/bin/env node

/*
 * Grade a single expressions assignment.
 *
 *  - Total questions attempted.
 *  - Average number of tries per question.
 *  - % of questions correct on the first try.
 *  -
 */

import fs from 'fs';
import glob from 'fast-glob';
import path from 'path';
import child_process from 'child_process';
import { promisify } from 'util';
import { argv } from 'process';
import { loadJSON, mapValues, dumpTSV, sum, count, average } from './modules/util.js'
import { Command } from 'commander';

const { fromEntries, entries, keys, values, groupBy } = Object;

const exec = promisify(child_process.exec);

const numberOr = (n, value) => Number.isNaN(n) ? value : n;

const roster = loadJSON('../roster.json');

/*
 * Get expressions.json file from local git repo
 */
const getAnswers = async (problemSet, handle) => {
  try {
    const out = await exec(
      `git show main:c/itp/expressions/${problemSet}/expressions.json`,
      { cwd: `../github/${handle}.git/` }
    );
    return JSON.parse(out.stdout);
  } catch (e) {
    return [];
  }
};

const summarizeAttempts = (answers) => {
  const summary = { correct: 0, incorrect: 0, attempts: 0 };
  answers.forEach(a => {
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
    answered === 0 ? 0 : average(values(qs).map(s => s.accuracy)),
    answered === 0 ? 0 : count(values(qs), (s) => s.accuracy === 1.0) / answered,
    answered / numQuestions,
  ];
};

const getTimestamp = (filename) => {
  try {
    return Number(fs.readFileSync(filename, 'utf-8').trim());
  } catch (e) {
    return 0;
  }
};

const getSha = (filename) => {
  try {
    return fs.readFileSync(filename, 'utf-8').trim();
  } catch (e) {
    return '';
  }
};


new Command()
  .name('grade-expressions')
  .description('Grade an expressions assignment')
  .argument('<dir>', 'Directory holding the answer files extracted from git')
  .action((dir, opts) => {

    const { assignment_id, questions } = loadJSON(path.join(dir, 'assignment.json'));

    const results = glob.sync(`${dir}/**/expressions.json`);

    console.log(['assignment_id', 'github', 'answered', 'average_accuracy', 'percent_first_try', 'percent_done', 'timestamp', 'sha' ].join('\t'));

    results.forEach(file => {
      const github = path.basename(path.dirname(file));
      const label = path.basename(path.dirname(path.dirname(file)));
      const timestamp = getTimestamp(path.join(path.dirname(file), 'timestamp.txt'));
      const sha = getSha(path.join(path.dirname(file), 'sha.txt'));
      try {
        const answers = fs.statSync(file).size > 0 ? loadJSON(file) : [];
        const grouped = groupBy(answers, (a) => a.name);
        const summarized = mapValues(grouped, summarizeAttempts);
        console.log([assignment_id, github, ...summary(summarized, questions), timestamp, sha ].join('\t'));
      } catch (e) {
        console.log(`Processing ${file}`);
        console.log(e);
      }
    });
  })
  .parse();
