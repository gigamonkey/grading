#!/usr/bin/env node

import { open } from 'node:fs/promises';
import { homedir } from 'node:os';
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

const ids = (rows, id) => new Set(rows.map(r => r[id]));

const addSpeedrunnable = async (assignment) => {
  const { assignmentId, url } = assignment;
  const kind =  url.match(/itp/) ? 'javascript' : 'java';
  const questions = await countQuestions(url);
  db.insertSpeedrunnable({assignmentId, kind, questions});
};

const countQuestions = async (url) => {
  const filename = `${homedir()}/hacks/bhs-cs/views/pages/${url}/index.njk`;
  const file = await open(filename);

  let questions = 0;
  for await (const line of file.readLines()) {
    if (line.match(/data-name/)) {
      questions++;
    }
  }
  return questions;
}


const main = async (opts) => {
  const api = new API(opts.server, opts.apiKey);
  const onServer = await api.completedSpeedruns();
  const inGradebook = ids(db.completedSpeedruns(), 'speedrun_id');
  const speedrunnables = ids(db.speedrunnables(), 'assignment_id');

  for (const s of onServer) {
    if (!inGradebook.has(s.speedrun_id)) {
      console.log(`Inserting completed speedrun ${s.speedrun_id}`);
      db.insertCompletedSpeedrun(camelify(s));
    }
  }
  for (const id of ids(onServer, 'assignment_id')) {
    if (!speedrunnables.has(id)) {
      console.log(`Inserting speedrunnable for ${id}`);
      addSpeedrunnable(camelify(await api.assignmentJSON(id)));
    }
  }
};

new Command()
  .description('Sync speedruns recorded on server')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
