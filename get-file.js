#!/usr/bin/env node

import { Repo } from './modules/repo.js';
import { DB } from 'pugsql';
import { env } from 'node:process';
import { Command, Option } from 'commander';
import { API } from './api.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { camelify, exec } from './modules/util.js';

const { keys } = Object;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const getHandles = ({user, period, course}) => {
  if (user) {
    return db.githubForUser({user});
  } else if (period) {
    return db.githubForPeriod({period});
  } else if (course) {
    return db.githubForCourse({course});
  }
};

const saveFile = (filename, contents) => {
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, contents);
}


const main = async (assignmentId, directory, opts) => {
  const handles = getHandles(opts);

  const api = new API(opts.server, opts.apiKey);
  const { url, courseId } = camelify(await api.assignmentJSON(assignmentId));
  const config = await api.codingConfig(url);
  const branch = url.slice(1);
  const file = config.files[0];
  const filename = path.join(branch, file);

  for (const github of handles) {
    const dir = path.join(directory, github);
    mkdirSync(dir, { recursive: true });

    const repo = new Repo(`../github/${github}.git/`);
    const sha = repo.sha(branch, filename, opts.before);
    if (sha) {
      const timestamp = repo.timestamp(sha);
      const contents = repo.contents(sha, filename);
      writeFileSync(path.join(dir, "timestamp.txt"), `${timestamp}\n`);
      writeFileSync(path.join(dir, "sha.txt"), `${sha}\n`);
      writeFileSync(path.join(dir, file), contents);
    } else {
      writeFileSync(path.join(dir, "missing.txt"), '');
    }
  }
};

new Command()
  .description('Git file from git repo.')
  .argument('assignmentId', 'Assignment id')
  .argument('dir', 'Directory to save files')
  .addOption(new Option('-u, --user <user>', 'Github handle').conflicts(['period', 'course']))
  .addOption(new Option('-p, --period <period>', 'Period').conflicts(['user', 'course']))
  .addOption(new Option('-c, --course <course>', 'Course').conflicts(['user', 'period']))
  .option('-b, --before <before>', 'Fetch latest version before this timestamp')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
