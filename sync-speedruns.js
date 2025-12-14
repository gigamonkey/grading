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

const addSpeedrunnable = async (assignment, dryRun) => {
  const { assignmentId, url } = assignment;
  const kind =  url.match(/itp/) ? 'javascript' : 'java';
  const questions = await countQuestions(url);
  const record = {assignmentId, kind, questions};
  if (dryRun) {
    console.log(record);
  } else {
    db.insertSpeedrunnable(record);
  }
};

const addAssignment = async (assignment, dryRun) => {
  const { assignmentId, openDate: date, courseId, title } = assignment;
  const record = { assignmentId, date, courseId, title };
  if (dryRun) {
    console.log(record);
  } else {
    db.insertAssignment(record);
  }
};

const countQuestions = async (url) => {
  const filename = `${homedir()}/hacks/bhs-cs/views/pages/${url}/index.njk`;
  const file = await open(filename);

  let questions = 0;
  for await (const line of file.readLines()) {
    if (line.match(/^\s*<div data-name/)) {
      questions++;
    }
  }
  return questions;
}

const existing = async (api, opts) => {
  if (opts.started) {
    return {
      onServer: await api.startedSpeedruns(),
      inGradebook: ids(db.startedSpeedruns(), 'speedrun_id'),
    };
  } else {
    return {
      onServer: await api.completedSpeedruns(),
      inGradebook: ids(db.completedSpeedruns(), 'speedrun_id'),
    };
  }
};

const main = async (opts) => {
  const api = new API(opts.server, opts.apiKey);
  const { onServer, inGradebook } = await existing(api, opts);
  const speedrunnables = ids(db.speedrunnables(), 'assignment_id');
  const assignments = ids(db.assignments(), 'assignment_id');

  const label = opts.started ? 'started' : 'completed';

  for (const s of onServer) {
    if (!inGradebook.has(s.speedrun_id)) {
      const github = db.github({userId: s.user_id});
      console.log(`Inserting ${label} speedrun ${s.speedrun_id} for ${github}`);
      if (opts.dryRun) {
        console.log(camelify(s));
      } else {
        if (opts.started) {
          db.insertStartedSpeedrun(camelify(s));
        } else {
          db.insertCompletedSpeedrun(camelify(s));
        }
      }
    }
  }
  for (const id of ids(onServer, 'assignment_id')) {
    if (!speedrunnables.has(id)) {
      console.log(`Inserting speedrunnable for ${id}`);
      addSpeedrunnable(camelify(await api.assignment(id)), opts.dryRun);
    }
    if (!assignments.has(id)) {
      console.log(`Inserting assignment for ${id}`);
      addAssignment(camelify(await api.assignment(id)), opts.dryRun);
    }
  }
};

new Command()
  .description('Sync speedruns recorded on server')
  .option('-n, --dry-run', 'Dry run.')
  .option('--started', 'Sync all started speedruns not just completed.')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
