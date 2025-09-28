import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { argv } from 'node:process';
import fs from 'node:fs';

const { fromEntries, entries, keys, values, groupBy } = Object;

const mapValues = (o, fn) => fromEntries(entries(o).map(([k, v]) => [k, fn(v, k)]));

const sum = (nums) => nums.reduce((tot, n) => tot + n, 0);

const minimum = (nums) => nums.reduce((min, n) => Math.min(n, min), Infinity);

const maximum = (nums) => nums.reduce((max, n) => Math.max(n, max), -Infinity);

const count = (xs, fn) => xs.reduce((c, x) => c + (fn(x) ? 1 : 0), 0);

const average = (nums) => sum(nums) / nums.length;

const numberOr = (n, value) => (Number.isNaN(n) ? value : n);

const loadJSON = (filename) => JSON.parse(readFileSync(filename));

const dumpJSON = (data) => console.log(JSON.stringify(data, null, 2));

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

const exec = (command, cwd) => {
  return execSync(command, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
};

export {
  argv,
  average,
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
  loadTSV,
  mapValues,
  maximum,
  minimum,
  numberOr,
  numbers,
  readFileSync,
  readLines,
  sum,
  values,
};
