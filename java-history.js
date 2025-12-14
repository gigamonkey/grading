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

const main = async (assignmentId, repoDir, opts) => {
  const api = new API(opts.server, opts.apiKey);
  const { openDate, title, courseId, url } = camelify(await api.assignment(assignmentId));
  const config = await api.codingConfig(url);

  const branch = url.slice(1);
  const file = config.files[0];
  const testClass = config.jobe.parameters.runargs[0];
  const questions = db.questionsForAssignment({assignmentId});

  const cmd = `java -cp classes:bhs-cs.jar Speedrun history ${repoDir} ${branch} ${file} ${testClass} ${questions}`;
  console.log(exec(cmd, "."));
};

new Command()
  .description('Show history of commits to a Java coding assignment.')
  .argument('<assignment>', 'Assignment id')
  .argument('<repo>', 'Student repo directory')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
