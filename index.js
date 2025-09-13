#!/usr/bin/env node

import fs from 'node:fs';
import glob from 'fast-glob';
import { loadJSON } from './modules/util.js';
import dotenv from 'dotenv'
import express from 'express';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { exec } from 'node:child_process';
import nunjucks from 'nunjucks';
import mdfilter from './modules/mdfilter.js';
import { DB } from 'pugsql';

const port = process.env.HTTP_PORT ?? 0;
const app = express();

dotenv.config({ path: 'local.env' })

const [ dir ] = process.argv.slice(2)

const db = new DB(path.join(dir, "db.db"))
      .addQueries('modules/pugly.sql')
      .addQueries('modules/queries.sql');


const openUrl = (url) => {
  const platform = os.platform();

  const command = (
    platform === 'win32' ? `start ${url}` :
    platform === 'darwin' ? `open ${url}` :
    `xdg-open ${url}`
  );

  exec(command, (error) => {
    if (error) {
      console.error(`Failed to open URL: ${error}`);
      return;
    }
  });
};

app.set('json spaces', 2);
app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, 'public')));

const env = nunjucks.configure('views', {
  autoescape: true,
  express: app,
});

mdfilter.install(env);

const jsonIfOk = r => {
  if (r.ok) {
    return r.json();
  }
  throw r;
};

app.get('/prompt-responses/:assignmentId', async (req, res) => {
  const { assignmentId } = req.params;
  const { BHS_CS_SERVER, BHS_CS_API_KEY } = process.env;
  const fullpath = `${BHS_CS_SERVER}/api/assignment/${assignmentId}/prompt-responses`
  const posts = await fetch(fullpath, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BHS_CS_API_KEY}`,
    },
  }).then(jsonIfOk);

  const grades = Object.fromEntries(
    db.orderedPromptResponseGrades().map(g => [ g.user_id, g.grade ])
  );

  posts.forEach(p => p.grade = grades[p.user_id] ?? 0)
  posts.sort((a, b) => a.grade - b.grade);

  res.render("index.njk", { posts });
});

app.put('/prompt-responses/:assignmentId/grade', (req, res) => {
  console.log(req.body);
  db.postPromptResponseGrade(req.body);
});


app.get('/coding', async (req, res) => {
  const a = loadJSON(path.join(dir, 'assignment.json'));
  const students = Object.fromEntries(db.studentsForPeriod({period: 5}).map(s => {
    return [s.github, s.user_id];
  }));
  const files = Object.fromEntries(
    glob.sync(path.join(dir, `*/${a.file}`))
      .map(p => {
        const d = path.dirname(path.relative(dir, p));
        return [ students[d], fs.readFileSync(p, 'utf-8') ];
      })
  );
  res.render("coding.njk", { ...a, files });
});


app.listen(port, function () {
  //const url = `http://localhost:${this.address().port}/prompt-responses/${assignmentId}`;
  const url = `http://localhost:${this.address().port}/coding`;
  console.log(`Opening ${url}`);
  openUrl(url);
})
