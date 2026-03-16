import fs from 'node:fs';
import path from 'node:path';
import { count, sum, values, entries } from './util.js';

// Utility functions for grading scripts.

/*
 * Number of questions completely correct.
 */
const numCorrect = (results) => count(values(results), fullyCorrect);

/*
 * Results for one question fully correct. (Every test case passed.)
 */
const fullyCorrect = (r) => r?.every((x) => x.passed) ?? 0;

/*
 * Score a whole test based on the number of questions completely correct.
 */
const simpleScoreTest = (results, numQuestions) => numCorrect(results) / numQuestions;

/*
 * Score a whole test based on the average per-question score.
 */
const scoreTest = (results, numQuestions) => sum(values(results).map(scoreQuestion)) / numQuestions;

/*
 * Score one question based on the fraction of test cases that passed.
 */
const scoreQuestion = (cases) => sum(cases.map((c) => (c.passed ? 1 : 0))) / cases.length;


/*
 * Score the results using a set of weights per question.
 */
const scoreWeighted = (results, scoring) => {
  // const numerator = sum(entries(results).map(([name, r]) => fullyCorrect(r) ? scoring[name] : 0));
  // const denom = sum(values(scoring));
  // console.log(`${numerator} / ${denom} = ${numerator / denom}`);
  // entries(results).map(([name, r]) => {
  //   if (!fullyCorrect(r)) { console.log(name); }
  // });

  return sum(entries(results).map(([name, r]) => fullyCorrect(r) ? scoring[name] : 0)) / sum(values(scoring));
};

/*
 * Get the timestamp of the code dumped from github.
 */
const getTimestamp = (dir) => {
  try {
    const file = path.join(dir, 'timestamp.txt');
    return Number(fs.readFileSync(file, 'utf-8').trim());
  } catch {
    return null;
  }
};

/*
 * Get the SHA of the code dumped from github.
 */
const getSha = (dir) => {
  try {
    const file = path.join(dir, 'sha.txt');
    return fs.readFileSync(file, 'utf-8').trim();
  } catch {
    return null;
  }
};

export { getTimestamp, getSha, numCorrect, simpleScoreTest, scoreTest, scoreQuestion, scoreWeighted };
