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

const main = async (opts) => {
  const api = new API(opts.server, opts.apiKey);
  const rl = readline.createInterface({ input, output });
  const ungraded = db.ungradedSpeedruns();

  let num = ungraded.length;
  let i = 0;
  for (const s of ungraded) {
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
      const testcases = loadTestcases(await api.jsTestcases(url));
      showJavascriptSpeedrun(repo, path, file, testcases, s.first_sha, s.last_sha, path, s.questions);
    } else {
      console.log(`Unknown speedrun kind: ${s.kind}`);
    }

    const { course_id, title, github } = s;
    console.log(`${course_id.toUpperCase()}: ${title} - ${github}`);
    const a = await rl.question(`[${i} done; ${num - i} to go] Looks good? [y/n/s]: `);
    i++;
    if (a === 'y') {
      insertGrade({speedrunId: s.speedrun_id, ok: 1}, opts.dryRun);
    } else if (a === 'n') {
      insertGrade({speedrunId: s.speedrun_id, ok: 0}, opts.dryRun);
    } else {
      console.log('Skipping.');
    }
  }
  rl.close();
};

const insertGrade = (obj, dryRun) => {
  if (dryRun) {
    console.log(obj);
  } else {
    db.insertGradedSpeedrun(obj);
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
  .description('Grade speedruns by dumping trace of progress.')
  .option('-n, --dry-run', 'Dry run')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
