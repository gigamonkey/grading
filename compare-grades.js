#!/usr/bin/env node

import { DB } from 'pugsql';
import { env } from 'node:process';
import { Command } from 'commander';
import { API } from './api.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { camelify, dumpJSON, groupBy, mapValues } from './modules/util.js';

const db = new DB('db.db').addQueries('modules/queries.sql');

const dehydrate = (xs) => new Set(xs.map(x => JSON.stringify(x)));

const rehydrate = (xs) => [...xs].map(x => JSON.parse(x)).sort();

const multigroup = (data, keys) => {
  if (keys.length === 0) {
    return data;
  } else {
    return mapValues(groupBy(data, (x) => x[keys[0]]), (data) => multigroup(data, keys.slice(1)));
  }
}

const assignments = (data) => new Set(data.map(x => x.assignmentId));

const compareAssignments = (fromDB, fromServer) => {
  const db = assignments(fromDB);
  const server = assignments(fromServer);
  console.log(`Assignment only in db: ${[...db.difference(server)].sort()}`);
  console.log(`Assignment only on server : ${[...server.difference(db)].sort()}`);
};


new Command()
  .description('Compare grades in DB to those currently on the server.')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(async (opts) => {
    const api = new API(opts.server, opts.apiKey);

    const dbGrades = db.allGrades();
    const serverGrades = (await api.grades()).map(camelify);

    const fromDB =  dehydrate(dbGrades);
    const fromServer = dehydrate(serverGrades);

    console.log(`${fromDB.size} grades in DB`);
    console.log([...fromDB].slice(0, 3));
    console.log(`${fromServer.size} grades on server`);
    console.log([...fromServer].slice(0, 3));

    const onlyInDB = fromDB.difference(fromServer);
    const onlyOnServer = fromServer.difference(fromDB);

    console.log(`${onlyInDB.size} only in DB`);
    console.log(`${onlyOnServer.size} only on server`);

    compareAssignments(dbGrades, serverGrades);

    const a = multigroup(rehydrate(onlyInDB), ['standard', 'assignmentId', 'userId']);
    writeFileSync('grades-only-db.json', JSON.stringify(a, null, 2), 'utf-8');

    const b = multigroup(rehydrate(onlyOnServer), ['standard', 'assignmentId', 'userId']);
    writeFileSync('grades-only-server.json', JSON.stringify(b, null, 2), 'utf-8');


  })
  .parse();
