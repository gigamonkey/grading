import { Temporal } from '@js-temporal/polyfill';
import { env } from 'node:process';
import { Command } from 'commander';
//import { API } from './api.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { camelify, exec } from './util.js';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Repo } from './repo.js';
import { loadTestcases, runTests } from './test-javascript.js';

const UNITS = ['second', 'minute', 'hour'];

const { keys, values } = Object;

const numPassed = (results) => values(results).filter(allPassed).length;

const allPassed = (cases) => cases?.every(c => c.passed);

const showCommit = (sha, timestamp, elapsed, results) => {
  const shortSha = sha.slice(0, 8);
  const date = dateFormat(Temporal.Instant.fromEpochMilliseconds(timestamp * 1e3));
  const duration = durationString(Temporal.Duration.from({ seconds: elapsed }));
  console.log(`${shortSha}: ${date} (${duration}) - Passed: ${numPassed(results)}`);
}

const dateFormat = (instant) => {
  const zdt = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
  const hh = zdt.hour.toString().padStart(2, '0');
  const mm = zdt.minute.toString().padStart(2, '0');
  const ss = zdt.second.toString().padStart(2, '0');
  return `${hh}:${mm}:${ss} ${zdt.month}/${zdt.day}/${zdt.year}`;
}

const durationString = (duration, minUnit = 'second') => {
  const d = duration.round({largestUnit: 'hour', smallestUnit: 'second', roundingMode: 'floor'});
  const minUnitIndex = UNITS.indexOf(minUnit);
  const maxUnitIndex = UNITS.indexOf(maxUnit(duration));

  let result = '';

  for (let i = maxUnitIndex; i >= minUnitIndex; i--) {
    const unit = UNITS[i];
    const v = d[unit + 's'];

    if (i === maxUnitIndex) {
      if (i === minUnitIndex) {
        result = `:${v.toString().padStart(2, '0')}`;
      } else {
        result = `${v}`;
      }
    } else {
      result += `:${v.toString().padStart(2, '0')}`;
    }
  }

  return result;
}

const maxUnit = (d) => d.hours > 0 ? 'hour' : d.minutes > 0 ? 'minute' : 'second';

//const show = (repo, path, file, testCases, firstSha, lastSha, questions) => {

const showCommits = (repoDir, path, file, testcases, start, end, branch) => {
  const repo = new Repo(repoDir);
  repo.changes(start, end, branch).forEach((c, i, arr) => {
    const { sha, timestamp } = c;
    const elapsed = i < arr.length - 1 ? timestamp - arr[i+1].timestamp : 0;
    const code = repo.contents(sha, `${path}/${file}`)
    const results = runTests(testcases, code)
    showCommit(sha, timestamp, elapsed, results);
  });
};

// const main = async (github, assignmentId, start, opts) => {
//   const api = new API(opts.server, opts.apiKey);
//   const { url } = await api.assignmentJSON(assignmentId);
//   const config = await api.codingConfig(url);
//   const testcases = loadTestcases(await api.jsTestcases(url));

//   const file = config.files[0];
//   const repoDir = `../github/${github}.git/`;
//   const path = url.slice(1);
//   const fullfile = `${path}/${file}`;
//   const branch = path;

//   const repo = new Repo(repoDir);
//   const end = repo.sha(path, fullfile);


//   console.log({repo: repoDir, file, path, end});



// };

export { showCommits };
