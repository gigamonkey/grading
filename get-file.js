#!/usr/bin/env node

import { homedir } from 'node:os';
import { open } from 'node:fs/promises';
import { Repo } from './modules/repo.js';
import { DB } from 'pugsql';
import { env } from 'node:process';
import { Command, Option } from 'commander';
import { API } from './api.js';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { camelify, camelToKebab, exec } from './modules/util.js';

const { keys } = Object;

const db = new DB('db.db')
      .addQueries('modules/pugly.sql')
      .addQueries('modules/queries.sql');

const slug = (s) => camelToKebab(s).replace(' ', '-');

const countQuestions = async (url) => {
  const filename = `${homedir()}/hacks/bhs-cs/views/pages/${url}/index.njk`;
  const file = await open(filename);

  let questions = 0;
  for await (const line of file.readLines()) {
    if (line.match(/^\s*<div data-name/)) {
      questions++;
    }
  }
  return questions;
}

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

const getBranchAndFile = async (api, url, kind) => {
  if (kind === 'coding') {
    const config = await api.codingConfig(url);
    return {
      branch: url.slice(1),
      dir: url.slice(1),
      file: config.files[0],
    };
  } else if (kind == 'questions') {
    return {
      branch: 'main',
      dir: url.slice(1),
      file: 'answers.json',
    };
  }
};

const main = async (assignmentId, directory, opts) => {
  const handles = getHandles(opts);
  const api = new API(opts.server, opts.apiKey);
  const data = await api.assignment(assignmentId);
  const assignment = camelify(data);

  const { url, kind, courseId, title } = assignment;

  if (!directory) {
    directory = `${courseId}/${assignmentId}-${slug(title)}`;
  }

  const assignmentFile = path.join(directory, "assignment.json")

  if (kind === 'coding' && !existsSync(assignmentFile)) {
    data.questions = await countQuestions(url);
    mkdirSync(directory, { recursive: true });
    writeFileSync(assignmentFile, JSON.stringify(data, null, 2));
  }

  try {
    const { branch, dir, file } = await getBranchAndFile(api, url, kind);
    const filename = path.join(dir, file);

    for (const github of handles) {
      const dir = path.join(directory, github);
      mkdirSync(dir, { recursive: true });

      const repo = new Repo(`../github/${github}.git/`);
      const sha = opts.sha || repo.sha(branch, filename, opts.before);
      if (sha) {
        const timestamp = repo.timestamp(sha);
        const contents = repo.contents(sha, filename);
        writeFileSync(path.join(dir, "timestamp.txt"), `${timestamp}\n`);
        writeFileSync(path.join(dir, "sha.txt"), `${sha}\n`);
        writeFileSync(path.join(dir, file), contents);
        if (existsSync(path.join(dir, "missing.txt"))) {
          unlinkSync(path.join(dir, "missing.txt"));
        }
      } else {
        writeFileSync(path.join(dir, "missing.txt"), '');
      }
    }
  } catch (e) {
    console.log(e);
 }
};

new Command()
  .description('Get file for assignment from git repo.')
  .argument('assignmentId', 'Assignment id')
  .argument('[dir]', 'Directory to save files')
  .addOption(new Option('-u, --user <user>', 'Github handle').conflicts(['period', 'course']))
  .addOption(new Option('-p, --period <period>', 'Period').conflicts(['user', 'course']))
  .addOption(new Option('-c, --course <course>', 'Course').conflicts(['user', 'period']))
  .option('-b, --before <before>', 'Fetch latest version before this timestamp')
  .option('--sha <sha>', 'Specific SHA')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
