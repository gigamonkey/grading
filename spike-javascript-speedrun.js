#!/usr/bin/env node

import { Temporal } from '@js-temporal/polyfill';
import { DB } from 'pugsql';
import { env } from 'node:process';
import { Command } from 'commander';
import { API } from './api.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { camelify, exec } from './modules/util.js';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Repo } from './modules/repo.js';
import { loadTestcases, runTests } from './modules/test-javascript.js';
import { showCommits } from './modules/speedruns.js';

const { keys, values } = Object;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const main = async (github, assignmentId, start, opts) => {
  const api = new API(opts.server, opts.apiKey);
  const { url } = await api.assignmentJSON(assignmentId);
  const config = await api.codingConfig(url);
  const testcases = loadTestcases(await api.jsTestcases(url));

  const file = config.files[0];
  const repoDir = `../github/${github}.git/`;
  const path = url.slice(1);
  const fullfile = `${path}/${file}`;
  const branch = path;

  const repo = new Repo(repoDir);
  const end = repo.sha(path, fullfile);

  showCommits(repoDir, path, file, testcases, start, end, branch);
};

new Command()
  .description('Grade speedruns by dumping trace of progress.')
  .argument('github', 'Github handle')
  .argument('assignment', 'Assignment id')
  .argument('start', 'Starting sha')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
