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

const { keys } = Object;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const ids = (speedruns) => new Set(speedruns.map(s => s.speedrun_id));

const main = async (opts) => {
  const api = new API(opts.server, opts.apiKey);
  const rl = readline.createInterface({ input, output });
  const ungraded = db.ungradedSpeedruns();

  for (const s of ungraded) {
    const { url } = await api.assignmentJSON(s.assignment_id);
    const config = await api.codingConfig(url);

    const file = config.files[0];
    const repo = `../github/${s.github}.git/`;
    const path = url.slice(1);

    if (s.kind === 'java') {
      const testClass = config.jobe.parameters.runargs[0];
      showJavaSpeedrun(repo, path, file, testClass, s.first_sha, s.last_sha, s.questions);
    } else {
      console.log(`*** Don't know how to grade kind: ${s.kind}`);
    }

    const a = await rl.question('Looks good? [y/n/s]: ');
    if (a === 'y') {
      db.insertGradedSpeedrun({speedrunId: s.speedrun_id, ok: 1});
    } else if (a === 'n') {
      db.insertGradedSpeedrun({speedrunId: s.speedrun_id, ok: 0});
    } else {
      console.log('Skipping.');
    }
  }
  rl.close();
};

const showJavaSpeedrun = (repo, path, file, testClass, firstSha, lastSha, questions) => {
  const cmd = `java -cp classes:bhs-cs.jar Speedrun check ${repo} ${path} ${file} ${testClass} ${firstSha} ${lastSha} ${questions}`;
  console.log(exec(cmd, "."))
};


new Command()
  .description('Grade speedruns by dumping trace of progress.')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
