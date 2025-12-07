#!/usr/bin/env node

import { DB } from 'pugsql';
import { env } from 'node:process';
import { Command } from 'commander';
import { API } from './api.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { camelify, dumpJSON } from './modules/util.js';

const db = new DB('db.db')
      .addQueries('modules/pugly.sql')
      .addQueries('modules/queries.sql');

new Command()
  .description('Post graded speedrun data to server.')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .option('-n, --dry-run', "Don't actually post.")
  .action((opts) => {
    const api = new API(opts.server, opts.apiKey);
    const data = db.gradedSpeedruns().map(camelify);
    if (!data) {
      console.warn("No data!!!");
    } else {
      if (opts.dryRun) {
        dumpJSON(data);
      } else {
        api.postGradedSpeedruns(data);
      }
    }
  })
  .parse();
