#!/usr/bin/env node

/*
 * Per-author commit stats for a git repo. Reports total commits,
 * lines added, lines deleted, days with commits, and school days
 * with commits, grouped by author email.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { bellSchedule } from './modules/bell-schedule.js';

function gitLog(repoDir, extraArgs = '') {
  return execSync(`git -C ${repoDir} log --all ${extraArgs} --format='C %H %aE %aI' --shortstat`, {
    encoding: 'utf-8',
    maxBuffer: 256 * 1024 * 1024,
  });
}

function parseCommits(out) {
  const commits = [];
  let cur = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('C ')) {
      if (cur) commits.push(cur);
      const m = line.match(/^C (\S+) (\S+) (\S+)$/);
      cur = m ? { sha: m[1], email: m[2], date: m[3], added: 0, deleted: 0 } : null;
    } else if (cur) {
      const a = line.match(/(\d+) insertions?\(\+\)/);
      if (a) cur.added = Number(a[1]);
      const d = line.match(/(\d+) deletions?\(-\)/);
      if (d) cur.deleted = Number(d[1]);
    }
  }
  if (cur) commits.push(cur);
  return commits;
}

function totalSchoolDays(commits) {
  if (commits.length === 0) return 0;
  const days = commits.map((c) => c.date.slice(0, 10)).sort();
  const start = new Date(`${days[0]}T00:00:00Z`);
  const end = new Date(`${days[days.length - 1]}T00:00:00Z`);
  let count = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (isSchoolDay(d.toISOString().slice(0, 10))) count += 1;
  }
  return count;
}

function isSchoolDay(day) {
  try {
    return bellSchedule.isSchoolDay(globalThis.Temporal.PlainDate.from(day));
  } catch {
    return false;
  }
}

function loadOrCreateUsers(repoDir, emails) {
  const normalized = repoDir.replace(/\/$/, '');
  const inRepo = path.join(normalized, '.users');
  const inParent = path.join(normalized, '..', '.users');
  const existing = [inRepo, inParent].find((p) => fs.existsSync(p));
  if (existing) {
    try {
      return JSON.parse(fs.readFileSync(existing, 'utf-8'));
    } catch (e) {
      console.error(`Could not parse ${existing}: ${e.message}`);
      return {};
    }
  }
  const map = {};
  for (const e of emails) map[e] = e;
  const sorted = Object.fromEntries(
    Object.keys(map)
      .sort()
      .map((k) => [k, map[k]]),
  );
  fs.writeFileSync(inRepo, JSON.stringify(sorted, null, 2) + '\n');
  console.error(`Created ${inRepo} with ${Object.keys(sorted).length} entries.`);
  return sorted;
}

function aggregate(nonMerges, merges, users) {
  const nameFor = (email) => users[email] ?? email;
  const byAuthor = new Map();
  const get = (key) => {
    if (!byAuthor.has(key)) {
      byAuthor.set(key, {
        author: key,
        commits: 0,
        merges: 0,
        added: 0,
        deleted: 0,
        schoolDaysSet: new Set(),
        nonSchoolDaysSet: new Set(),
      });
    }
    return byAuthor.get(key);
  };
  const noteDay = (a, day) => {
    if (isSchoolDay(day)) a.schoolDaysSet.add(day);
    else a.nonSchoolDaysSet.add(day);
  };
  for (const c of nonMerges) {
    const day = c.date.slice(0, 10);
    const a = get(nameFor(c.email));
    a.commits += 1;
    a.added += c.added;
    a.deleted += c.deleted;
    noteDay(a, day);
  }
  for (const c of merges) {
    const day = c.date.slice(0, 10);
    const a = get(nameFor(c.email));
    a.merges += 1;
    noteDay(a, day);
  }
  return [...byAuthor.values()].map((a) => ({
    author: a.author,
    commits: a.commits,
    merges: a.merges,
    added: a.added,
    deleted: a.deleted,
    net: a.added - a.deleted,
    schoolDays: a.schoolDaysSet.size,
    nonSchoolDays: a.nonSchoolDaysSet.size,
    days: a.schoolDaysSet.size + a.nonSchoolDaysSet.size,
  }));
}

function columns(multiRepo, rows, tsv = false) {
  const fmtPct = (n, row) => {
    if (!row.totalSchool) return tsv ? '' : '-';
    const ratio = n / row.totalSchool;
    return tsv ? ratio.toFixed(4) : `${Math.round(ratio * 100)}%`;
  };
  const hasNonSchool = rows.some((r) => (r.nonSchoolDays ?? 0) > 0);
  return [
    ...(multiRepo ? [{ key: 'repo', label: 'Repo', align: 'left', fmt: (v) => String(v) }] : []),
    { key: 'author', label: 'Author', align: 'left', fmt: (v) => String(v) },
    { key: 'commits', label: 'Commits', align: 'right', fmt: (v) => String(v) },
    { key: 'added', label: 'Added', align: 'right', fmt: (v) => String(v) },
    { key: 'deleted', label: 'Deleted', align: 'right', fmt: (v) => String(v) },
    { key: 'net', label: 'Net', align: 'right', fmt: (v) => String(v) },
    { key: 'merges', label: 'Merges', align: 'right', fmt: (v) => String(v) },
    { key: 'schoolDays', label: 'School days', align: 'right', fmt: (v) => String(v) },
    ...(hasNonSchool
      ? [{ key: 'nonSchoolDays', label: 'Non-school', align: 'right', fmt: (v) => String(v) }]
      : []),
    { key: 'days', label: '% school days', align: 'right', fmt: fmtPct },
  ];
}

function sortRows(rows, sortKeys, multiRepo) {
  rows.sort((a, b) => {
    for (const key of sortKeys) {
      const d = (b[key] ?? 0) - (a[key] ?? 0);
      if (d) return d;
    }
    return a.author.localeCompare(b.author) || (multiRepo ? a.repo.localeCompare(b.repo) : 0);
  });
}

function printTable(rows, sortKeys, multiRepo) {
  sortRows(rows, sortKeys, multiRepo);
  const cols = columns(multiRepo, rows);
  const cells = rows.map((r) => cols.map((c) => c.fmt(r[c.key], r)));
  const widths = cols.map((c, i) => Math.max(c.label.length, ...cells.map((row) => row[i].length)));
  const pad = (v, i) => (cols[i].align === 'right' ? v.padStart(widths[i]) : v.padEnd(widths[i]));
  console.log(cols.map((c, i) => pad(c.label, i)).join('  '));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of cells) {
    console.log(row.map((v, i) => pad(v, i)).join('  '));
  }
}

function printTsv(rows, sortKeys, multiRepo) {
  sortRows(rows, sortKeys, multiRepo);
  const cols = columns(multiRepo, rows, true);
  console.log(cols.map((c) => c.label).join('\t'));
  for (const r of rows) {
    console.log(cols.map((c) => c.fmt(r[c.key], r)).join('\t'));
  }
}

function repoBasename(repoDir) {
  const normalized = repoDir.replace(/\/$/, '');
  const base = path.basename(normalized);
  if (base === '.git') return path.basename(path.dirname(normalized));
  return base.replace(/\.git$/, '');
}

new Command()
  .description('Per-author commit report for one or more git repos')
  .argument('<repos...>', 'Paths to git repos or bare repos')
  .option(
    '-s, --sort <keys>',
    'Comma-delimited sort keys; descending. Choose from: commits, merges, added, deleted, net, schoolDays, nonSchoolDays, days',
    'commits',
  )
  .option('-t, --tsv', 'Emit tab-separated values instead of an aligned table')
  .action((repos, opts) => {
    const validSort = [
      'commits',
      'merges',
      'added',
      'deleted',
      'net',
      'schoolDays',
      'nonSchoolDays',
      'days',
    ];
    const sortKeys = String(opts.sort)
      .split(',')
      .map((k) => k.trim())
      .filter((k) => validSort.includes(k));
    if (sortKeys.length === 0) sortKeys.push('commits');
    const allRows = [];
    for (const repo of repos) {
      const nonMerges = parseCommits(gitLog(repo, '--no-merges'));
      const merges = parseCommits(gitLog(repo, '--merges'));
      const emails = new Set([...nonMerges, ...merges].map((c) => c.email));
      const users = loadOrCreateUsers(repo, emails);
      const rows = aggregate(nonMerges, merges, users);
      const totalSchool = totalSchoolDays([...nonMerges, ...merges]);
      const name = repoBasename(repo);
      for (const r of rows) allRows.push({ ...r, repo: name, totalSchool });
    }
    if (opts.tsv) {
      printTsv(allRows, sortKeys, repos.length > 1);
    } else {
      printTable(allRows, sortKeys, repos.length > 1);
    }
  })
  .parse();
