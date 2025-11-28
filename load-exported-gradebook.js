#!/usr/bin/env node

import { DB } from 'pugsql';
import { loadTSV, dumpTSV } from './modules/util.js';
import { argv } from 'node:process';
import { Command } from 'commander';

const db = new DB('db.db').addQueries('modules/queries.sql');

new Command()
  .description('Load grades exported from IC')
  .argument('<files...>', 'TSV files')
  .option('-n, --dry-run', "Don't write to database.")
  .action((files, opts) => {

    files.forEach(file => {

      const data = loadTSV(file);

      const standards = data[0].slice(1);
      const rows = data.slice(3);

      const numberOrNull = (s) => s ? Number(s) : null;

      const records = rows.flatMap(row => {
        const [ name, ...grades ] = row;
        const studentNumber = name.match(/#(\d+)/)[1];
        return standards.flatMap((standard, i) => {
          if (grades[i]) {
            return [ { studentNumber, standard, grade: Number(grades[i]) } ];
          } else {
            return [];
          }
        });
      });

      records.forEach((record) => {
        if (opts.dryRun) {
          console.log(record);
        } else {
          db.ensureIcGrade(record);
        }
      });
    })
  })
  .parse();
