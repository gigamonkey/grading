#!/usr/bin/env node

import path from 'node:path';
import { API } from './api.js';
import { Command } from 'commander';
import { env } from 'node:process';
import { homedir } from 'node:os';
import { open } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';

const countQuestions = async (url) => {
  const filename = `${homedir()}/hacks/bhs-cs/views/pages/${url}/index.njk`;
  const file = await open(filename);

  let questions = 0;
  for await (const line of file.readLines()) {
    if (line.match(/^\s*<div data-name/)) {
      console.log(line);
      questions++;
    }
  }
  return questions;
}

const main = async (assignment, dir, opts) => {
  const api = new API(opts.server, opts.apiKey);
  const data = await api.assignment(assignment);
  if (data.kind === 'coding') {
    data.questions = await countQuestions(data.url);
  }
  writeFileSync(path.join(dir, "assignment.json"), JSON.stringify(data, null, 2), 'utf-8');
};

new Command()
  .description('Get assignment.json file via the server API')
  .argument('<assignment>', 'Assignment id')
  .argument('<dir>', 'Directory to save it in')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
