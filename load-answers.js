#!/usr/bin/env node

/*
 * Load answers to a form-based assessment into database.
 */

import { DB } from 'pugsql';
import child_process from 'node:child_process';
import fs from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { Command } from 'commander';
import glob from 'fast-glob';
import { getSha, getTimestamp } from './modules/grading.js';
import { average, count, loadJSON, loadSnakeCaseJSON, mapValues, values } from './modules/util.js';
import process from 'node:process';

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
  .argument('<dir>', 'Directory holding the answer files extracted from git')
  .option('-u, --user <user>', 'Github handle to load.')
  .option('-n, --dry-run', "Don't write to database.")
  .action((dir, opts) => {
    const { assignmentId, openDate, questions, title, courseId } = loadSnakeCaseJSON(join(dir, 'assignment.json'));

    const results = glob.sync(`${dir}/**/answers.json`);

    const sink = opts.dryRun ? new ConsoleSink() : new DbSink();

    db.transaction(() => {

      if (!opts.dryRun) {
        db.ensureAssignment({assignmentId, openDate, courseId, title});

        // Maybe we just want to ensure the assignment exists. Clearing
        // everything deletes all the scored answers, etc.
        db.ensureFormAssessment({assignmentId});

        // db.clearStudentAnswers({assignmentId});

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
