#!/usr/bin/env node

/*
 * Load answers to a form-based assessment into database.
 */

import child_process from 'node:child_process';
import fs from 'node:fs';
import glob from 'fast-glob';
import process from 'node:process';
import { API } from './api.js';
import { Command } from 'commander';
import { DB } from 'pugsql';
import { average, camelify, count, loadJSON, loadSnakeCaseJSON, mapValues, values } from './modules/util.js';
import { basename, dirname, join } from 'node:path';
import { env } from 'node:process';
import { getSha, getTimestamp } from './modules/grading.js';
import { promisify } from 'node:util';


const { entries, groupBy } = Object;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

// Maybe better things to do here?
const normalize = (answer) => answer.trim();

class DbSink {
  saveAnswer(github, assignmentId, questionNumber, answerNumber, rawAnswer) {
    db.ensureStudentAnswer({github, assignmentId, questionNumber, answerNumber, rawAnswer});
    if (rawAnswer) {
      db.ensureNormalizedAnswer({
        assignmentId, questionNumber, rawAnswer, answer: rawAnswer.trim(),
      });
    }
  }
}

class ConsoleSink {
  saveAnswer(github, assignmentId, questionNumber, answerNumber, rawAnswer) {
    console.log({
      github, assignmentId, questionNumber, answerNumber, rawAnswer
    });
  }
}

const saveAnswers = (sink, github, assignmentId, answers) => {
  answers.forEach((answer, num) => {
    if (Array.isArray(answer)) {
      answer.forEach((a, i) => sink.saveAnswer(github, assignmentId, num, i, a));
    } else {
      sink.saveAnswer(github, assignmentId, num, 0, answer);
    }
  });
};

new Command()
  .description('Load answers to form-based assessment into database.')
  .argument('<assignmentId>', 'Assignment id')
  .argument('<dir>', 'Directory holding the answer files extracted from git')
  .option('-u, --user <user>', 'Github handle to load.')
  .option('-n, --dry-run', "Don't write to database.")
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(async (assignmentId, dir, opts) => {

    const api = new API(opts.server, opts.apiKey);
    const { openDate, title, courseId } = camelify(await api.assignment(assignmentId));

    const results = glob.sync(`${dir}/**/answers.json`);

    const sink = opts.dryRun ? new ConsoleSink() : new DbSink();

    db.transaction(() => {

      if (!opts.dryRun) {
        db.ensureAssignment({assignmentId, openDate, courseId, title});

        // Maybe we just want to ensure the assignment exists. Clearing
        // everything deletes all the scored answers, etc.
        db.ensureFormAssessment({assignmentId});

        db.clearStudentAnswers({assignmentId});

        // Clear first to delete everything via cascade.
        //db.clearFormAssessment({assignmentId});
        //db.insertFormAssessment({assignmentId});
      }

      results.forEach((file) => {
        const d = dirname(file);
        const github = basename(d);

        if (!opts.user || opts.user === github) {

          const timestamp = getTimestamp(d);
          const sha = getSha(d);

          try {
            const answers = fs.statSync(file).size > 0 ? loadJSON(file) : [];
            saveAnswers(sink, github, assignmentId, answers);
          } catch (e) {
            console.log(`Processing ${file}`);
            console.log(e);
          }
        }
      });
    });
  })
  .parse();
