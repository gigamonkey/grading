#!/usr/bin/env node

/*
 * Grade all reflections assignments based on data from API.
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
import { average, camelify, count, loadJSON, mapValues, values } from './modules/util.js';
import process from 'node:process';
import { API } from './api.js';

const { entries, groupBy } = Object;

const { trunc, min, max, sign } = Math;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const computeScore = (row) => {
  const { minimumWords, userId, assignmentId, words, postedAt, due, ok, lateExcuse } = camelify(row);

  if (ok) {
    const minGrade= sign(words);
    const lengthGrade = trunc(min(minimumWords, row.words) / minimumWords * 4);
    const latePenalty = (postedAt > due && !lateExcuse) ? 1 : 0;
    const grade = max(lengthGrade - latePenalty, minGrade);
    const score = [0.0, 0.44, 0.69, 0.7, 1.0][grade];
    return { userId, assignmentId, score };
  } else {
    return { userId, assignmentId, score: 0 }
  }
};

new Command()
  .description('Grade reflection assignment')
  .option('-n, --dry-run', "Don't write to database.")
  .option('-v, --verbose', "Verbose output with dry-run.")
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(async (opts) => {

    const api = new API(opts.server, opts.apiKey);
    const data = await api.allReflectionGradeData();

    const assignments = [...new Set(data.map(d => d.assignment_id))];
    const toEnsure = await Promise.all(assignments.map(async assignmentId => {
      const { openDate, courseId, title } = camelify(await api.assignment(assignmentId));
      return { assignmentId, openDate, courseId, title };
    }));

    db.transaction(() => {

      // Ensure all assignments in data
      toEnsure.forEach((assignment) => {
        if (!opts.dryRun) {
          const { assignmentId } = assignment;
          db.ensureAssignment(assignment);
          db.clearDirectScores({ assignmentId });
          db.ensureAssignmentWeight({assignmentId, standard: 'Reflections', weight: 1.0});
        } else {
          console.log(assignment);
        }
      });

      data.forEach((row) => {
        const score = computeScore(row);
        if (opts.dryRun) {
          if (opts.verbose) {
            console.log(JSON.stringify({ ...score, ...row }));
          } else {
            console.log(JSON.stringify(score));
          }
        } else {
          db.insertDirectScore(score)
      }
      });
    });
  })
  .parse();
