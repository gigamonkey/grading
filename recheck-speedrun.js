#!/usr/bin/env node

import { DB } from 'pugsql';
import { env } from 'node:process';
import { Command } from 'commander';
import { API } from './api.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { camelify, exec } from './modules/util.js';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { showCommits } from './modules/speedruns.js';
import { loadTestcases } from './modules/test-javascript.js';

const { keys } = Object;

const db = new DB('db.db')
      .addQueries('modules/pugly.sql')
      .addQueries('modules/queries.sql');

const ids = (speedruns) => new Set(speedruns.map(s => s.speedrun_id));

const main = async (speedrunId, opts) => {
  const s = db.specificSpeedrun({speedrunId});

  if (s) {
    const api = new API(opts.server, opts.apiKey);
    const { url } = await api.assignmentJSON(s.assignment_id);
    const config = await api.codingConfig(url);

    const file = config.files[0];
    const repo = `../github/${s.github}.git/`;
    const path = url.slice(1);

    console.log({...s, url});

    if (s.kind === 'java') {
      const testClass = config.jobe.parameters.runargs[0];
      showJavaSpeedrun(repo, path, file, testClass, s.first_sha, s.last_sha, s.questions);
    } else if (s.kind === 'javascript') {
      const testcasesCode = await api.jsTestcases(url);
      const testcases = loadTestcases(testcasesCode);
      showJavascriptSpeedrun(repo, path, file, testcases, s.first_sha, s.last_sha, path, s.questions);
    } else {
      console.log(`Unknown speedrun kind: ${s.kind}`);
    }

    const rl = readline.createInterface({ input, output });
    const a = await rl.question(`Looks good? [y/n]: `);
    if (a === 'y') {
      ensureGrade({speedrunId: s.speedrun_id, ok: 1}, opts.dryRun);
    } else {
      console.log('Leaving as is.')
    }
    rl.close();
  } else {
    console.log(`No speedrun with id ${speedrunId}`);
  }
};


const ensureGrade = (obj, dryRun) => {
  if (dryRun) {
    console.log(obj);
  } else {
    db.ensureGradedSpeedrun(obj);
  }
};

const showJavaSpeedrun = (repo, path, file, testClass, firstSha, lastSha, questions) => {
  const cmd = `java -cp classes:bhs-cs.jar Speedrun check ${repo} ${path} ${file} ${testClass} ${firstSha} ${lastSha} ${questions}`;
  console.log(`Running ${cmd}`);
  console.log(exec(cmd, "."))
};

const showJavascriptSpeedrun = (repo, path, file, testcases, firstSha, lastSha, branch, questions) => {
  showCommits(repo, path, file, testcases, firstSha, lastSha, branch, questions);
};


new Command()
  .description('Check already graded speedrun by dumping trace of progress.')
  .argument('[run]', 'Speedrun id')
  .option('-n, --dry-run', 'Dry run')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
