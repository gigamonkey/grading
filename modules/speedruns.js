import { Temporal } from '@js-temporal/polyfill';
import { env } from 'node:process';
import { Command } from 'commander';
import path from 'node:path';
import { camelify, exec } from './util.js';
import { Repo } from './repo.js';
import { runTestsWithError } from './test-javascript.js';

const UNITS = ['second', 'minute', 'hour'];

const { Instant, Duration, Now } = Temporal;

const { keys, values } = Object;

const numAttempted = (results) => values(results).filter(cases => cases !== null).length;

const numPassed = (results) => values(results).filter(allPassed).length;

const allPassed = (cases) => cases?.every(c => c.passed);

const showCommit = (sha, timestamp, totalElapsed, elapsed, passed, attempted) => {
  const shortSha = sha.slice(0, 8);
  try {
    const date = dateFormat(Instant.fromEpochMilliseconds(timestamp * 1e3));
    const totalTime = durationString(Duration.from({ seconds: totalElapsed }))
    const commitTime = durationString(Duration.from({ seconds: elapsed }));
    console.log(`${shortSha}: ${date} (${totalTime} +${commitTime}) - Passed: ${passed} of ${attempted}`);
  } catch (e) {
    console.log(`${shortSha}: Problem: ${e}`);
  }
}

const showCommitError = (sha, timestamp, totalElapsed, elapsed, error) => {
  const shortSha = sha.slice(0, 8);
  try {
    const date = dateFormat(Instant.fromEpochMilliseconds(timestamp * 1e3));
    const totalTime = durationString(Duration.from({ seconds: totalElapsed }))
    const commitTime = durationString(Duration.from({ seconds: elapsed }));
    console.log(`${shortSha}: ${date} (${totalTime} +${commitTime}) - Error: ${error}`);
  } catch (e) {
    console.log(`${shortSha}: Problem: ${e}`);
  }
}


const dateFormat = (instant) => {
  const zdt = instant.toZonedDateTimeISO(Now.timeZoneId());
  const hh = zdt.hour.toString().padStart(2, '0');
  const mm = zdt.minute.toString().padStart(2, '0');
  const ss = zdt.second.toString().padStart(2, '0');
  return `${hh}:${mm}:${ss} ${zdt.month}/${zdt.day}/${zdt.year}`;
}

