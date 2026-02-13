#!/usr/bin/env node

import { API } from './api.js';
import { Assignments } from './modules/assignments.js';
import { Command } from 'commander';
import { DB } from 'pugsql';
import { Repo } from './modules/repo.js'
import { env } from 'node:process';
import { lcs, similarity } from './modules/lcs.js';
import { readFileSync } from 'fs';
import { execFilter } from './modules/util.js';

const DIFF_LINE = /^[-+] /;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const newRecord = () => {
  return { code: '', change: undefined, changes: 0, totalSimChange: 0, moreSimilar: 0, lessSimilar: 0 };
}

const emitTimeline = async (data) => {

  const { author1, author2, changes } = data;

  const latest = {
    [author1]: newRecord(),
    [author2]: newRecord(),
  };

  const other = { [author1]: author2, [author2]: author1 };

  for (const c of changes) {
    const { author, timestamp } = c;
    const code = await normalizedCode(c);
    const myLatest = latest[author];
    const otherLatest = latest[other[author]];

    const sim = similarity(code, otherLatest.code);
    const elapsed = myLatest.change ? timestamp - myLatest.change.timestamp : 0;
    const after = otherLatest.change ? timestamp - otherLatest.change.timestamp : 0;
    const changeInSimilarity = otherLatest.change ? sim.total - otherLatest.change.total : 0;

    if (changeInSimilarity > 0) {
      myLatest.moreSimilar++;
    } else if (changeInSimilarity < 0) {
      myLatest.lessSimilar++;
    }

    const change = { author, timestamp, elapsed, after, changeInSimilarity, ...sim};

    myLatest.code = code;
    myLatest.change = change;
    myLatest.changes++;
    myLatest.totalSimChange += changeInSimilarity;
    const { _, ...rest } = myLatest.change;
    console.log(rest);
    const diff = c.repo.diff(c.sha)
          .replaceAll('\r', '')
          .split(/\n/)
          .filter(line => DIFF_LINE.test(line))
          .join('\n');

    console.log(diff);
    console.log();
  }

  const finalSimilarity = similarity(latest[author1].code, latest[author2].code);

  const summary = {
    [author1]: withAverage(latest[author1]),
    [author2]: withAverage(latest[author2]),
    finalSimilarity: {
      [`${author1} to ${author2}`]: finalSimilarity.aToB,
      [`${author2} to ${author1}`]: finalSimilarity.bToA,
      twoWay: finalSimilarity.total,
    }
  };
  console.log(summary);
};

const withAverage = (record) => {
  const { code, change, totalSimChange, ...rest } = record;
  rest.averageSimilarityChange = totalSimChange / record.changes;
  return rest;
}


const changesInRepo = (repo, branch, dir, file) => {
  const author = repo.name();
  const path = `${dir}/${file}`;
  return repo.branchPathChanges(branch, `${dir}/${file}`).map(commit => ({ author, repo, branch, path, ...commit }));
};

const normalize = async (code) => {
  const command = "java";
  const args = ["-jar", "google-java-format-1.30.0-all-deps.jar", "-"];

  let formatted;
  try {
    formatted = await execFilter(command, args, code);
  } catch (e) {
    formatted = code;
  }
  return formatted.replaceAll('\r', '');
}

const combinedChanges = (repo1, repo2, branch, dir, file) => {
  const r1 = new Repo(repo1);
  const r2 = new Repo(repo2);
  return {
    author1: r1.name(),
    author2: r2.name(),
    changes: [
      ...changesInRepo(new Repo(repo1), branch, dir, file),
      ...changesInRepo(new Repo(repo2), branch, dir, file),
    ].sort((a, b) => a.timestamp - b.timestamp),
  };
};

const normalizedCode = async (change) => {
  return normalize(change.repo.contents(change.sha, change.path));
};

const main = async (assignmentId, repo1, repo2, opts) => {
  const assignments = new Assignments(db, new API(opts.server, opts.apiKey));

  const { branch, dir, file } = await assignments.getBranchAndFile(assignmentId);

  const allChanges = combinedChanges(repo1, repo2, branch, dir, file);

  await emitTimeline(allChanges);

};

new Command()
  .description('Show the similarity of two assignment files over time.')
  .argument('<assignmentId>', 'Assignment id')
  .argument('<repo1>', 'Local repo of first student')
  .argument('<repo2>', 'Local repo of second student')
  .option('-s, --server <url>', 'Server URL', env.BHS_CS_SERVER)
  .option('-k, --api-key <key>', 'API key', env.BHS_CS_API_KEY)
  .action(main)
  .parse();
