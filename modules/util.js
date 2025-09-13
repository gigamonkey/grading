import { readFileSync } from 'node:fs';

const mapValues = (o, fn) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fn(v, k)]));

const loadJSON = (filename) => JSON.parse(readFileSync(filename));

const dumpJSON = (data) => console.log(JSON.stringify(data, null, 2));

const dumpTSV = (objs) => {
  objs.forEach(obj => {
    console.log(Object.values(obj).join('\t'));
  });
};

const sum = (nums) => nums.reduce((tot, n) => tot + n, 0);

const count = (xs, fn) => xs.reduce((c, x) => c + (fn(x) ? 1 : 0), 0);

const average = (nums) => sum(nums) / nums.length;

export { mapValues, loadJSON, dumpJSON, dumpTSV, sum, count, average };