const durationString = (duration, minUnit = 'second') => {
  const d = duration.round({largestUnit: 'hour', smallestUnit: 'second', roundingMode: 'floor'});
  const minUnitIndex = UNITS.indexOf(minUnit);
  const maxUnitIndex = UNITS.indexOf(maxUnit(d));

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

//const maxUnit = (d) => d.hours > 0 ? 'hour' : d.minutes > 0 ? 'minute' : 'second';
const maxUnit = (d) => d.hours > 0 ? 'hour' : 'minute';

const showCommits = (repoDir, path, file, testcases, start, end, branch, questions) => {
  const repo = new Repo(repoDir);
  let maxPassed = 0;
  let finishedAt = null;
  //console.log('start', start, 'end', end);
  const commits = repo.changes(start, end, branch);
  //console.log('commits', commits);
  // kludge to deal with my timing error on speedrun creation
  const nextCommit = repo.nextChange(end, branch);
  (nextCommit ? [nextCommit, ...commits] : commits).forEach((c, i, arr) => {
    //console.log('c', c);
    const { sha, timestamp } = c;
    const totalElapsed = timestamp - arr[arr.length - 1]?.timestamp ?? 0;
    const elapsed = i < arr.length - 1 ? timestamp - arr[i+1]?.timestamp : 0;
    const code = repo.contents(sha, `${path}/${file}`)
    const { results, error } = runTestsWithError(testcases, code)
    if (error) {
      showCommitError(sha, timestamp, totalElapsed, elapsed, error);
    } else {
      const attempted = numAttempted(results);
      const passed = numPassed(results);
      if (passed == questions) {
        finishedAt = { ...c, totalElapsed, commitsPerQuestion: (arr.length - i) / questions };
      }
      maxPassed = Math.max(maxPassed, passed);
      showCommit(sha, timestamp, totalElapsed, elapsed, passed, attempted);
    }
  });

  const totalTime = durationString(
    Duration.from({ seconds: commits[0].timestamp - commits[commits.length - 1].timestamp}));
  console.log(`Total time: ${totalTime}; max passed: ${maxPassed} of ${questions}`);
  return finishedAt;
};

const showBranch = (repoDir, path, file, testcases, branch, questions) => {
  const repo = new Repo(repoDir);
  let maxPassed = 0;
  const commits = repo.branchChanges(branch).reverse();
  commits.forEach((c, i, arr) => {
    const { sha, timestamp } = c;
    const totalElapsed = timestamp - arr[0]?.timestamp ?? 0;
    const elapsed = i > 0 ? timestamp - arr[i - 1]?.timestamp : 0;
    const code = repo.contents(sha, `${path}/${file}`)
    const { results, error } = runTestsWithError(testcases, code)
    if (error) {
      showCommitError(sha, timestamp, totalElapsed, elapsed, error);
    } else {
      const attempted = numAttempted(results);
      const passed = numPassed(results);
      maxPassed = Math.max(maxPassed, passed);
      showCommit(sha, timestamp, totalElapsed, elapsed, passed, attempted);
    }
  });

  const totalTime = durationString(
    Duration.from({ seconds: commits[commits.length - 1].timestamp - commits[0].timestamp}));
  console.log(`Total time: ${totalTime}; max passed: ${maxPassed} of ${questions}`);
};

const summarizeBranch = (repoDir, path, file, testcases, branch, questions) => {
  const repo = new Repo(repoDir);
  const commits = repo.branchChanges(branch).reverse();

  let maxPassed = 0;
  let previousPassed = 0;
  let errors = 0;
  let sparkline = '';

  commits.forEach((c, i, arr) => {
    const { sha, timestamp } = c;
    const totalElapsed = timestamp - arr[0]?.timestamp ?? 0;
    const elapsed = i > 0 ? timestamp - arr[i - 1]?.timestamp : 0;
    const code = repo.contents(sha, `${path}/${file}`)
    //console.log('Running tests');
    const { results, error } = runTestsWithError(testcases, code)
    //console.log('Got results or error');
    if (error) {
      sparkline += 'X';
      errors++;
    } else {
      const attempted = numAttempted(results);
      const passed = numPassed(results);
      if (passed > maxPassed) {
        sparkline += '*';
      } else if (passed > previousPassed) {
        sparkline += '+';
      } else if (passed < previousPassed) {
        sparkline += '-';
      } else {
        sparkline += '.';
      }
      maxPassed = Math.max(maxPassed, passed);
      previousPassed = passed;
    }
  });

  const totalTime = durationString(
    Duration.from({ seconds: commits[commits.length - 1].timestamp - commits[0].timestamp}));
  console.log(`Total time: ${totalTime}; max passed: ${maxPassed} of ${questions}. ${commits.length} commits. ${errors} errors`);
  console.log(sparkline);
};


const analyzeSpeedrun = (repoDir, path, file, testcases, start, end, branch, questions) => {
  const repo = new Repo(repoDir);
  let maxPassed = 0;
  let finished = null;
  let commits = [];
  repo.changes(start, end, branch).forEach((c, i, arr) => {
    const { sha, timestamp } = c;
    const totalElapsed = timestamp - arr[arr.length - 1].timestamp;
    const elapsed = i < arr.length - 1 ? timestamp - arr[i+1].timestamp : 0;
    const code = repo.contents(sha, `${path}/${file}`)
    const results = runTests(testcases, code)
    const passed = numPassed(results);

    // Because we are going from most recent backwards, setting this each time
    // will leave it pointing to the first commit that passed all the tests
    if (passed == questions) {
      finished = {
        sha,
        timestamp,
        totalElapsed,
        perQuestion: {
          commits: (arr.length - i) / questions,
          seconds: totalElapsed / questions,
        }
      };
      // Clear commits that we've seen earlier since they happened after this commit.
      commits = [];
    }
    maxPassed = Math.max(maxPassed, passed);
    commits.push({ sha, timestamp, totalElapsed, elapsed, passed });
  });
  return { finished, commits, maxPassed };
};

export { showCommits, showBranch, summarizeBranch, analyzeSpeedrun };
