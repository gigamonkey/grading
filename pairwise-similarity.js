#!/usr/bin/env node

import { argv } from 'process';
import { readFileSync } from 'fs';
import { lcs, similarity } from './modules/lcs.js';

const enc = {encoding: 'utf-8'};

const reportSimilarity = (file1, file2) => {
  const text1 = readFileSync(file1, enc);
  const text2 = readFileSync(file2, enc);

  const { aToB, bToA, total } = similarity(text1, text2);
  console.log([file1, file2, aToB, total].join('\t'));
  console.log([file2, file1, bToA, total].join('\t'));
};

console.log(['a', 'b', 'one-way', 'two-way'].join('\t'));

for (let i = 2; i < argv.length; i++) {
  for (let j = i + 1; j < argv.length; j++) {
    reportSimilarity(argv[i], argv[j]);
  }
}
