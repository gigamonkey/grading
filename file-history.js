#!/usr/bin/env node

import { Temporal } from '@js-temporal/polyfill';
import { env } from 'node:process';
import { DB } from 'pugsql';
import { API } from './api.js';
import { Repo } from './modules/repo.js'
import { statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { Command } from 'commander';
import glob from 'fast-glob';
import { getSha, getTimestamp, numCorrect, scoreTest } from './modules/grading.js';
import { camelify, dumpJSON, exec, loadJSON } from './modules/util.js';

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const getBranchAndFile = async (api, url, kind) => {
  if (kind === 'coding') {
    const config = await api.codingConfig(url);
    return {
      branch: url.slice(1),
      dir: url.slice(1),
      file: config.files[0],
    };
  } else if (kind == 'questions') {
    return {
      branch: 'main',
      dir: url.slice(1),
      file: 'answers.json',
    };
  } else {
    throw new Error(`Unknown kind: ${kind}`);
  }
};

const main = async (assignmentId, repoDir, opts) => {
  const api = new API(opts.server, opts.apiKey);
  const { openDate, title, courseId, url, kind } = camelify(await api.assignment(assignmentId));

  const { branch, dir, file } = await getBranchAndFile(api, url, kind);

  const repo = new Repo(repoDir);


  let prev = 0;

  repo.branchChanges(branch).reverse().forEach(c => {
    showCommit(c.sha, c.timestamp, prev);
    prev = c.timestamp;
    if (opts.full) {
      console.log(repo.contents(c.sha, `${branch}/${file}`));
    } else {
      console.log(repo.diff(c.sha));
    }
    console.log()
  });

};

const showCommit = (sha, timestamp, prev) => {
  const shortSha = sha.slice(0, 8);
  const date = dateFormat(Temporal.Instant.fromEpochMilliseconds(timestamp * 1e3));
  console.log(`${date} [${timestamp - prev} seconds] (${shortSha})`);
}

const dateFormat = (instant) => {
  const zdt = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
  const hh = zdt.hour.toString().padStart(2, '0');
  const mm = zdt.minute.toString().padStart(2, '0');
  const ss = zdt.second.toString().padStart(2, '0');
  return `${hh}:${mm}:${ss} ${zdt.month}/${zdt.day}/${zdt.year}`;
}


new Command()
  .description('Show history of commits to a single-file assignment.')
  .argument('<assignment>', 'Assignment id')
  .argument('<repo>', 'Student repo directory')
  .option('-f, --full', 'Show full contents of file at each change rather than diff.')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
