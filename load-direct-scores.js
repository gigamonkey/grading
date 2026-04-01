#!/usr/bin/env node

import { env } from 'node:process';
import { Command } from 'commander';
import { DB } from 'pugsql';
import { API } from './api.js';
import { camelify, loadTSV } from './modules/util.js';

const db = new DB('db.db').addQueries('modules/pugly.sql').addQueries('modules/queries.sql');

const main = async (assignmentId, file, opts) => {
  const api = new API(opts.server, opts.apiKey);

  const { openDate, title, courseId } = camelify(await api.assignment(assignmentId));

  db.transaction(() => {
    if (!opts.dryRun) {
      db.ensureAssignment({ assignmentId, openDate, courseId, title });
    } else {
      console.log('Ensure assignment', { assignmentId, openDate, courseId, title });
    }

    const byGithub = Object.fromEntries(db.roster().map((s) => [s.github, s.user_id]));

    loadTSV(file).forEach(([id, score]) => {
      const userId = opts.github ? byGithub[id] : id;
      const record = { assignmentId, userId, score };
      if (!opts.dryRun) {
        db.ensureDirectScore(record);
      } else {
        console.log(record);
      }
    });
  });
};

new Command()
  .description('Load github/score TSV file for assignment')
  .argument('<assignment>', 'Assignment id')
  .argument('<file>', 'TSV file of userId/score pairs')
  .option('-g, --github', 'First column is github id.')
  .option('-n, --dry-run', "Don't write to database.")
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
