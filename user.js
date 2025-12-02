#!/usr/bin/env node

import { DB } from 'pugsql';
import { Command, Option } from 'commander';
import { camelify } from './modules/util.js';

const { keys, fromEntries } = Object;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const dumpAll = (u) => console.log(u);

const dumpOne = (field) => {
  return (u) => console.log(u[field]);
}

const dumpFields = (keys) => {
  return (u) => {
    console.log(fromEntries(keys.map(k => [k, u[k]])));
  };
};

const main = async (q, opts) => {
  const fields = keys(opts);
  const dump = fields.length === 0
        ? dumpAll
        : fields.length === 1
        ? dumpOne(fields[0])
        : dumpFields(fields);
  //db.findUser({q: `%${q.toUpperCase()}%`}).map(camelify).forEach(dump);
  db.findUser({q}).map(camelify).forEach(dump);
};

new Command()
  .description('Find user based on name or Github handle.')
  .argument('q', 'Query')
  .option('-e, --email', 'Get email address')
  .option('-f, --first-name', 'Get first name')
  .option('-g, --github', 'Get Github handle')
  .option('-l, --last-name', 'Get last name')
  .option('-n, --name', 'Get name')
  .option('-s, --sortable-name', 'Get sortable name')
  .option('-u, --user-id', 'Get user ID')
  .action(main)
  .parse();
