#!/usr/bin/env node

import { env } from 'node:process';
import { Command } from 'commander';
import { DB } from 'pugsql';
import { API } from './api.js';
import { showBranch, summarizeBranch } from './modules/speedruns.js';
import { loadTestcases } from './modules/test-javascript.js';
import { camelify } from './modules/util.js';

const { keys } = Object;

const _db = new DB('db.db').addQueries('modules/pugly.sql').addQueries('modules/queries.sql');

const main = async (assignmentId, repoDir, opts) => {
  const api = new API(opts.server, opts.apiKey);
  const { url } = camelify(await api.assignment(assignmentId));

  const config = await api.codingConfig(url);

  const file = config.files[0];
  const path = url.slice(1);

  const testcases = loadTestcases(await api.jsTestcases(url));
  const questions = keys(testcases.allCases).length;
  if (opts.sparkline) {
    summarizeBranch(repoDir, path, file, testcases, path, questions);
  } else {
    showBranch(repoDir, path, file, testcases, path, questions);
  }
};

new Command()
  .description('Show history of test passing in a Javascript unit test assignment.')
  .argument('<assignment>', 'Assignment id')
  .argument('<repo>', 'Student repo directory')
  .option('--sparkline', 'Show sparkline summary')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
