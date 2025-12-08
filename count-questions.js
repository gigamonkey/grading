#!/usr/bin/env node

import { open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { env } from 'node:process';
import { Command } from 'commander';
import { API } from './api.js';
import { camelify } from './modules/util.js';

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

const main = async (assignmentId, opts) => {
  const api = new API(opts.server, opts.apiKey);
  const assignment = camelify(await api.assignmentJSON(assignmentId));
  const questions = await countQuestions(assignment.url);
  console.log({ assignmentId, questions });
};

new Command()
  .description('Count the nummer of questions in a coding assignment.')
  .argument('<assignment>', 'Assignment id')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
