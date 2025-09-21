import fs from 'fs';
import path from 'path';
import { count, sum, values } from './util.js';

// Utility functions for grading scripts.

/*
 * Number of questions completely correct.
 */
const numCorrect = (results) => count(values(results), (r) => r?.every((x) => x.passed) ?? 0);

/*
 * Score a whole test based on the average per-question score.
 */
const score = (results, numQuestions) => sum(values(results).map(scoreQuestion)) / numQuestions;

/*
 * Score one question based on the fraction of test cases that passed.
 */
const scoreQuestion = (cases) => sum(cases.map((c) => (c.passed ? 1 : 0))) / cases.length;

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
    return fs.readFileSync(filename, 'utf-8').trim();
  } catch {
    return null;
  }
};

export { getTimestamp, getSha, numCorrect, score, scoreQuestion };
