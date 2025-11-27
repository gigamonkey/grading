#!/usr/bin/env node

import { Command } from 'commander';
import { DB } from 'pugsql';
import { exec } from './modules/util.js';

const { entries, keys, values } = Object;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const types = {
  user_id: 'text',
  assignment_id: 'integer',
  started_at: 'integer',
  first_sha: 'text',
  finished_at: 'integer',
  last_sha: 'text',
  abandoned: 'integer',
};

const emitInsert = (r) => {
  console.log(`INSERT INTO speedruns (${keys(r).join(', ')}) VALUES (${entries(r).map(([k, v]) => toValue(k, v)).join(', ')});`);
}

const toValue = (k, v) => types[k] === 'text' ? `'${v}'` : `${v}`;

new Command()
  .name('retro-speedruns')
  .description('Turn grading speedrun records into records for the site db.')
  .action((opts) => {
    db.speedrunsWithGit().forEach(s => {
      const { assignment_id, user_id, first_sha, last_sha, github } = s;
      const started_at = Number(exec(`git log -1 --pretty=%at ${first_sha}`, `../github/${github}.git/`));
      const finished_at = Number(exec(`git log -1 --pretty=%at ${last_sha}`, `../github/${github}.git/`));
      // console.log({
      //   user_id, assignment_id, started_at, first_sha, finished_at, last_sha, abandoned: 0 });
      emitInsert({user_id, assignment_id, started_at, first_sha, finished_at, last_sha, abandoned: 0 });
    });
  })
  .parse();
