#!/usr/bin/env node

/*
 * Grade a reflections assignment based on data from API.
 */

import { env } from 'node:process';
import { DB } from 'pugsql';
import child_process from 'node:child_process';
import fs from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { Command } from 'commander';
import glob from 'fast-glob';
import { getSha, getTimestamp } from './modules/grading.js';
import { average, count, loadJSON, mapValues, values } from './modules/util.js';
import process from 'node:process';
import { API } from './api.js';

const { entries, groupBy } = Object;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const latePenalty = (row, penalty) => (row.on_time || row.late_excuse) ? 0 : penalty;

const computeScore = (row, minimumWords, late) => {
  const { user_id: userId, assignment_id: assignmentId } = row;

  const min = row.words > 0 ? 0.25 : 0;
  const length = Math.min(row.words / minimumWords, 1.0);
  const penalties = latePenalty(row, late) + (row.ok ? 0 : 0.15);
  const score = Math.max(length - penalties, min);

  return { userId, assignmentId, score };
};

new Command()
  .name('grade-reflection')
  .description('Grade reflection assignment')
  .argument('<assignmentId>', 'Assignment id of reflection')
  .option('-l, --late <late>', 'Points off late responses.', Number, 0.5)
  .option('-n, --dry-run', "Don't write to database.")
  .option('-v, --verbose', "Verbose output with dry-run.")
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(async (assignmentId, opts) => {

    const api = new API(opts.server, opts.apiKey);
    const { minimumWords, data } = await api.reflectionGradeData(assignmentId);

    db.transaction(() => {


      if (!opts.dryRun) {
        // FIXME: need to ensure assignment here, probably by pulling assignment
        // data from server.
        db.clearDirectScores({assignmentId});
      }

      data.forEach((row) => {
        const score = computeScore(row, minimumWords, opts.late);
        if (opts.dryRun) {
          if (opts.verbose) {
            console.log({ ...score, ...row });
          } else {
            console.log(score);
          }
        } else {
          db.insertDirectScore(score)
        }
      });
    });
  })
  .parse();
