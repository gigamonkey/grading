#!/usr/bin/env node

import { argv, exec, entries, fromEntries, loadJSON, mapValues, count, dumpTSV, numbers, sum, values } from './modules/util.js';
import { Command } from 'commander';
import glob from 'fast-glob';
import { basename, dirname, join } from 'node:path';
import { readFileSync, statSync } from 'fs';
import { getTimestamp, getSha, numCorrect, score } from './modules/grading.js';

new Command()
  .name('grade-java-unit-tests')
  .description('Score results.json files from TestRunner')
  .argument('<dir>', 'Directory holding student code and results.json files')
  .action((dir, opts) => {

    const { assignment_id, questions } = loadJSON(join(dir, 'assignment.json'));
    const label = basename(dir);
    const results = glob.sync(`${dir}/**/results.json`);

    console.log(['assignment_id', 'label', 'github', 'correct', 'score', 'timestamp', 'sha'].join('\t'));

    results.forEach(file => {
      const d = dirname(file);
      const github = basename(d);
      const timestamp = getTimestamp(d);
      const sha = getSha(d);
      try {
        const results = statSync(file).size > 0 ? loadJSON(file) : [];
        const correct = numCorrect(results)
        const s = score(results, questions);
        console.log([assignment_id, label, github, correct, s, timestamp, sha].join('\t'))
      } catch (e) {
        console.log(e);
      }
    });
  })
  .parse();
