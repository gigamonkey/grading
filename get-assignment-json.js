#!/usr/bin/env node

import { env } from 'node:process';
import { Command } from 'commander';
import { API } from './api.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const main = async (assignment, dir, opts) => {
  const api = new API(opts.server, opts.apiKey);
  const json = JSON.stringify(await api.assignment(assignment), null, 2);
  writeFileSync(path.join(dir, "assignment.json"), json, 'utf-8');
};

new Command()
  .description('Get assignment.json file via the server API')
  .argument('<assignment>', 'Assignment id')
  .argument('<dir>', 'Directory to save it in')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
