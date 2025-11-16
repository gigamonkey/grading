#!/usr/bin/env node

import { dumpJSON, loadTSV, mapValues, sum, stats } from './modules/util.js';
import { argv } from 'node:process';
import { Temporal } from '@js-temporal/polyfill';

const { groupBy, keys, values } = Object;

const data = loadTSV(argv[2]);

const who = argv[3];
const name = argv[4];

const numStudents = new Set(data.map(x => x[2])).size;

const byStudentByDate = mapValues(groupBy(data, x => x[2]), v => mapValues(groupBy(v, x => x[1]), v => Number(v[0][0])));

const byDate = mapValues(groupBy(data, x => x[1]), v => stats(v.map(x => Number(x[0]))));

const byStudents = mapValues(groupBy(data, x => x[2]), v => sum(v.map(x => Number(x[0]))));

const dates = keys(byDate).toSorted();

const percent = (n) => `${Math.round(n * 100)}%`;

const widths = [11, ];

const row = (xs) => xs.map((x, i) => {
  const w = widths[i] || 10;
  return i === 0
    ? `${x}`.padEnd(w, ' ')
    : `${x}`.padStart(w, ' ');
}).join('');

console.log(row(['Date', 'Median', name, '% rank']));

dates.forEach(d => {
  const day = Temporal.PlainDate.from(d).dayOfWeek;
  const stats = byDate[d];
  if (day < 6 && stats.median > 2) {
    const individual = byStudentByDate[who][d] ?? 0;
    console.log(row([d, Math.round(stats.median), individual, Math.round(stats.rank(individual)) + '%']));
  }
});


const totalStats = stats(values(byStudents));
const individualTotal = byStudents[who];

console.log(row(['ALL DAYS', Math.round(totalStats.median), individualTotal, Math.round(totalStats.rank(individualTotal)) + '%']));
