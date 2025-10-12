#!/usr/bin/env node

import { DB } from 'pugsql';
import { Command } from 'commander';
import { dumpJSON, mapValues } from './modules/util.js';

const { groupBy, keys } = Object;

const db = new DB('db.db').addQueries('modules/queries.sql');


new Command()
  .name('make-key')
  .description('Make a key from scored answers')
  .argument('<assignment>', 'Assignment id')
  .action((assignmentId, opts) => {

    const explanation = "";

    const answers = mapValues(
      groupBy(db.correctAnswers({assignmentId}), ({question_number}) => question_number),
      xs => xs.map(({answer}) => answer));

    const numbers = keys(answers).sort((a, b) => Number(a) - Number(b));

    dumpJSON(numbers.map(n => {
      const all = answers[n];
      const answer = all.length == 1 ? all[0] : all
      return { answer, explanation: "" };
    }));

  })
  .parse();
