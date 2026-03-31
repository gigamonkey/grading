#!/usr/bin/env node

import { Command } from 'commander';
import { DB } from 'pugsql';
import { loadTSV } from './modules/util.js';

const db = new DB('db.db').addQueries('modules/queries.sql');

new Command()
  .description('Load grades exported from IC')
  .argument('<files...>', 'TSV files')
  .option('-n, --dry-run', "Don't write to database.")
  .action((files, opts) => {
    files.forEach((file) => {
      const data = loadTSV(file);

      const names = data[0].slice(1);
      const rows = data.slice(3);

      const _numberOrNull = (s) => (s ? Number(s) : null);

      const records = rows.flatMap((row) => {
        const [name, ...points] = row;
        const studentNumber = name.match(/#(\d+)/)[1];
        return names.flatMap((icName, i) => {
          if (points[i]) {
            return [{ studentNumber, icName, points: Number(points[i]) }];
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
    });
  })
  .parse();
