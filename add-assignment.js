#!/usr/bin/env node

import { env, stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import { Command } from 'commander';
import { DB } from 'pugsql';
import { API } from './api.js';
import { camelify } from './modules/util.js';

const db = new DB('db.db').addQueries('modules/pugly.sql').addQueries('modules/queries.sql');

const main = async (assignmentId, opts) => {
  const api = new API(opts.server, opts.apiKey);
  const rl = readline.createInterface({ input, output });
  const assignment = camelify(await api.assignment(assignmentId));

  const standard = await rl.question('Standard: ');
  const icName = await rl.question('IC name: ');
  const points = await rl.question('Points: ');

  db.ensureAssignment(assignment);
  db.ensureAssignmentPointValue({ assignmentId, standard, icName, points });

  rl.close();
};

new Command()
  .description('Add an assignment to the database')
  .argument('<assignmentId>', 'Assignment id to add.')
  .option('-n, --dry-run', 'Dry run.')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
