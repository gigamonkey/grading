import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { argv } from 'node:process';
import fs from 'node:fs';

const { fromEntries, entries, keys, values, groupBy } = Object;

const mapKeys = (o, fn) => fromEntries(entries(o).map(([k, v]) => [fn(k, v), v]));

const mapValues = (o, fn) => fromEntries(entries(o).map(([k, v]) => [k, fn(v, k)]));

const sum = (nums) => nums.reduce((tot, n) => tot + n, 0);

const minimum = (nums) => nums.reduce((min, n) => Math.min(n, min), Infinity);

const maximum = (nums) => nums.reduce((max, n) => Math.max(n, max), -Infinity);

const count = (xs, fn) => xs.reduce((c, x) => c + (fn(x) ? 1 : 0), 0);

const average = (nums) => sum(nums) / nums.length;

const numberOr = (n, value) => (Number.isNaN(n) ? value : n);

const loadJSON = (filename) => JSON.parse(readFileSync(filename));

const dumpJSON = (data) => console.log(JSON.stringify(data, null, 2));

const loadSnakeCaseJSON = (filename) => camelify(loadJSON(filename));

const camelify = (data) => mapKeys(data, snakeToCamel);

const snakeToCamel = (s) => s.replace(/_(.)/g, (_, c) => c.toUpperCase());

const readLines = (filename) => readFileSync(filename, { encoding: 'utf-8' }).split(/\n/);

const dumpTSV = (objs) => {
  objs.forEach((obj) => {
    console.log(values(obj).join('\t'));
  });
};

const loadTSV = (file) => {
  const text = fs.readFileSync(file, 'utf-8');
  return text.split('\n').filter(line => line).map(line => line.split('\t'));
}

const fps = (n) => {
  return n >= 0.85 ? 4 : n >= 0.7 ? 3 : n >= 0.45 ? 2 : n >= 0.2 ? 1 : 0;
};

const numbers = (a, b) => {
  console.log(`in numbers with ${a} and ${b}`);
  return ns.map(Number);
};

const median = (ns) => {
  const sorted = ns.toSorted();
  if (ns.length == 0) {
    return undefined;
  } else if (ns.length % 2 === 0) {
    const i = ns.length / 2;
    return (ns[i - 1] + ns[i]) / 2;
  } else {
    return ns[Math.floor(ns.length / 2)];
  }
};

const percentileRank = (ns, n) => {
  const cf = count(ns, x => x <= n);
  const f = count(ns, x => x === n);
  return 100 * (cf - (0.5 * f)) / ns.length;
};

const stats = (data) => {
  const total = sum(data);
  return {
    data,
    sum: total,
    mean: total / data.length,
    median: median(data),
    min: data.reduce((acc, n) => Math.min(n, acc), Infinity),
    max: data.reduce((acc, n) => Math.max(n, acc), -Infinity),
    rank: function (n) { return percentileRank(this.data, n) },
  }
};

const exec = (command, cwd) => {
  return execSync(command, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
};

export {
  argv,
  average,
  camelify,
  count,
  dumpJSON,
  dumpTSV,
  entries,
  exec,
  fps,
  fromEntries,
  groupBy,
  keys,
  loadJSON,
  loadSnakeCaseJSON,
  loadTSV,
  mapKeys,
  mapValues,
  maximum,
  minimum,
  numberOr,
  numbers,
  readFileSync,
  readLines,
  snakeToCamel,
  stats,
  sum,
  values,
};
