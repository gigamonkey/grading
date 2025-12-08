#!/usr/bin/env node

import { DB } from 'pugsql';
import { env } from 'node:process';
import { Command } from 'commander';
import { API } from './api.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { camelify, dumpJSON, groupBy, mapValues } from './modules/util.js';

const db = new DB('db.db')
      .addQueries('modules/pugly.sql')
      .addQueries('modules/queries.sql');

new Command()
  .description('Sync grades currently on server into table in db for comparison.')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(async (opts) => {
    const api = new API(opts.server, opts.apiKey);
    const serverGrades = (await api.grades()).map(camelify);
    db.transaction(() => {
      db.clearServerGrades();
      db.insertServerGrade(serverGrades);
    });
  })
  .parse();
