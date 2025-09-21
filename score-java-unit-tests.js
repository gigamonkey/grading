#!/usr/bin/env node

import { argv, exec, entries, fromEntries, loadJSON, mapValues, count, fps, dumpTSV, numbers, sum, values } from './modules/util.js';
import { Command } from 'commander';
import glob from 'fast-glob';
import path from 'path';
import { readFileSync } from 'fs';

const numCorrect = (results) => {
  return count(Object.values(results), (r) => r?.every(x => x.passed) ?? 0);
}

const score = (results, numQuestions) => {
  return sum(values(results).map(scoreOne)) / numQuestions;
};

const scoreOne = (cases) => {
  return sum(cases.map(c => c.passed ? 1 : 0)) / cases.length;
};

const getTimestamp = (filename) => {
  try {
    return Number(readFileSync(filename, 'utf-8').trim());
  } catch {
    return 0;
  }
};

new Command()
  .name('score-java-unit-tests')
  .description('Score results.json files from TestRunner')
  .argument('<assignment>', 'Assignment id')
  .argument('<dir>', '')
  .argument('<questions>', 'Number of questions', Number)
  .action((assignmentId, dir, questions, opts) => {
    const results = glob.sync(`${dir}/**/results.json`);

    console.log(['assignment_id', 'label', 'github', 'correct', 'score', 'grade', 'timestamp'].join('\t'));

    results.forEach(file => {
      const github = path.basename(path.dirname(file));
      const label = path.basename(path.dirname(path.dirname(file)));
      const timestamp = getTimestamp(path.join(path.dirname(file), 'timestamp.txt'));
      try {
        const results = loadJSON(file);
        const s = score(results, questions);
        console.log([assignmentId, label, github, numCorrect(results), s, fps(s), timestamp].join('\t'))
        //console.log(JSON.stringify({ assignmentId, label, github, score: score(results) }));
        //console.log(JSON.stringify(data, null, 2));
      } catch (e) {
        //console.log(JSON.stringify({ github, score: 0, error: `${e}` }));
      }
    });
  })
  .parse();
