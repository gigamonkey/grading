#!/usr/bin/env node

import { env } from 'node:process';
import { DB } from 'pugsql';
import { API } from './api.js';
import { Repo } from './modules/repo.js'
import { statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { Command } from 'commander';
import glob from 'fast-glob';
import { getSha, getTimestamp, numCorrect, scoreTest } from './modules/grading.js';
import { camelify, dumpJSON, exec, loadJSON } from './modules/util.js';

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const main = async (assignmentId, repoDir, commit, opts) => {

  const api = new API(opts.server, opts.apiKey);
  const repo = new Repo(repoDir);

  const { openDate, title, courseId, url } = camelify(await api.assignment(assignmentId));
  const config = await api.codingConfig(url);

  db.transaction(() => {

    if (!opts.dryRun) {
      db.ensureAssignment({ assignmentId, openDate, courseId, title });
    } else {
      console.log('Ensure assignment', { assignmentId, openDate, courseId, title });
    }

    const questions = db.questionsForAssignment({assignmentId});
    const github = basename(repoDir, '.git');
    const path = url.slice(1);
    const sha = repo.fullsha(commit);
    const timestamp = repo.timestamp(sha);
    const file = config.files[0];
    const testClass = config.jobe.parameters.runargs[0];

    const results = testSha(repoDir, path, file, testClass, sha);
    const correct = numCorrect(results);
    const score = scoreTest(results, questions);

    if (!opts.dryRun) {
      db.ensureJavaUnitTest({assignmentId, github, correct, score, timestamp, sha});
    } else {
      console.log({assignmentId, github, correct, score, timestamp, sha});
    }
  });
};

const testSha = (repoDir, path, file, testClass, sha) => {
  const cmd = `java -cp classes:bhs-cs.jar TestSha ${repoDir} ${path} ${file} ${testClass} ${sha}`;
  return JSON.parse(exec(cmd, "."));
};


new Command()
  .description('Score results directly from TestRunner')
  .argument('<assignment>', 'Assignment id')
  .argument('<repo>', 'Student repo directory')
  .argument('<sha>', 'SHA of commit to grade.')
  .option('-n, --dry-run', "Don't write to database.")
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
