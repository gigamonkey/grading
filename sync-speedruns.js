#!/usr/bin/env node

import { DB } from 'pugsql';
import { env } from 'node:process';
import { Command } from 'commander';
import { API } from './api.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { camelify } from './modules/util.js';

const { keys } = Object;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const ids = (speedruns) => new Set(speedruns.map(s => s.speedrun_id));

const main = async (opts) => {
  const api = new API(opts.server, opts.apiKey);
  const onServer = await api.completedSpeedruns();
  const inGradebook = db.completedSpeedruns();
  const missingIds = ids(onServer).difference(ids(inGradebook))

  onServer.forEach(s => {
    if (missingIds.has(s.speedrun_id)) {
      console.log(`Inserting speedrun ${s.speedrun_id}`);
      db.insertCompletedSpeedrun(camelify(s));
    }
  });
};

new Command()
  .name('sync-speedruns')
  .description('Sync speedruns recorded on server')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
