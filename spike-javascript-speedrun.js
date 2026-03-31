#!/usr/bin/env node

import { env } from 'node:process';
import { Command } from 'commander';
import { DB } from 'pugsql';
import { API } from './api.js';
import { Repo } from './modules/repo.js';
import { showCommits } from './modules/speedruns.js';
import { loadTestcases } from './modules/test-javascript.js';

const _db = new DB('db.db').addQueries('modules/pugly.sql').addQueries('modules/queries.sql');

const main = async (github, assignmentId, start, opts) => {
  const api = new API(opts.server, opts.apiKey);
  const { url } = await api.assignment(assignmentId);
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
